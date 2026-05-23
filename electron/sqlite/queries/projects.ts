/**
 * 项目 SQLite 查询模块
 *
 * 实现 projects 表的 CRUD 操作。
 * 特点：删除时级联删除 9 张关联表的数据。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const PROJ_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  description: 'description',
  address: 'address',
  startDate: 'start_date',
  endDate: 'end_date',
  status: 'status',
  budget: 'budget',
  projectManagerId: 'project_manager_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const PROJ_INSERT_COLS = Object.values(PROJ_COLUMNS).filter(c => c !== 'id')
const PROJ_INSERT_PLACEHOLDERS = PROJ_INSERT_COLS.map(() => '?').join(', ')
const PROJ_INSERT_SQL = `INSERT INTO projects (${PROJ_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${PROJ_INSERT_PLACEHOLDERS})`

/** 级联删除涉及的表名+项目ID列名 */
const CASCADE_DELETE_TABLES = [
  { table: 'cost_ledger', column: 'project_id' },
  { table: 'settlements', column: 'project_id' },
  { table: 'invoices', column: 'project_id' },
  { table: 'income_contracts', column: 'project_id' },
  { table: 'expense_contracts', column: 'project_id' },
  { table: 'agreement_contracts', column: 'project_id' },
  { table: 'wages', column: 'project_id' },
  { table: 'attendances', column: 'project_id' },
  { table: 'project_members', column: 'project_id' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有项目（含项目经理姓名 JOIN members） */
export function listProjects(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(`
      SELECT p.*, m.name as project_manager_name
      FROM projects p
      LEFT JOIN members m ON p.project_manager_id = m.id
      ORDER BY p.created_at DESC
    `).all() as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      // project_manager_name 来自 JOIN，直接挂上
      camel.projectManagerName = (row as any).project_manager_name || ''
      return camel
    })
  } catch (err) {
    log.error('[SQLite] projects.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建项目 */
export function createProject(project: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = PROJ_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(PROJ_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      return toSqliteValue(project[jsonKey])
    })
    sqlite.prepare(PROJ_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] projects.create error:', err)
    return false
  }
}

/** 更新项目 */
export function updateProject(project: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(project)) {
      if (jsonKey === 'id') continue
      const col = PROJ_COLUMNS[jsonKey]
      if (!col) continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    // 始终更新 updatedAt
    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    if (setClauses.length === 1) return true // 仅 updatedAt

    params.push(project.id)
    const sql = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] projects.update error:', err)
    return false
  }
}

/** 删除项目（含级联删除 9 张关联表，事务） */
export function deleteProject(projectId: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const doDelete = sqlite.transaction(() => {
      // 级联删除关联表数据
      for (const { table, column } of CASCADE_DELETE_TABLES) {
        sqlite.prepare(`DELETE FROM "${table}" WHERE "${column}" = ?`).run(projectId)
      }
      // 删除项目本身
      sqlite.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
    })
    doDelete()
    return true
  } catch (err) {
    log.error('[SQLite] projects.delete error:', err)
    return false
  }
}
