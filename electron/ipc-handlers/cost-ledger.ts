/**
 * 成本台账核心 IPC 处理器
 *
 * 7 个通道：list / create / batchCreate / update / delete / summary / deleteByProject
 * 数据集合：db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *   前端无需任何改动
 *
 * 其他分类/版本/匹配规则通道 → 独立文件：
 *   cost-ledger-categories.ts   — 分类管理（5个通道）
 *   cost-ledger-batches.ts     — 版本管理（5个通道）
 *   cost-ledger-match-rules.ts — 匹配规则（2个通道）
 *   cost-ledger-helpers.ts     — 共享工具函数
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { ensureBatchesInit, getLatestBatch } from './cost-ledger-helpers'
import { useSqliteRead, shouldFallbackToJson, costLedgerQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:list — 按项目列出台账记录（含发票状态解析）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:list', (_, projectId: number, batchId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // ── SQLite 读路径 ──
    if (useSqliteRead()) {
      // 需要计算 targetBatch（不传 batchId 时默认取最新版本）
      let targetBatch = batchId
      if (targetBatch === undefined) {
        const latestBatch = costLedgerQueries.getLatestBatch(projectId)
        targetBatch = latestBatch ?? 0
      }
      const entries = costLedgerQueries.listEntries(projectId, targetBatch)
      if (entries !== null) {
        return { success: true, data: entries }
      }
      // SQLite 读取失败，fallthrough 到 JSON
      log.warn('[DualWrite] costLedger.list SQLite read failed, falling back to JSON')
    }

    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

    // ── JSON 读路径（原有逻辑） ──
    if (!db.costLedger) db.costLedger = []
    ensureBatchesInit()
    const targetBatch = batchId ?? getLatestBatch(projectId)
    const entries = db.costLedger
      .filter((e: any) => e.projectId === projectId && (e.batchId || 0) === targetBatch)
      .sort((a: any, b: any) => {
        const ta = new Date(a.date).getTime()
        const tb = new Date(b.date).getTime()
        return (isNaN(tb) ? new Date(b.date.replace(/[,，]/g, '.')).getTime() : tb)
             - (isNaN(ta) ? new Date(a.date.replace(/[,，]/g, '.')).getTime() : ta)
      })
      .map((e: any) => {
        let linkedInvoiceStatus: 'active' | 'deleted' | null = null
        if (e.linkedInvoiceId != null && db.invoices) {
          const invoice = db.invoices.find((inv: any) => inv.id === e.linkedInvoiceId)
          linkedInvoiceStatus = invoice ? 'active' : 'deleted'
        }
        return { ...e, linkedInvoiceStatus }
      })
    return { success: true, data: entries }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:create — 新增台账记录（含发票存在性校验）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:create', (_, entry: any) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []

    // 凭证号：保留原始值，不自动填充（无凭证号 = 该笔无凭证）
    const voucherNo = (entry.voucherNo && String(entry.voucherNo).trim())
      ? String(entry.voucherNo).trim()
      : ''

    // 发票存在性校验（仅警告，不阻塞）
    let linkedInvoiceWarning: string | null = null
    if (entry.linkedInvoiceId != null && db.invoices) {
      const invoice = db.invoices.find((inv: any) => inv.id === entry.linkedInvoiceId)
      if (!invoice) linkedInvoiceWarning = `发票 #${entry.linkedInvoiceId} 不存在或已删除`
    }

    const now = new Date().toISOString()
    const newEntry = {
      ...entry,
      id: Date.now(),
      projectId: entry.projectId,
      batchId: entry.batchId || 0,
      voucherNo,
      attachments: entry.attachments || [],
      createdAt: now,
      updatedAt: now,
    }

    // ── JSON 写（原有逻辑） ──
    db.costLedger.push(newEntry)
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.createEntry(newEntry)

    return { success: true, data: newEntry, warning: linkedInvoiceWarning }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:batchCreate — 批量创建台账记录（导入用）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:batchCreate', (_, projectId: number, entries: any[], batchId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []

    const now = new Date().toISOString()
    let counter = 0
    const newEntries = entries.map((entry) => {
      const voucherNo = (entry.voucherNo && String(entry.voucherNo).trim())
        ? String(entry.voucherNo).trim()
        : ''
      counter++
      return {
        ...entry,
        id: Date.now() + counter,
        projectId,
        batchId,
        voucherNo,
        attachments: entry.attachments || [],
        createdAt: now,
        updatedAt: now,
      }
    })

    // ── JSON 写（原有逻辑） ──
    db.costLedger.push(...newEntries)
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.batchCreateEntries(newEntries)

    return { success: true, count: newEntries.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:update — 更新台账记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:update', (_, id: number, changes: any) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []
    const idx = db.costLedger.findIndex((e: any) => e.id === id)
    if (idx === -1) return { success: false, error: '记录不存在' }

    // 发票存在性校验
    let linkedInvoiceWarning: string | null = null
    if (changes.linkedInvoiceId != null && db.invoices) {
      const invoice = db.invoices.find((inv: any) => inv.id === changes.linkedInvoiceId)
      if (!invoice) linkedInvoiceWarning = `发票 #${changes.linkedInvoiceId} 不存在或已删除`
    }

    const updated = {
      ...db.costLedger[idx],
      ...changes,
      id: db.costLedger[idx].id, // 不可变更 id
      updatedAt: new Date().toISOString(),
    }

    // ── JSON 写（原有逻辑） ──
    db.costLedger[idx] = updated
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.updateEntry(id, updated)

    return { success: true, data: updated, warning: linkedInvoiceWarning }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:delete — 删除台账记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []

    // ── JSON 写（原有逻辑） ──
    db.costLedger = db.costLedger.filter((e: any) => e.id !== id)
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.deleteEntry(id)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:summary — 按项目汇总（总支出/总收入/分类小计）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:summary', (_, projectId: number, batchId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // ── SQLite 读路径 ──
    if (useSqliteRead()) {
      let targetBatch = batchId
      if (targetBatch === undefined) {
        const latestBatch = costLedgerQueries.getLatestBatch(projectId)
        targetBatch = latestBatch ?? 0
      }
      const result = costLedgerQueries.summary(projectId, targetBatch)
      if (result !== null) {
        return { success: true, data: result }
      }
      log.warn('[DualWrite] costLedger.summary SQLite read failed, falling back to JSON')
    }

    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

    // ── JSON 读路径（原有逻辑） ──
    if (!db.costLedger) db.costLedger = []
    const targetBatch = batchId ?? getLatestBatch(projectId)
    const entries = db.costLedger.filter(
      (e: any) => e.projectId === projectId && e.amount > 0 && (e.batchId || 0) === targetBatch
    )
    let totalExpense = 0
    let totalIncome = 0
    const byCategory: Record<string, number> = {}

    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
      if (e.direction === 'expense') totalExpense += e.amount
      else if (e.direction === 'income') totalIncome += e.amount
    }

    return { success: true, data: { totalExpense, totalIncome, byCategory } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:deleteByProject — 按项目级联删除（供 projects:delete 调用）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:deleteByProject', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) { db.costLedger = []; return { success: true } }

    // ── JSON 写（原有逻辑） ──
    db.costLedger = db.costLedger.filter((e: any) => e.projectId !== projectId)
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.deleteByProject(projectId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
