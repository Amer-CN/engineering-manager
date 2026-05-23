/**
 * 工资 SQLite 查询模块
 *
 * 实现 wages 表的 CRUD 操作。
 * 特点：
 * - getAll: 去重（同 projectWorkerId/memberId + yearMonth 只保留最新）
 * - batchSave: 全量替换该项目+月份的工资记录
 * - batchClearPayments: 批量清空发放字段
 * - batchArchivePayments: 批量归档
 * - getStats: 聚合统计
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const W_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  memberId: 'member_id',
  projectWorkerId: 'project_worker_id',
  yearMonth: 'year_month',
  dailyWage: 'daily_wage',
  workDays: 'work_days',
  bonus: 'bonus',
  deduction: 'deduction',
  actualWage: 'actual_wage',
  paidAmount: 'paid_amount',
  paidDate: 'paid_date',
  bankReceiptPath: 'bank_receipt_path',
  paymentLocked: 'payment_locked',
  memberName: 'member_name',
  memberType: 'member_type',
  bankAccount: 'bank_account',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const W_INSERT_COLS = Object.values(W_COLUMNS).filter(c => c !== 'id')
const W_INSERT_SQL = `INSERT INTO wages (${W_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${W_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 查询工资列表（支持可选过滤） */
export function listWages(filters?: { projectId?: number; yearMonth?: string; memberId?: number }): any[] {
  const sqlite = tryGetSqlite()
  if (!sqlite) return []

  try {
    let sql = 'SELECT * FROM wages WHERE 1=1'
    const params: any[] = []

    if (filters?.projectId) {
      sql += ' AND project_id = ?'
      params.push(filters.projectId)
    }
    if (filters?.yearMonth) {
      sql += ' AND year_month = ?'
      params.push(filters.yearMonth)
    }
    if (filters?.memberId) {
      sql += ' AND member_id = ?'
      params.push(filters.memberId)
    }

    sql += ' ORDER BY updated_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as any[]
    return rows.map(r => rowToCamel(r, W_COLUMNS))
  } catch (err) {
    log.error('[SQLite] wages.list error:', err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建工资记录 */
export function createWage(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = W_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(W_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      return toSqliteValue(record[jsonKey])
    })
    sqlite.prepare(W_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] wages.create error:', err)
    return false
  }
}

/** 更新工资记录 */
export function updateWage(id: number, changes: any): boolean {
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

    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE wages SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] wages.update error:', err)
    return false
  }
}

/** 删除工资记录 */
export function deleteWage(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM wages WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] wages.delete error:', err)
    return false
  }
}

/** 批量删除工资记录 */
export function batchDeleteWages(ids: number[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const placeholders = ids.map(() => '?').join(',')
    sqlite.prepare(`DELETE FROM wages WHERE id IN (${placeholders})`).run(...ids)
    return true
  } catch (err) {
    log.error('[SQLite] wages.batchDelete error:', err)
    return false
  }
}

/** 批量保存工资（替换该项目+月份的所有工资记录，事务） */
export function batchSaveWages(records: any[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    if (records.length === 0) return true

    const { projectId, yearMonth } = records[0]
    const now = new Date().toISOString()

    const doSave = sqlite.transaction(() => {
      // 删除旧的
      sqlite.prepare('DELETE FROM wages WHERE project_id = ? AND year_month = ?').run(projectId, yearMonth)
      // 插入新的
      const stmt = sqlite.prepare(W_INSERT_SQL)
      for (const record of records) {
        const params = W_INSERT_COLS.map(col => {
          const jsonKey = Object.entries(W_COLUMNS).find(([, c]) => c === col)?.[0]
          if (!jsonKey) return null
          if (col === 'created_at') return toSqliteValue(record.createdAt || now)
          if (col === 'updated_at') return toSqliteValue(now)
          return toSqliteValue(record[jsonKey])
        })
        stmt.run(...params)
      }
    })
    doSave()
    return true
  } catch (err) {
    log.error('[SQLite] wages.batchSave error:', err)
    return false
  }
}

/** 批量清空发放字段 */
export function batchClearPayments(ids: number[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const placeholders = ids.map(() => '?').join(',')
    sqlite.prepare(
      `UPDATE wages SET paid_amount = 0, paid_date = '', bank_receipt_path = NULL, payment_locked = 0, updated_at = ? WHERE id IN (${placeholders})`
    ).run(now, ...ids)
    return true
  } catch (err) {
    log.error('[SQLite] wages.batchClearPayments error:', err)
    return false
  }
}

/** 批量归档工资发放记录 */
export function batchArchivePayments(ids: number[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const placeholders = ids.map(() => '?').join(',')
    sqlite.prepare(
      `UPDATE wages SET payment_locked = 1, updated_at = ? WHERE id IN (${placeholders})`
    ).run(now, ...ids)
    return true
  } catch (err) {
    log.error('[SQLite] wages.batchArchivePayments error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 支付记录查询（联表查询）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取工资发放记录（统一视图，联表查询）
 * JOIN: wages LEFT JOIN workers ON wages.member_id = workers.id
 *       LEFT JOIN projects ON wages.project_id = projects.id
 */
export function getPaymentRecords(filters?: {
  projectId?: number
  yearMonth?: string
  status?: string
}): any[] {
  const sqlite = tryGetSqlite()
  if (!sqlite) return []

  try {
    let sql = `
      SELECT
        w.*,
        w.member_name AS w_member_name,
        workers.name AS worker_name,
        workers.phone AS worker_phone,
        projects.name AS project_name
      FROM wages w
      LEFT JOIN workers ON w.member_id = workers.id
      LEFT JOIN projects ON w.project_id = projects.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.projectId) {
      sql += ' AND w.project_id = ?'
      params.push(filters.projectId)
    }
    if (filters?.yearMonth) {
      sql += ' AND w.year_month = ?'
      params.push(filters.yearMonth)
    }

    sql += ' ORDER BY w.year_month DESC, w.project_id, w.updated_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as any[]

    // 计算发放状态和逾期天数
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = rows.map(r => {
      const record = rowToCamel(r, W_COLUMNS)
      // 获取工人姓名（优先使用 workers.name）
      record.workerName = r.worker_name || r.w_member_name || ''
      record.workerPhone = r.worker_phone || ''
      record.projectName = r.project_name || ''

      // 计算逾期天数
      const [year, month] = record.yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15) // 每月 15 号
      record.overdueDays = 0
      record.paymentStatus = ''

      if (today > dueDate) {
        record.overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // 计算发放状态
      const paidAmount = record.paidAmount || 0
      const actualWage = record.actualWage || 0

      if (paidAmount === 0) {
        record.paymentStatus = record.overdueDays > 0 ? '逾期' : '未发放'
      } else if (paidAmount >= actualWage) {
        record.paymentStatus = '已发清'
      } else {
        record.paymentStatus = '部分发放'
      }

      // 按状态筛选
      if (filters?.status && filters.status !== '全部') {
        if (record.paymentStatus !== filters.status) return null
      }

      return record
    }).filter(Boolean)

    return result
  } catch (err) {
    log.error('[SQLite] wages.getPaymentRecords error:', err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 欠薪统计
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取欠薪统计数据
 */
export function getOverdueStats(): {
  totalOverdueAmount: number
  overdueWorkerCount: number
  overdueProjectCount: number
  maxOverdueDays: number
} | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取所有未发清的工资记录
    const rows = sqlite.prepare(`
      SELECT w.*, w.member_name AS w_member_name, workers.name AS worker_name
      FROM wages w
      LEFT JOIN workers ON w.member_id = workers.id
    `).all() as any[]

    let totalOverdueAmount = 0
    let overdueWorkerCount = 0
    let overdueProjectCount = 0
    let maxOverdueDays = 0
    const overdueProjectIds = new Set<number>()

    for (const r of rows) {
      const yearMonth = r.year_month
      const [year, month] = yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15)
      const overdueDays = today > dueDate
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const paidAmount = r.paid_amount || 0
      const actualWage = r.actual_wage || 0

      // 未发清且逾期
      if (paidAmount < actualWage && overdueDays > 0) {
        totalOverdueAmount += (actualWage - paidAmount)
        overdueWorkerCount++
        overdueProjectIds.add(r.project_id)
        if (overdueDays > maxOverdueDays) maxOverdueDays = overdueDays
      }
    }

    overdueProjectCount = overdueProjectIds.size

    return {
      totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
      overdueWorkerCount,
      overdueProjectCount,
      maxOverdueDays,
    }
  } catch (err) {
    log.error('[SQLite] wages.getOverdueStats error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 欠薪列表
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取欠薪列表（按逾期天数降序）
 */
export function getOverdueList(): any[] {
  const sqlite = tryGetSqlite()
  if (!sqlite) return []

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取所有工资记录（联表查询）
    const rows = sqlite.prepare(`
      SELECT
        w.*,
        w.member_name AS w_member_name,
        workers.name AS worker_name,
        workers.phone AS worker_phone,
        projects.name AS project_name
      FROM wages w
      LEFT JOIN workers ON w.member_id = workers.id
      LEFT JOIN projects ON w.project_id = projects.id
    `).all() as any[]

    const overdueList: any[] = []

    for (const r of rows) {
      const yearMonth = r.year_month
      const [year, month] = yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15)
      const overdueDays = today > dueDate
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const paidAmount = r.paid_amount || 0
      const actualWage = r.actual_wage || 0

      // 未发清且逾期
      if (paidAmount < actualWage && overdueDays > 0) {
        const record = rowToCamel(r, W_COLUMNS)
        record.workerName = r.worker_name || r.w_member_name || ''
        record.workerPhone = r.worker_phone || ''
        record.projectName = r.project_name || ''
        record.overdueDays = overdueDays
        record.overdueAmount = actualWage - paidAmount
        record.paymentStatus = paidAmount === 0 ? '逾期' : '部分发放'
        overdueList.push(record)
      }
    }

    // 按逾期天数降序排序
    overdueList.sort((a, b) => b.overdueDays - a.overdueDays)

    return overdueList
  } catch (err) {
    log.error('[SQLite] wages.getOverdueList error:', err)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统计操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 工资统计（SQLite 聚合版） */
export function getWageStats(filters?: { yearMonth?: string; projectId?: number }): {
  totalWage: number
  count: number
  projectBreakdown: { projectId: number; projectName: string; total: number; percentage: number }[]
} | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    // 构建过滤条件：只统计有效的工资记录（关联存在的 project_worker 或 member）
    let filterSql = `WHERE (
      (w.project_worker_id IS NOT NULL AND w.project_worker_id IN (SELECT id FROM project_workers))
      OR (w.member_id IS NOT NULL AND w.member_id IN (SELECT id FROM members))
    )`
    const params: any[] = []

    if (filters?.yearMonth) {
      filterSql += ' AND w.year_month = ?'
      params.push(filters.yearMonth)
    }
    if (filters?.projectId) {
      filterSql += ' AND w.project_id = ?'
      params.push(filters.projectId)
    }

    // 总额 + 总数
    const summary = sqlite.prepare(
      `SELECT COALESCE(SUM(w.actual_wage), 0) AS total_wage, COUNT(*) AS cnt FROM wages w ${filterSql}`
    ).get(...params) as { total_wage: number; cnt: number }

    const totalWage = Math.round((summary.total_wage || 0) * 100) / 100

    // 按项目分组
    const breakdownRows = sqlite.prepare(`
      SELECT w.project_id, p.name AS project_name, COALESCE(SUM(w.actual_wage), 0) AS total
      FROM wages w
      LEFT JOIN projects p ON p.id = w.project_id
      ${filterSql}
      GROUP BY w.project_id
      ORDER BY total DESC
    `).all(...params) as { project_id: number; project_name: string; total: number }[]

    const projectBreakdown = breakdownRows.map(r => ({
      projectId: r.project_id,
      projectName: r.project_name || '未知项目',
      total: Math.round(r.total * 100) / 100,
      percentage: totalWage > 0 ? Math.round((r.total / totalWage) * 10000) / 100 : 0,
    }))

    return {
      totalWage,
      count: summary.cnt || 0,
      projectBreakdown,
    }
  } catch (err) {
    log.error('[SQLite] wages.getStats error:', err)
    return null
  }
}
