/**
 * 薪资历史 + 工人日工资历史 SQLite 查询模块
 *
 * 实现 salary_history + wage_history 两张表的 CRUD 操作。
 * 特点：
 * - salary_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 member.baseSalary
 * - wage_history.save: upsert 模式 + 同步 project_worker.daily_wage
 * - wage_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 project_worker.daily_wage
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史列映射
// ═══════════════════════════════════════════════════════════════════════════════

const SH_COLUMNS: Record<string, string> = {
  id: 'id',
  memberId: 'member_id',
  effectiveDate: 'effective_date',
  baseSalary: 'base_salary',
  subsidy: 'subsidy',
  subsidyNote: 'subsidy_note',
  note: 'note',
  createdAt: 'created_at',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出某成员的薪资历史（按生效日期降序） */
export function listSalaryHistory(memberId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(
      'SELECT * FROM salary_history WHERE member_id = ? ORDER BY effective_date DESC'
    ).all(memberId) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] salaryHistory.list error:', err)
    return null
  }
}

/** 创建薪资历史记录 */
export function createSalaryHistory(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(
      `INSERT INTO salary_history (member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      record.memberId,
      record.effectiveDate,
      toSqliteValue(record.baseSalary || 0),
      toSqliteValue(record.subsidy || 0),
      toSqliteValue(record.subsidyNote || ''),
      toSqliteValue(record.note || ''),
      toSqliteValue(record.createdAt || new Date().toISOString())
    )
    return true
  } catch (err) {
    log.error('[SQLite] salaryHistory.create error:', err)
    return false
  }
}

/** 删除薪资历史记录 */
export function deleteSalaryHistory(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM salary_history WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] salaryHistory.delete error:', err)
    return false
  }
}

/** 获取某成员在某年月的有效薪资（最晚的、不晚于该月最后一天的记录） */
export function getEffectiveSalary(memberId: number, yearMonth: string): any | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const [y, m] = yearMonth.split('-').map(Number)
    const monthEnd = `${yearMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const row = sqlite.prepare(
      `SELECT * FROM salary_history
       WHERE member_id = ? AND effective_date <= ?
       ORDER BY effective_date DESC LIMIT 1`
    ).get(memberId, monthEnd) as Record<string, any> | undefined

    if (row) return rowToCamel(row)
    // 无历史记录时回退到 member.baseSalary（由 handler 补充）
    return null
  } catch (err) {
    log.error('[SQLite] salaryHistory.getEffective error:', err)
    return null
  }
}

/** 检查是否已存在同一成员+日期的记录 */
export function existsSalaryHistory(memberId: number, effectiveDate: string): boolean | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      'SELECT COUNT(*) as count FROM salary_history WHERE member_id = ? AND effective_date = ?'
    ).get(memberId, effectiveDate) as { count: number }
    return row.count > 0
  } catch (err) {
    log.error('[SQLite] salaryHistory.exists error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工人日工资历史列映射
// ═══════════════════════════════════════════════════════════════════════════════

const WH_COLUMNS: Record<string, string> = {
  id: 'id',
  projectWorkerId: 'project_worker_id',
  yearMonth: 'year_month',
  dailyWage: 'daily_wage',
  note: 'note',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工人日工资历史操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出某工人日工资历史（按年月降序） */
export function listWageHistory(projectWorkerId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(
      'SELECT * FROM wage_history WHERE project_worker_id = ? ORDER BY year_month DESC'
    ).all(projectWorkerId) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] wageHistory.list error:', err)
    return null
  }
}

/** 保存工资历史记录（upsert 模式：存在则更新，否则插入） */
export function saveWageHistory(record: { projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string }): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const existing = sqlite.prepare(
      'SELECT id FROM wage_history WHERE project_worker_id = ? AND year_month = ?'
    ).get(record.projectWorkerId, record.yearMonth) as { id: number } | undefined

    if (existing) {
      sqlite.prepare(
        `UPDATE wage_history SET daily_wage = ?, note = ?, updated_at = ? WHERE id = ?`
      ).run(record.dailyWage, record.note || null, now, existing.id)
    } else {
      sqlite.prepare(
        `INSERT INTO wage_history (project_worker_id, year_month, daily_wage, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(record.projectWorkerId, record.yearMonth, record.dailyWage, record.note || null, now, now)
    }

    // 同步更新 project_worker 的 daily_wage
    sqlite.prepare(
      'UPDATE project_workers SET daily_wage = ?, updated_at = ? WHERE id = ?'
    ).run(record.dailyWage, now, record.projectWorkerId)

    return true
  } catch (err) {
    log.error('[SQLite] wageHistory.save error:', err)
    return false
  }
}

/** 获取指定月份的有效日工资标准 */
export function getEffectiveWage(projectWorkerId: number, yearMonth: string): any | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(
      `SELECT * FROM wage_history
       WHERE project_worker_id = ? AND year_month <= ?
       ORDER BY year_month DESC LIMIT 1`
    ).get(projectWorkerId, yearMonth) as Record<string, any> | undefined

    if (row) return rowToCamel(row)
    // 无历史时回退到 project_worker 上的 daily_wage（由 handler 补充）
    return null
  } catch (err) {
    log.error('[SQLite] wageHistory.getEffective error:', err)
    return null
  }
}

/** 删除工资历史记录 */
export function deleteWageHistory(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM wage_history WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] wageHistory.delete error:', err)
    return false
  }
}
