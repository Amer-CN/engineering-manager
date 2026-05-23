/**
 * 成本台账版本（批次）管理 IPC 处理器
 * 通道：batches:list / create / rename / copy / delete
 * 数据集合：db.costLedgerBatches, db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { ensureBatchesInit } from './cost-ledger-helpers'
import { useSqliteRead, shouldFallbackToJson, costLedgerQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:list — 列出版本列表
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerBatches:list', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // ── SQLite 读路径 ──
    if (useSqliteRead()) {
      const batches = costLedgerQueries.listBatches(projectId)
      if (batches !== null) {
        return { success: true, data: batches }
      }
      log.warn('[DualWrite] costLedgerBatches.list SQLite read failed, falling back to JSON')
    }

    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

    // ── JSON 读路径（原有逻辑） ──
    if (!db.costLedgerBatches) db.costLedgerBatches = []
    ensureBatchesInit()
    const batches = db.costLedgerBatches
      .filter((b: any) => b.projectId === projectId)
      .sort((a: any, b: any) => a.id - b.id)
    return { success: true, data: batches }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:create — 新建版本
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerBatches:create', (_, projectId: number, name: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedgerBatches) db.costLedgerBatches = []
    const maxId = db.costLedgerBatches.reduce((max: number, b: any) => Math.max(max, b.id || 0), 0)
    const newBatch = { id: maxId + 1, projectId, name, createdAt: new Date().toISOString() }

    // ── JSON 写（原有逻辑） ──
    db.costLedgerBatches.push(newBatch)
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.createBatch(projectId, name, newBatch.id)

    return { success: true, data: newBatch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:rename — 重命名版本
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerBatches:rename', (_, projectId: number, batchId: number, name: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedgerBatches) db.costLedgerBatches = []
    const batch = db.costLedgerBatches.find((b: any) => b.projectId === projectId && b.id === batchId)
    if (!batch) return { success: false, error: '版本不存在' }

    // ── JSON 写（原有逻辑） ──
    batch.name = name
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.renameBatch(projectId, batchId, name)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:copy — 复制版本（新建版本 + 复制该版本所有数据）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerBatches:copy', (_, projectId: number, sourceBatchId: number, name: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedgerBatches) db.costLedgerBatches = []
    // 新建版本
    const maxId = db.costLedgerBatches.reduce((max: number, b: any) => Math.max(max, b.id || 0), 0)
    const newBatch = { id: maxId + 1, projectId, name, createdAt: new Date().toISOString() }
    db.costLedgerBatches.push(newBatch)

    // 复制源版本的所有记录到新版本
    if (!db.costLedger) db.costLedger = []
    const sourceEntries = db.costLedger.filter(
      (e: any) => e.projectId === projectId && (e.batchId || 0) === sourceBatchId
    )
    const now = new Date().toISOString()
    let counter = 0
    const copiedEntries = sourceEntries.map((entry: any) => {
      counter++
      return {
        ...entry,
        id: Date.now() + counter,
        batchId: newBatch.id,
        createdAt: now,
        updatedAt: now,
      }
    })
    db.costLedger.push(...copiedEntries)

    // ── JSON 写（原有逻辑） ──
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.createBatch(projectId, name, newBatch.id)
    costLedgerQueries.copyBatch(projectId, sourceBatchId, newBatch.id)

    return { success: true, data: newBatch, count: copiedEntries.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:delete — 删除版本及数据
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerBatches:delete', (_, projectId: number, batchId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (batchId === 0) return { success: false, error: '不能删除初始版' }
    if (!db.costLedgerBatches) db.costLedgerBatches = []

    // ── JSON 写（原有逻辑） ──
    db.costLedgerBatches = db.costLedgerBatches.filter(
      (b: any) => !(b.projectId === projectId && b.id === batchId)
    )
    if (db.costLedger) {
      db.costLedger = db.costLedger.filter(
        (e: any) => !(e.projectId === projectId && (e.batchId || 0) === batchId)
      )
    }
    saveDatabase()

    // ── SQLite 双写 ──
    costLedgerQueries.deleteBatch(projectId, batchId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
