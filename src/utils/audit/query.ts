/**
 * 审计日志 — 查询
 */
import type { AuditLogQuery, AuditLogResult } from './types'
import { getLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  // 优先查询后端
  try {
    const api = await getAPI()
    if (api.getAuditLogs) {
      const result = await api.getAuditLogs(query)
      if (result.success && result.data) return result.data as AuditLogResult
    }
  } catch (err) { console.warn('[AuditQuery] 后端查询失败:', err) }

  // 回退到 localStorage 查询
  let logs = getLogs()

  // 应用过滤条件
  if (query.startDate) logs = logs.filter(log => log.timestamp >= query.startDate!)
  if (query.endDate) logs = logs.filter(log => log.timestamp <= query.endDate!)
  if (query.userId) logs = logs.filter(log => log.userId === query.userId)
  if (query.action) logs = logs.filter(log => log.action === query.action)
  if (query.resource) logs = logs.filter(log => log.resource === query.resource)
  if (query.resourceId) logs = logs.filter(log => String(log.resourceId) === String(query.resourceId))
  if (query.level) logs = logs.filter(log => log.level === query.level)
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    logs = logs.filter(log =>
      log.description.toLowerCase().includes(kw) ||
      log.resource.toLowerCase().includes(kw) ||
      log.username.toLowerCase().includes(kw)
    )
  }

  // 按时间倒序
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const total = logs.length
  const page = query.page || 1
  const pageSize = query.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)
  const items = logs.slice((page - 1) * pageSize, page * pageSize)

  return { items, total, page, pageSize, totalPages }
}
