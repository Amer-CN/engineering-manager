/**
 * 全局工人 + 项目用工关系 SQLite 查询模块
 *
 * 实现 workers + project_workers 两张表的 CRUD 操作。
 * 特点：
 * - workers.getAll: 复杂过滤（search/workerType）+ 富化（projectCount/activeProjectCount）
 * - workers.delete: 级联删除 project_workers，检查 active 状态
 * - workers.getStats/getTeamWages: 聚合查询
 * - projectWorkers.getAll: JOIN enrichment + attendance firstDay 推断
 * - projectWorkers.create/batchCreate: 自动创建 wageHistory 记录
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 工人列映射
// ═══════════════════════════════════════════════════════════════════════════════

const W_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  idCard: 'id_card',
  gender: 'gender',
  birthDate: 'birth_date',
  ethnicity: 'ethnicity',
  phone: 'phone',
  address: 'address',
  bankAccount: 'bank_account',
  bankName: 'bank_name',
  bankLineNo: 'bank_line_no',
  workerType: 'worker_type',
  dailyWage: 'daily_wage',
  createdAt: 'created_at',
}

const W_INSERT_COLS = Object.values(W_COLUMNS).filter(c => c !== 'id')
const W_INSERT_SQL = `INSERT INTO workers (${W_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${W_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 工人读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出工人（可选搜索/工种过滤，富化 projectCount/activeProjectCount） */
export function listWorkers(search?: string, workerType?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = `SELECT w.*,
      COUNT(pw.id) AS project_count,
      SUM(CASE WHEN pw.status = 'active' THEN 1 ELSE 0 END) AS active_project_count
    FROM workers w
    LEFT JOIN project_workers pw ON pw.worker_id = w.id`
    const params: any[] = []
    const conditions: string[] = []

    if (workerType) {
      // 通过 project_workers 过滤 workerType
      sql += ` INNER JOIN project_workers pw2 ON pw2.worker_id = w.id AND pw2.worker_type = ?`
      params.push(workerType)
    }

    if (search) {
      conditions.push('(w.name LIKE ? OR w.id_card LIKE ? OR w.phone LIKE ?)')
      const kw = `%${search}%`
      params.push(kw, `%${search}%`, kw)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' GROUP BY w.id ORDER BY w.created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.projectCount = row.project_count || 0
      camel.activeProjectCount = row.active_project_count || 0
      return camel
    })
  } catch (err) {
    log.error('[SQLite] workers.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工人写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建工人 */
export function createWorker(worker: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = W_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(W_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at') return toSqliteValue(worker.createdAt || new Date().toISOString())
      return toSqliteValue(worker[jsonKey])
    })
    sqlite.prepare(W_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] workers.create error:', err)
    return false
  }
}

/** 更新工人 */
export function updateWorker(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = W_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE workers SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] workers.update error:', err)
    return false
  }
}

/** 删除工人（级联删除 project_workers，需先检查无活跃用工） */
export function deleteWorker(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const doDelete = sqlite.transaction(() => {
      sqlite.prepare('DELETE FROM project_workers WHERE worker_id = ?').run(id)
      sqlite.prepare('DELETE FROM workers WHERE id = ?').run(id)
    })
    doDelete()
    return true
  } catch (err) {
    log.error('[SQLite] workers.delete error:', err)
    return false
  }
}

/** 检查工人是否有活跃 projectWorker */
export function countActiveProjectWorkers(workerId: number): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      "SELECT COUNT(*) as count FROM project_workers WHERE worker_id = ? AND status = 'active'"
    ).get(workerId) as { count: number }
    return row.count
  } catch (err) {
    log.error('[SQLite] workers.countActivePW error:', err)
    return null
  }
}

/** 检查身份证是否重复 */
export function existsByIdCard(idCard: string, excludeId?: number): boolean | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    if (excludeId) {
      const row = sqlite.prepare(
        'SELECT COUNT(*) as count FROM workers WHERE id_card = ? AND id != ?'
      ).get(idCard.trim(), excludeId) as { count: number }
      return row.count > 0
    }
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM workers WHERE id_card = ?'
    ).get(idCard.trim()) as { count: number }
    return row.count > 0
  } catch (err) {
    log.error('[SQLite] workers.existsByIdCard error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系列映射
// ═══════════════════════════════════════════════════════════════════════════════

const PW_COLUMNS: Record<string, string> = {
  id: 'id',
  workerId: 'worker_id',
  projectId: 'project_id',
  teamId: 'team_id',
  dailyWage: 'daily_wage',
  workerType: 'worker_type',
  entryDate: 'entry_date',
  status: 'status',
  remarks: 'remarks',
  createdAt: 'created_at',
}

const PW_INSERT_COLS = Object.values(PW_COLUMNS).filter(c => c !== 'id')
const PW_INSERT_SQL = `INSERT INTO project_workers (${PW_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${PW_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出某项目的用工关系（富化 worker/team/project 名称） */
export function listProjectWorkers(projectId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(`
      SELECT pw.*,
        w.name AS worker_name,
        w.id_card AS worker_id_card,
        w.gender AS worker_gender,
        w.birth_date AS worker_birth_date,
        w.phone AS worker_phone,
        w.ethnicity AS worker_ethnicity,
        w.address AS worker_address,
        w.bank_account AS worker_bank_account,
        w.bank_name AS worker_bank_name,
        w.bank_line_no AS worker_bank_line_no,
        w.worker_type AS worker_worker_type,
        w.daily_wage AS worker_daily_wage,
        wt.name AS team_name,
        p.name AS project_name
      FROM project_workers pw
      LEFT JOIN workers w ON w.id = pw.worker_id
      LEFT JOIN worker_teams wt ON wt.id = pw.team_id
      LEFT JOIN projects p ON p.id = pw.project_id
      WHERE pw.project_id = ?
      ORDER BY pw.created_at DESC
    `).all(projectId) as Record<string, any>[]

    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.workerName = row.worker_name || ''
      camel.workerIdCard = row.worker_id_card || ''
      camel.teamName = row.team_name || ''
      camel.projectName = row.project_name || ''
      // 补充完整的 worker 对象（与 JSON 路径保持一致）
      camel.worker = {
        id: row.worker_id,
        name: row.worker_name || '',
        idCard: row.worker_id_card || '',
        gender: row.worker_gender || '',
        birthDate: row.worker_birth_date || '',
        phone: row.worker_phone || '',
        ethnicity: row.worker_ethnicity || '',
        address: row.worker_address || '',
        bankAccount: row.worker_bank_account || '',
        bankName: row.worker_bank_name || '',
        bankLineNo: row.worker_bank_line_no || '',
        workerType: row.worker_worker_type || '',
        dailyWage: row.worker_daily_wage || 0,
      }
      // 注：attendance firstDay 推断在 handler 层处理（需要访问 attendances 表的 dailyStatus）
      return camel
    })
  } catch (err) {
    log.error('[SQLite] projectWorkers.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建项目用工关系 */
export function createProjectWorker(pw: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = PW_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(PW_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at') return toSqliteValue(pw.createdAt || new Date().toISOString())
      return toSqliteValue(pw[jsonKey])
    })
    sqlite.prepare(PW_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] projectWorkers.create error:', err)
    return false
  }
}

/** 更新项目用工关系 */
export function updateProjectWorker(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = PW_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE project_workers SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] projectWorkers.update error:', err)
    return false
  }
}

/** 删除项目用工关系 */
export function deleteProjectWorker(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM project_workers WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] projectWorkers.delete error:', err)
    return false
  }
}

/** 检查工人是否已在项目中 */
export function existsProjectWorker(workerId: number, projectId: number): boolean | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM project_workers WHERE worker_id = ? AND project_id = ?'
    ).get(workerId, projectId) as { count: number }
    return row.count > 0
  } catch (err) {
    log.error('[SQLite] projectWorkers.exists error:', err)
    return null
  }
}

/** 批量创建项目用工关系（事务） */
export function batchCreateProjectWorkers(entries: any[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const doInsert = sqlite.transaction(() => {
      const stmt = sqlite.prepare(PW_INSERT_SQL)
      for (const entry of entries) {
        const params = PW_INSERT_COLS.map(col => {
          const jsonKey = Object.entries(PW_COLUMNS).find(([, c]) => c === col)?.[0]
          if (!jsonKey) return null
          if (col === 'created_at') return toSqliteValue(now)
          return toSqliteValue(entry[jsonKey])
        })
        stmt.run(...params)
      }
    })
    doInsert()
    return true
  } catch (err) {
    log.error('[SQLite] projectWorkers.batchCreate error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统计操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 工人统计：项目数 + 总收入 + 按项目拆分 */
export function getWorkerStats(workerId: number): {
  projectCount: number
  totalEarnings: number
  projectBreakdown: { projectId: number; projectName: string; total: number }[]
} | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    // 该工人的所有 project_worker
    const pwRows = sqlite.prepare(
      'SELECT id, project_id FROM project_workers WHERE worker_id = ?'
    ).all(workerId) as { id: number; project_id: number }[]

    if (pwRows.length === 0) {
      return { projectCount: 0, totalEarnings: 0, projectBreakdown: [] }
    }

    const pwIds = pwRows.map(r => r.id)
    const placeholders = pwIds.map(() => '?').join(',')

    // 总收入
    const totalRow = sqlite.prepare(
      `SELECT COALESCE(SUM(actual_wage), 0) AS total FROM wages WHERE project_worker_id IN (${placeholders})`
    ).get(...pwIds) as { total: number }

    // 按项目分组
    const breakdownRows = sqlite.prepare(`
      SELECT pw.project_id, p.name AS project_name, COALESCE(SUM(w.actual_wage), 0) AS total
      FROM project_workers pw
      LEFT JOIN wages w ON w.project_worker_id = pw.id
      LEFT JOIN projects p ON p.id = pw.project_id
      WHERE pw.worker_id = ?
      GROUP BY pw.project_id
      ORDER BY total DESC
    `).all(workerId) as { project_id: number; project_name: string; total: number }[]

    return {
      projectCount: pwRows.length,
      totalEarnings: Math.round((totalRow.total || 0) * 100) / 100,
      projectBreakdown: breakdownRows.map(r => ({
        projectId: r.project_id,
        projectName: r.project_name || '未知项目',
        total: Math.round((r.total || 0) * 100) / 100,
      })),
    }
  } catch (err) {
    log.error('[SQLite] workers.getStats error:', err)
    return null
  }
}

/** 按班组汇总工资 */
export function getTeamWages(projectId: number, teamId: number): {
  teamId: number
  teamName: string
  workerCount: number
  teamTotal: number
  details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[]
} | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    // 班组名
    const teamRow = sqlite.prepare('SELECT name FROM worker_teams WHERE id = ?').get(teamId) as { name: string } | undefined
    const teamName = teamRow?.name || '未知班组'

    // 该班组在该项目的所有 project_worker
    const pwRows = sqlite.prepare(
      "SELECT pw.id, pw.worker_id, pw.daily_wage, w.name AS worker_name, w.daily_wage AS worker_daily_wage FROM project_workers pw LEFT JOIN workers w ON w.id = pw.worker_id WHERE pw.project_id = ? AND pw.team_id = ?"
    ).all(projectId, teamId) as { id: number; worker_id: number; daily_wage: number; worker_name: string; worker_daily_wage: number }[]

    const details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[] = []
    let teamTotal = 0

    for (const pw of pwRows) {
      // 去重查询：每个 projectWorkerId + yearMonth 只保留最新
      const wageRows = sqlite.prepare(`
        SELECT w.work_days, w.actual_wage, w.daily_wage
        FROM wages w
        INNER JOIN (
          SELECT project_worker_id, year_month, MAX(updated_at) AS max_updated
          FROM wages
          WHERE project_worker_id = ?
          GROUP BY project_worker_id, year_month
        ) latest ON w.project_worker_id = latest.project_worker_id
          AND w.year_month = latest.year_month
          AND w.updated_at = latest.max_updated
        WHERE w.project_worker_id = ?
      `).all(pw.id, pw.id) as { work_days: number; actual_wage: number; daily_wage: number }[]

      const totalWage = wageRows.reduce((sum, r) => sum + (r.actual_wage || 0), 0)
      const totalWorkDays = wageRows.reduce((sum, r) => sum + (r.work_days || 0), 0)
      teamTotal += totalWage

      details.push({
        workerName: pw.worker_name || '未知',
        months: wageRows.length,
        workDays: totalWorkDays,
        dailyWage: pw.daily_wage || pw.worker_daily_wage || 0,
        totalWage: Math.round(totalWage * 100) / 100,
      })
    }

    return {
      teamId,
      teamName,
      workerCount: pwRows.length,
      teamTotal: Math.round(teamTotal * 100) / 100,
      details,
    }
  } catch (err) {
    log.error('[SQLite] workers.getTeamWages error:', err)
    return null
  }
}
