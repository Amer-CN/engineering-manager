/**
 * 成本台账分类管理 IPC 处理器
 * 通道：categories:list / create / update / delete / reset
 * 数据集合：db.costLedgerCategories
 * 双写：SQLite（cost_ledger_categories 表）
 */

import { ipcMain } from 'electron'
import { db, dbReady, saveDatabase } from '../database'
import { ensureCategories, seedBuiltinCategories } from './cost-ledger-categories-data'
import { useSqliteRead, shouldFallbackToJson, categoryQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:list — 列出所有分类（可按方向过滤）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerCategories:list', (_, direction?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // SQLite 优先
    if (useSqliteRead()) {
      const data = categoryQueries.listCategories(direction)
      if (data !== null) return { success: true, data }
    }
    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
    // JSON 回退
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

ipcMain.handle('db:costLedgerCategories:create', (_, data: {
  label: string
  direction: string
  color?: string
  level1?: string
}) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    ensureCategories()
    const { label, direction, level1 } = data
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

    const newCat: any = {
      id: Date.now(),
      code: `custom_${Date.now()}`,
      label: label.trim(),
      direction,
      color: data.color || '#6b7280',
      isBuiltin: false,
      isEnabled: true,
      sortOrder: maxOrder + 1,
    }
    if (level1) newCat.level1 = level1
    db.costLedgerCategories.push(newCat)
    saveDatabase()
    // SQLite 双写
    categoryQueries.createCategory(newCat)
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
    // SQLite 双写
    categoryQueries.updateCategory(id, db.costLedgerCategories[idx])
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
        return {
          success: false,
          error: `该分类被 ${refCount} 条台账记录引用，不能删除`,
          warning: `refs:${refCount}`,
        }
      }
    }

    db.costLedgerCategories.splice(idx, 1)
    saveDatabase()
    // SQLite 双写
    categoryQueries.deleteCategory(id)
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
    // SQLite 双写
    categoryQueries.resetCategories(db.costLedgerCategories)
    return { success: true, data: db.costLedgerCategories }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
