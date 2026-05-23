/**
 * 模板 + 图纸 SQLite 查询模块
 *
 * 实现 templates + drawings 两张表的 CRUD 操作。
 * 特点：
 * - templates: 含 variables JSON 数组字段
 * - drawings: 含文件路径，文件操作在 handler 层处理，SQLite 只管元数据
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 模板列映射
// ═══════════════════════════════════════════════════════════════════════════════

const TPL_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  category: 'category',
  description: 'description',
  fileName: 'file_name',
  storedFileName: 'stored_file_name',
  fileType: 'file_type',
  variables: 'variables',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const TPL_INSERT_COLS = Object.values(TPL_COLUMNS).filter(c => c !== 'id')
const TPL_INSERT_SQL = `INSERT INTO templates (${TPL_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${TPL_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 模板操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出模板（可按分类过滤） */
export function listTemplates(category?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM templates'
    const params: any[] = []
    if (category) {
      sql += ' WHERE category = ?'
      params.push(category)
    }
    sql += ' ORDER BY created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] templates.list error:', err)
    return null
  }
}

/** 创建模板 */
export function createTemplate(template: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = TPL_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(TPL_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      return toSqliteValue(template[jsonKey])
    })
    sqlite.prepare(TPL_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] templates.create error:', err)
    return false
  }
}

/** 更新模板 */
export function updateTemplate(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = TPL_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE templates SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] templates.update error:', err)
    return false
  }
}

/** 删除模板 */
export function deleteTemplate(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM templates WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] templates.delete error:', err)
    return false
  }
}

/** 按分类统计 */
export function getTemplateStats(): Record<string, number> | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(
      "SELECT category, COUNT(*) as count FROM templates GROUP BY category"
    ).all() as { category: string; count: number }[]
    const stats: Record<string, number> = { total: 0 }
    for (const row of rows) {
      stats[row.category] = row.count
      stats.total += row.count
    }
    return stats
  } catch (err) {
    log.error('[SQLite] templates.stats error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 图纸列映射
// ═══════════════════════════════════════════════════════════════════════════════

const DWG_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  name: 'name',
  category: 'category',
  filePath: 'file_path',
  remarks: 'remarks',
  position: 'position',
  createdAt: 'created_at',
}

const DWG_INSERT_COLS = Object.values(DWG_COLUMNS).filter(c => c !== 'id')
const DWG_INSERT_SQL = `INSERT INTO drawings (${DWG_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${DWG_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 图纸操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出图纸（可按项目过滤） */
export function listDrawings(projectId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM drawings'
    const params: any[] = []
    if (projectId) {
      sql += ' WHERE project_id = ?'
      params.push(projectId)
    }
    sql += ' ORDER BY created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] drawings.list error:', err)
    return null
  }
}

/** 创建图纸（元数据） */
export function createDrawing(drawing: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = DWG_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(DWG_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at') return toSqliteValue(drawing.createdAt || new Date().toISOString())
      return toSqliteValue(drawing[jsonKey])
    })
    sqlite.prepare(DWG_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] drawings.create error:', err)
    return false
  }
}

/** 更新图纸（元数据） */
export function updateDrawing(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = DWG_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE drawings SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] drawings.update error:', err)
    return false
  }
}

/** 删除图纸（元数据） */
export function deleteDrawing(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM drawings WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] drawings.delete error:', err)
    return false
  }
}
