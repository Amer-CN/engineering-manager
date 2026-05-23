/**
 * 审计日志 SQLite 查询模块
 *
 * 实现 audit_logs 表的 CRUD 操作。
 *
 * 注意字段映射差异：
 * - JSON `timestamp`  ↔ SQLite `created_at`
 * - JSON `username`   ↔ SQLite `user_name`
 * - JSON `resource`   ↔ SQLite `resource_type`
 * - JSON `description` ↔ SQLite `details`（描述性文本存 details 列）
 * - JSON `resourceName` → SQLite 无此列（查询时用子查询模拟）
 * - JSON `ip`         ↔ SQLite `ip_address`
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue, useSqliteRead } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 字段映射
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 将 JSON 审计日志转为 SQLite INSERT 参数
 *
 * JSON AuditLog 字段 → SQLite audit_logs 列：
 *   id          → id (TEXT, 格式 "log_123_abc")
 *   timestamp   → created_at
 *   userId      → user_id
 *   username    → user_name
 *   action      → action
 *   resource    → resource_type
 *   resourceId  → resource_id
 *   level       → level
 *   description → details
 *   ip          → ip_address
 */
function auditLogToParams(auditLog: Record<string, any>): any[] {
  return [
    toSqliteValue(auditLog.id),           // id (TEXT)
    toSqliteValue(auditLog.action),       // action
    toSqliteValue(auditLog.level || 'info'), // level
    toSqliteValue(auditLog.userId),       // user_id
    toSqliteValue(auditLog.username),     // user_name
    toSqliteValue(auditLog.resource),     // resource_type
    toSqliteValue(auditLog.resourceId),   // resource_id
    toSqliteValue(auditLog.description),  // details
    toSqliteValue(auditLog.ip),           // ip_address
    toSqliteValue(auditLog.timestamp || new Date().toISOString()), // created_at
  ]
}

/** INSERT 语句 */
const INSERT_SQL = `
  INSERT OR REPLACE INTO audit_logs
    (id, action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

/**
 * 将 SQLite 行转为前端期望的 AuditLog 格式
 */
function rowToAuditLog(row: Record<string, any>): Record<string, any> {
  return {
    id: row.id,
    action: row.action,
    level: row.level || 'info',
    userId: row.user_id,
    username: row.user_name,
    resource: row.resource_type,
    resourceId: row.resource_id,
    description: row.details,
    ip: row.ip_address,
    timestamp: row.created_at,
    // resourceName 在 SQLite 中没有对应列，设为 null
    resourceName: null,
    // details 在 SQLite 中复用 details 列（description），
    // 原始 details 对象在 JSON 迁移时已丢失（前端 audit.ts 会剥离 details 再存 JSON）
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 记录审计日志（SQLite 版）
 */
export function logAudit(auditLog: Record<string, any>): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const params = auditLogToParams(auditLog)
    sqlite.prepare(INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] audit.log error:', err)
    return false
  }
}

/**
 * 清理旧日志（SQLite 版）
 * @returns 删除的行数
 */
export function clearLogs(daysToKeep: number): number {
  const sqlite = tryGetSqlite()
  if (!sqlite) return 0

  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()
    const result = sqlite.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoffDate)
    return result.changes
  } catch (err) {
    log.error('[SQLite] audit.clear error:', err)
    return 0
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 查询审计日志（SQLite 版）
 * 返回格式与 JSON 版 audit:query 一致
 */
export function queryLogs(query: Record<string, any>): {
  items: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} | null {
  if (!useSqliteRead()) return null

  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const conditions: string[] = []
    const params: any[] = []

    // 日期筛选
    if (query.startDate) {
      conditions.push('created_at >= ?')
      params.push(query.startDate)
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate)
      endDate.setHours(23, 59, 59, 999)
      conditions.push('created_at <= ?')
      params.push(endDate.toISOString())
    }

    // 操作类型
    if (query.action) {
      conditions.push('action = ?')
      params.push(query.action)
    }

    // 资源类型（JSON 的 resource 对应 SQLite 的 resource_type）
    if (query.resource) {
      conditions.push('resource_type = ?')
      params.push(query.resource)
    }

    // 级别
    if (query.level) {
      conditions.push('level = ?')
      params.push(query.level)
    }

    // 关键词搜索（user_name / details / resource_id）
    if (query.keyword) {
      conditions.push('(user_name LIKE ? OR details LIKE ? OR resource_id LIKE ?)')
      const kw = `%${query.keyword.toLowerCase()}%`
      params.push(kw, kw, kw)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 总数
    const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`)
      .get(...params) as { count: number }
    const total = countRow.count

    // 分页
    const page = query.page || 1
    const pageSize = query.pageSize || 20
    const totalPages = Math.ceil(total / pageSize)
    const offset = (page - 1) * pageSize

    // 查询
    const rows = sqlite.prepare(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as Record<string, any>[]

    const items = rows.map(rowToAuditLog)

    return { items, total, page, pageSize, totalPages }
  } catch (err) {
    log.error('[SQLite] audit.query error:', err)
    return null
  }
}

/**
 * 获取审计统计（SQLite 版）
 */
export function getStats(days?: number): {
  totalCount: number
  todayCount: number
  actionCounts: Record<string, number>
  resourceCounts: Record<string, number>
  topUsers: { userId: string; username: string; count: number }[]
} | null {
  if (!useSqliteRead()) return null

  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let dateFilter = ''
    const params: any[] = []
    if (days) {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      dateFilter = 'WHERE created_at >= ?'
      params.push(cutoffDate)
    }

    // 总数
    const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM audit_logs ${dateFilter}`)
      .get(...params) as { count: number }
    const totalCount = countRow.count

    // 今日操作数
    const today = new Date().toISOString().split('T')[0]
    const todayParams = [...params]
    const todayWhere = dateFilter
      ? `${dateFilter} AND created_at >= ?`
      : 'WHERE created_at >= ?'
    todayParams.push(today)
    const todayRow = sqlite.prepare(`SELECT COUNT(*) as count FROM audit_logs ${todayWhere}`)
      .get(...todayParams) as { count: number }
    const todayCount = todayRow.count

    // 操作类型分布
    const actionRows = sqlite.prepare(
      `SELECT action, COUNT(*) as count FROM audit_logs ${dateFilter} GROUP BY action`
    ).all(...params) as { action: string; count: number }[]
    const actionCounts: Record<string, number> = {}
    for (const row of actionRows) {
      actionCounts[row.action] = row.count
    }

    // 资源类型分布
    const resourceRows = sqlite.prepare(
      `SELECT resource_type, COUNT(*) as count FROM audit_logs ${dateFilter} GROUP BY resource_type`
    ).all(...params) as { resource_type: string; count: number }[]
    const resourceCounts: Record<string, number> = {}
    for (const row of resourceRows) {
      resourceCounts[row.resource_type] = row.count
    }

    // 活跃用户
    const userRows = sqlite.prepare(
      `SELECT user_id, user_name, COUNT(*) as count FROM audit_logs ${dateFilter} GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10`
    ).all(...params) as { user_id: string; user_name: string; count: number }[]
    const topUsers = userRows.map(row => ({
      userId: row.user_id || 'unknown',
      username: row.user_name || 'unknown',
      count: row.count,
    }))

    return { totalCount, todayCount, actionCounts, resourceCounts, topUsers }
  } catch (err) {
    log.error('[SQLite] audit.stats error:', err)
    return null
  }
}
