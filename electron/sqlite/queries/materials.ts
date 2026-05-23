/**
 * 材料与费用 SQLite 查询模块
 *
 * 实现 materials + expenses 两张表的 CRUD 操作。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 材料列映射
// ═══════════════════════════════════════════════════════════════════════════════

const MAT_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  name: 'name',
  category: 'category',
  unit: 'unit',
  quantity: 'quantity',
  price: 'price',
  createdAt: 'created_at',
}

const MAT_INSERT_COLS = ['project_id', 'name', 'category', 'unit', 'quantity', 'price', 'created_at']
const MAT_INSERT_SQL = `INSERT INTO materials (${MAT_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${MAT_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 材料读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出材料（可按项目过滤） */
export function listMaterials(projectId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM materials'
    const params: any[] = []
    if (projectId) {
      sql += ' WHERE project_id = ?'
      params.push(projectId)
    }
    sql += ' ORDER BY created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] materials.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 材料写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建材料 */
export function createMaterial(mat: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(MAT_INSERT_SQL).run(
      toSqliteValue(mat.projectId),
      mat.name,
      toSqliteValue(mat.category || ''),
      toSqliteValue(mat.unit || ''),
      toSqliteValue(mat.quantity || 0),
      toSqliteValue(mat.price || 0),
      toSqliteValue(mat.createdAt || new Date().toISOString())
    )
    return true
  } catch (err) {
    log.error('[SQLite] materials.create error:', err)
    return false
  }
}

/** 更新材料 */
export function updateMaterial(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = MAT_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE materials SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] materials.update error:', err)
    return false
  }
}

/** 删除材料 */
export function deleteMaterial(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM materials WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] materials.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 费用列映射
// ═══════════════════════════════════════════════════════════════════════════════

const EXP_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  amount: 'amount',
  category: 'category',
  description: 'description',
  date: 'date',
  createdAt: 'created_at',
}

const EXP_INSERT_COLS = ['project_id', 'amount', 'category', 'description', 'date', 'created_at']
const EXP_INSERT_SQL = `INSERT INTO expenses (${EXP_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${EXP_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 费用读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出费用（可按项目过滤） */
export function listExpenses(projectId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM expenses'
    const params: any[] = []
    if (projectId) {
      sql += ' WHERE project_id = ?'
      params.push(projectId)
    }
    sql += ' ORDER BY date DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] expenses.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 费用写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建费用 */
export function createExpense(exp: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(EXP_INSERT_SQL).run(
      toSqliteValue(exp.projectId),
      toSqliteValue(exp.amount || 0),
      toSqliteValue(exp.category || ''),
      toSqliteValue(exp.description || ''),
      toSqliteValue(exp.date || ''),
      toSqliteValue(exp.createdAt || new Date().toISOString())
    )
    return true
  } catch (err) {
    log.error('[SQLite] expenses.create error:', err)
    return false
  }
}

/** 更新费用 */
export function updateExpense(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = EXP_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE expenses SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] expenses.update error:', err)
    return false
  }
}

/** 删除费用 */
export function deleteExpense(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] expenses.delete error:', err)
    return false
  }
}
