/**
 * 考勤 SQLite 查询模块
 *
 * 实现 attendances 表的 CRUD 操作。
 * 特点：
 * - getAll: 复杂富化（memberName/memberType/teamName/teamId + JOIN）
 * - update: 需要从 dailyStatus 重新计算 workDays/daysOff/isFullAttendance
 * - batchCreate/generateDefaults/generateDefaultsV2: 带去重逻辑的批量创建
 * - batchImport: upsert 逻辑（存在则更新，否则插入）
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const ATT_COLUMNS: Record<string, string> = {
  id: 'id',
  memberId: 'member_id',
  projectWorkerId: 'project_worker_id',
  projectId: 'project_id',
  memberName: 'member_name',
  yearMonth: 'year_month',
  workDays: 'work_days',
  daysOff: 'days_off',
  isFullAttendance: 'is_full_attendance',
  dailyStatus: 'daily_status',
  fileUrl: 'file_url',
  fileName: 'file_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const ATT_INSERT_COLS = Object.values(ATT_COLUMNS).filter(c => c !== 'id')
const ATT_INSERT_SQL = `INSERT INTO attendances (${ATT_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${ATT_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出考勤（可选项目/月份过滤） */
export function listAttendances(projectId?: number, yearMonth?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM attendances'
    const params: any[] = []
    const conditions: string[] = []

    if (projectId) {
      conditions.push('project_id = ?')
      params.push(projectId)
    }
    if (yearMonth) {
      conditions.push('year_month = ?')
      params.push(yearMonth)
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY updated_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] attendances.list error:', err)
    return null
  }
}

/** 按成员查询考勤 */
export function listAttendancesByMember(memberId: number, yearMonth?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = 'SELECT * FROM attendances WHERE member_id = ?'
    const params: any[] = [memberId]
    if (yearMonth) {
      sql += ' AND year_month = ?'
      params.push(yearMonth)
    }
    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] attendances.listByMember error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建考勤记录 */
export function createAttendance(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = ATT_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(ATT_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      return toSqliteValue(record[jsonKey])
    })
    sqlite.prepare(ATT_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] attendances.create error:', err)
    return false
  }
}

/** 更新考勤记录 */
export function updateAttendance(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = ATT_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE attendances SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] attendances.update error:', err)
    return false
  }
}

/** 删除考勤记录 */
export function deleteAttendance(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM attendances WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] attendances.delete error:', err)
    return false
  }
}

/** 批量删除考勤记录 */
export function batchDeleteAttendances(ids: number[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const placeholders = ids.map(() => '?').join(',')
    const result = sqlite.prepare(`DELETE FROM attendances WHERE id IN (${placeholders})`).run(...ids)
    return true
  } catch (err) {
    log.error('[SQLite] attendances.batchDelete error:', err)
    return false
  }
}

/** 检查考勤是否已存在（memberId+projectId+yearMonth 或 projectWorkerId+yearMonth） */
export function existsAttendance(memberId: number | null, projectWorkerId: number | null, projectId: number, yearMonth: string): boolean | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    if (projectWorkerId) {
      const row = sqlite.prepare(
        'SELECT COUNT(*) as count FROM attendances WHERE project_worker_id = ? AND year_month = ?'
      ).get(projectWorkerId, yearMonth) as { count: number }
      return row.count > 0
    }
    if (memberId) {
      const row = sqlite.prepare(
        'SELECT COUNT(*) as count FROM attendances WHERE member_id = ? AND project_id = ? AND year_month = ?'
      ).get(memberId, projectId, yearMonth) as { count: number }
      return row.count > 0
    }
    return false
  } catch (err) {
    log.error('[SQLite] attendances.exists error:', err)
    return null
  }
}

/** 查找考勤记录（projectWorkerId+yearMonth）用于 batchImport 的 upsert */
export function findAttendanceByPWAndMonth(projectWorkerId: number, yearMonth: string): any | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      'SELECT * FROM attendances WHERE project_worker_id = ? AND year_month = ?'
    ).get(projectWorkerId, yearMonth) as Record<string, any> | undefined
    return row ? rowToCamel(row) : null
  } catch (err) {
    log.error('[SQLite] attendances.findByPWAndMonth error:', err)
    return null
  }
}
