/**
 * 成本台账 IPC 处理器
 *
 * 5 个通道：list / create / update / delete / summary
 * 数据集合：db.costLedger
 */

import { ipcMain } from 'electron'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:list — 按项目列出台账记录（含发票状态解析）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:list', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []
    const entries = db.costLedger
      .filter((e: any) => e.projectId === projectId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
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

    // 凭证号自动递增（按项目）
    let voucherNo = entry.voucherNo
    if (!voucherNo || voucherNo <= 0) {
      const projectEntries = db.costLedger.filter((e: any) => e.projectId === entry.projectId)
      const maxNo = projectEntries.reduce((max: number, e: any) => Math.max(max, e.voucherNo || 0), 0)
      voucherNo = maxNo + 1
    }

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
      voucherNo,
      attachments: entry.attachments || [],
      createdAt: now,
      updatedAt: now,
    }
    db.costLedger.push(newEntry)
    saveDatabase()
    return { success: true, data: newEntry, warning: linkedInvoiceWarning }
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
    db.costLedger[idx] = updated
    saveDatabase()
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
    db.costLedger = db.costLedger.filter((e: any) => e.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:summary — 按项目汇总（总支出/总收入/分类小计）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedger:summary', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.costLedger) db.costLedger = []
    const entries = db.costLedger.filter((e: any) => e.projectId === projectId && e.amount > 0)
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
    db.costLedger = db.costLedger.filter((e: any) => e.projectId !== projectId)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 内置分类种子数据
// ═══════════════════════════════════════════════════════════════════════════════

const BUILTIN_CATEGORIES = [
  { code: 'labor',             label: '人工',         direction: 'expense', color: '#f97316', sortOrder: 1 },
  { code: 'material',          label: '材料',         direction: 'expense', color: '#3b82f6', sortOrder: 2 },
  { code: 'equipment',         label: '机械',         direction: 'expense', color: '#8b5cf6', sortOrder: 3 },
  { code: 'pre_project',       label: '前期费用',     direction: 'expense', color: '#6b7280', sortOrder: 4 },
  { code: 'business_expense',  label: '业务费用',     direction: 'expense', color: '#ec4899', sortOrder: 5 },
  { code: 'advance',           label: '垫资支出',     direction: 'expense', color: '#ef4444', sortOrder: 6 },
  { code: 'salary',            label: '管理人员工资', direction: 'expense', color: '#14b8a6', sortOrder: 7 },
  { code: 'tax',               label: '税金',         direction: 'expense', color: '#a855f7', sortOrder: 8 },
  { code: 'other',             label: '其他',         direction: 'expense', color: '#9ca3af', sortOrder: 9 },
  { code: 'shareholder_investment', label: '股东投资', direction: 'income', color: '#059669', sortOrder: 1 },
  { code: 'financing',              label: '融资款',   direction: 'income', color: '#0891b2', sortOrder: 2 },
  { code: 'advance_recovery',       label: '垫资回收', direction: 'income', color: '#2563eb', sortOrder: 3 },
]

function seedBuiltinCategories() {
  if (!db.costLedgerCategories) db.costLedgerCategories = []
  const now = Date.now()
  return BUILTIN_CATEGORIES.map((c, i) => ({
    ...c,
    id: now + i,
    isBuiltin: true,
    isEnabled: true,
  }))
}

function ensureCategories(): any[] {
  if (!db.costLedgerCategories) db.costLedgerCategories = []
  if (db.costLedgerCategories.length === 0) {
    db.costLedgerCategories = seedBuiltinCategories()
    saveDatabase()
  }
  return db.costLedgerCategories
}

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:list — 列出所有分类（可按方向过滤）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:list', (_, direction?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const categories = ensureCategories()
    let result = categories.filter((c: any) => c.isEnabled !== false)
    if (direction && (direction === 'expense' || direction === 'income')) {
      result = result.filter((c: any) => c.direction === direction)
    }
    result.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:create — 新建自定义分类
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:create', (_, data: { label: string; direction: string; color?: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    ensureCategories()
    const { label, direction } = data
    if (!label || !label.trim()) return { success: false, error: '分类名称不能为空' }
    if (direction !== 'expense' && direction !== 'income') return { success: false, error: '方向无效' }
    if (label.length > 20) return { success: false, error: '分类名称不超过20字' }

    const existing = db.costLedgerCategories.find((c: any) =>
      c.label === label.trim() && c.direction === direction && c.isEnabled !== false
    )
    if (existing) return { success: false, error: `分类"${label}"已存在` }

    const maxOrder = db.costLedgerCategories
      .filter((c: any) => c.direction === direction)
      .reduce((max: number, c: any) => Math.max(max, c.sortOrder || 0), 0)

    const newCat = {
      id: Date.now(),
      code: `custom_${Date.now()}`,
      label: label.trim(),
      direction,
      color: data.color || '#6b7280',
      isBuiltin: false,
      isEnabled: true,
      sortOrder: maxOrder + 1,
    }
    db.costLedgerCategories.push(newCat)
    saveDatabase()
    return { success: true, data: newCat }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:update — 更新分类
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:update', (_, id: number, changes: any) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    ensureCategories()
    const idx = db.costLedgerCategories.findIndex((c: any) => c.id === id)
    if (idx === -1) return { success: false, error: '分类不存在' }

    const cat = db.costLedgerCategories[idx]

    // 检查名称重复
    if (changes.label) {
      const dup = db.costLedgerCategories.find((c: any) =>
        c.id !== id && c.label === changes.label && c.direction === cat.direction && c.isEnabled !== false
      )
      if (dup) return { success: false, error: `分类"${changes.label}"已存在` }
    }

    // 内置分类仅允许改 label/color/isEnabled
    if (cat.isBuiltin) {
      const allowed: any = {}
      if (changes.label !== undefined) allowed.label = changes.label
      if (changes.color !== undefined) allowed.color = changes.color
      if (changes.isEnabled !== undefined) allowed.isEnabled = changes.isEnabled
      db.costLedgerCategories[idx] = { ...cat, ...allowed }
    } else {
      db.costLedgerCategories[idx] = { ...cat, ...changes, id: cat.id }
    }

    saveDatabase()
    return { success: true, data: db.costLedgerCategories[idx] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:delete — 删除分类（内置不可删除）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    ensureCategories()
    const idx = db.costLedgerCategories.findIndex((c: any) => c.id === id)
    if (idx === -1) return { success: false, error: '分类不存在' }

    if (db.costLedgerCategories[idx].isBuiltin) {
      return { success: false, error: '内置分类不可删除' }
    }

    const code = db.costLedgerCategories[idx].code
    // 检查是否被条目引用
    if (db.costLedger) {
      const refCount = db.costLedger.filter((e: any) => e.category === code).length
      if (refCount > 0) {
        return { success: false, error: `该分类被 ${refCount} 条台账记录引用，不能删除`, warning: `refs:${refCount}` }
      }
    }

    db.costLedgerCategories.splice(idx, 1)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:reset — 恢复默认分类
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:reset', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.costLedgerCategories = seedBuiltinCategories()
    saveDatabase()
    return { success: true, data: db.costLedgerCategories }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
