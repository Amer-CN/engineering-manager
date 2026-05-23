/**
 * 部门 SQLite 查询模块
 *
 * 实现 departments 表的 CRUD 操作。
 * 特点：getAll 需要 LEFT JOIN members 计算 memberCount。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const DEPT_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  managerId: 'manager_id',
  positions: 'positions',
  createdAt: 'created_at',
}

const DEPT_INSERT_COLS = ['name', 'manager_id', 'positions', 'created_at']
const DEPT_INSERT_PLACEHOLDERS = DEPT_INSERT_COLS.map(() => '?').join(', ')
const DEPT_INSERT_SQL = `INSERT INTO departments (${DEPT_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${DEPT_INSERT_PLACEHOLDERS})`

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有部门（按创建时间升序，附带 memberCount） */
export function listDepartments(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(`
      SELECT d.*, COUNT(m.id) AS member_count
      FROM departments d
      LEFT JOIN members m ON m.department_id = d.id AND m.member_type = 'staff'
      GROUP BY d.id
      ORDER BY d.created_at ASC
    `).all() as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.memberCount = row.member_count
      return camel
    })
  } catch (err) {
    log.error('[SQLite] departments.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建部门 */
export function createDepartment(dept: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(DEPT_INSERT_SQL).run(
      dept.name,
      toSqliteValue(dept.managerId),
      toSqliteValue(dept.positions || []),
      toSqliteValue(dept.createdAt || new Date().toISOString())
    )
    return true
  } catch (err) {
    log.error('[SQLite] departments.create error:', err)
    return false
  }
}

/** 更新部门 */
export function updateDepartment(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = DEPT_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE departments SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] departments.update error:', err)
    return false
  }
}

/** 删除部门 */
export function deleteDepartment(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM departments WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] departments.delete error:', err)
    return false
  }
}

/** 检查部门下是否有 staff 成员 */
export function countStaffMembers(deptId: number): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      "SELECT COUNT(*) as count FROM members WHERE department_id = ? AND member_type = 'staff'"
    ).get(deptId) as { count: number }
    return row.count
  } catch (err) {
    log.error('[SQLite] departments.countStaff error:', err)
    return null
  }
}

/** 检查部门名是否已存在 */
export function existsByName(name: string, excludeId?: number): boolean | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    if (excludeId) {
      const row = sqlite.prepare(
        'SELECT COUNT(*) as count FROM departments WHERE name = ? AND id != ?'
      ).get(name, excludeId) as { count: number }
      return row.count > 0
    }
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM departments WHERE name = ?'
    ).get(name) as { count: number }
    return row.count > 0
  } catch (err) {
    log.error('[SQLite] departments.existsByName error:', err)
    return null
  }
}
