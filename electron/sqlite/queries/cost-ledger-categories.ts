/**
 * 成本台账分类 SQLite 查询模块
 *
 * 实现 cost_ledger_categories 表的 CRUD 操作。
 * 特点：reset 为全量覆盖；内置/自定义分类区分。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const CAT_COLUMNS: Record<string, string> = {
  id: 'id',
  code: 'code',
  label: 'label',
  direction: 'direction',
  color: 'color',
  isBuiltin: 'is_builtin',
  isEnabled: 'is_enabled',
  sortOrder: 'sort_order',
  level1: 'level1',
}

const CAT_INSERT_COLS = Object.values(CAT_COLUMNS).filter(c => c !== 'id')
const CAT_INSERT_PLACEHOLDERS = CAT_INSERT_COLS.map(() => '?').join(', ')
const CAT_INSERT_SQL = `INSERT INTO cost_ledger_categories (${CAT_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${CAT_INSERT_PLACEHOLDERS})`

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出分类（可按方向过滤，排除已禁用） */
export function listCategories(direction?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM cost_ledger_categories WHERE is_enabled = 1'
    const params: any[] = []
    if (direction && (direction === 'expense' || direction === 'income')) {
      sql += ' AND direction = ?'
      params.push(direction)
    }
    sql += ' ORDER BY sort_order ASC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] categories.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建分类 */
export function createCategory(cat: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = CAT_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(CAT_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      return toSqliteValue(cat[jsonKey])
    })
    sqlite.prepare(CAT_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] categories.create error:', err)
    return false
  }
}

/** 更新分类 */
export function updateCategory(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = CAT_COLUMNS[jsonKey]
      if (!col) continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE cost_ledger_categories SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] categories.update error:', err)
    return false
  }
}

/** 删除分类 */
export function deleteCategory(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM cost_ledger_categories WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] categories.delete error:', err)
    return false
  }
}

/** 检查分类 code 是否被 cost_ledger 引用 */
export function countCategoryRefs(code: string): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM cost_ledger WHERE category = ?'
    ).get(code) as { count: number }
    return row.count
  } catch (err) {
    log.error('[SQLite] categories.countRefs error:', err)
    return null
  }
}

/** 恢复默认分类（事务：DELETE ALL + INSERT 默认值） */
export function resetCategories(defaultCats: any[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const doReset = sqlite.transaction(() => {
      sqlite.prepare('DELETE FROM cost_ledger_categories').run()
      const stmt = sqlite.prepare(CAT_INSERT_SQL)
      for (const cat of defaultCats) {
        const params = CAT_INSERT_COLS.map(col => {
          const jsonKey = Object.entries(CAT_COLUMNS).find(([, c]) => c === col)?.[0]
          if (!jsonKey) return null
          return toSqliteValue(cat[jsonKey])
        })
        stmt.run(...params)
      }
    })
    doReset()
    return true
  } catch (err) {
    log.error('[SQLite] categories.reset error:', err)
    return false
  }
}
