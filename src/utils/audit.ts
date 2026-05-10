/**
 * 操作日志审计系统
 * 
 * 记录所有 CRUD 操作，支持查询和导出
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 操作类型
 */
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout' | 'approve' | 'lock' | 'unlock'

/**
 * 操作日志级别
 */
export type AuditLevel = 'info' | 'warning' | 'error'

/**
 * 操作日志
 */
export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  username: string
  action: AuditAction
  resource: string
  resourceId?: string | number
  resourceName?: string
  level: AuditLevel
  description: string
  details?: Record<string, any>
  ip?: string
  userAgent?: string
}

/**
 * 查询条件
 */
export interface AuditLogQuery {
  startDate?: string
  endDate?: string
  userId?: string
  action?: AuditAction
  resource?: string
  resourceId?: string | number
  level?: AuditLevel
  keyword?: string
  page?: number
  pageSize?: number
}

/**
 * 查询结果
 */
export interface AuditLogResult {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志存储
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 日志存储键名
 */
const AUDIT_LOG_KEY = 'audit_logs'

// 启动时清理旧日志（去除 details 瘦身，超过 3000 条只保留一半）
try {
  const raw = localStorage.getItem(AUDIT_LOG_KEY)
  if (raw) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const stripped = parsed.slice(-3000).map(({ details, ...rest }: any) => rest)
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(stripped))
    }
  }
} catch { localStorage.removeItem(AUDIT_LOG_KEY) }

/**
 * 获取所有日志
 */
function getLogs(): AuditLog[] {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存日志
 * localStorage 配额有限（5-10MB），仅存摘要信息，details 只走 IPC
 */
function saveLogs(logs: AuditLog[]): void {
  // 只保留最近 3000 条，且去除 details 瘦身
  const trimmedLogs = logs.slice(-3000).map(({ details, ...rest }) => rest)
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs))
  } catch {
    // 配额超限时砍半再试
    const halved = trimmedLogs.slice(-Math.floor(trimmedLogs.length / 2))
    try { localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(halved)) } catch { /* 放弃 */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志记录
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 当前用户名（简化版，应从用户系统获取）
 */
let currentUsername = 'anonymous'
let currentUserId = 'unknown'

/**
 * 设置当前用户信息
 */
export function setCurrentAuditUser(userId: string | null, username: string | null): void {
  currentUserId = userId || 'unknown'
  currentUsername = username || 'anonymous'
}

/**
 * 生成日志 ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 记录操作日志
 * 
 * @param action 操作类型
 * @param resource 资源类型
 * @param description 操作描述
 * @param options 额外选项
 * 
 * @example
 * ```typescript
 * // 记录创建操作
 * logAudit('create', 'projects', '创建项目: 测试项目')
 * 
 * // 记录更新操作
 * logAudit('update', 'members', '更新员工: 张三', {
 *   resourceId: 123,
 *   details: { before: {...}, after: {...} }
 * })
 * ```
 */
export function logAudit(
  action: AuditAction,
  resource: string,
  description: string,
  options: {
    resourceId?: string | number
    resourceName?: string
    level?: AuditLevel
    details?: Record<string, any>
  } = {}
): AuditLog {
  const log: AuditLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    userId: currentUserId,
    username: currentUsername,
    action,
    resource,
    resourceId: options.resourceId,
    resourceName: options.resourceName,
    level: options.level || 'info',
    description,
    details: options.details,
  }

  // 保存日志到 localStorage
  const logs = getLogs()
  logs.push(log)
  saveLogs(logs)

  // 同步到后端 IPC（fire-and-forget）
  if (window.electronAPI?.auditLog) {
    window.electronAPI.auditLog(log).catch(() => {})
  }

  return log
}

/**
 * 记录创建操作
 */
export function logCreate(
  resource: string,
  resourceName: string,
  resourceId?: string | number,
  details?: Record<string, any>
): AuditLog {
  return logAudit('create', resource, `创建 ${resourceName}`, {
    resourceId,
    resourceName,
    details,
  })
}

/**
 * 记录读取操作
 */
export function logRead(
  resource: string,
  resourceName: string,
  resourceId?: string | number
): AuditLog {
  return logAudit('read', resource, `查看 ${resourceName}`, {
    resourceId,
    resourceName,
  })
}

/**
 * 记录更新操作
 */
export function logUpdate(
  resource: string,
  resourceName: string,
  resourceId: string | number,
  details?: Record<string, any>
): AuditLog {
  return logAudit('update', resource, `更新 ${resourceName}`, {
    resourceId,
    resourceName,
    details,
  })
}

/**
 * 记录删除操作
 */
export function logDelete(
  resource: string,
  resourceName: string,
  resourceId?: string | number,
  details?: Record<string, any>
): AuditLog {
  return logAudit('delete', resource, `删除 ${resourceName}`, {
    resourceId,
    resourceName,
    level: 'warning',
    details,
  })
}

/**
 * 记录导出操作
 */
export function logExport(
  resource: string,
  count: number,
  details?: Record<string, any>
): AuditLog {
  return logAudit('export', resource, `导出 ${count} 条 ${resource} 记录`, {
    details: { count, ...details },
  })
}

/**
 * 记录导入操作
 */
export function logImport(
  resource: string,
  count: number,
  details?: Record<string, any>
): AuditLog {
  return logAudit('import', resource, `导入 ${count} 条 ${resource} 记录`, {
    details: { count, ...details },
  })
}

/**
 * 记录审批操作
 */
export function logApprove(
  resource: string,
  resourceName: string,
  resourceId: string | number,
  approved: boolean,
  reason?: string
): AuditLog {
  return logAudit('approve', resource, `审批 ${resourceName}: ${approved ? '通过' : '驳回'}`, {
    resourceId,
    resourceName,
    level: approved ? 'info' : 'warning',
    details: { approved, reason },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志查询
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 查询操作日志
 */
export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  // 尝试从后端 IPC 查询
  if (window.electronAPI?.queryAuditLogs) {
    try {
      const result = await window.electronAPI.queryAuditLogs(query)
      if (result.success && result.data) {
        return result.data as AuditLogResult
      }
    } catch {}
  }

  // 回退到 localStorage
  let logs = getLogs()

  // 按时间倒序
  logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // 应用筛选条件
  if (query.startDate) {
    logs = logs.filter(log => log.timestamp >= query.startDate!)
  }
  if (query.endDate) {
    logs = logs.filter(log => log.timestamp <= query.endDate!)
  }
  if (query.userId) {
    logs = logs.filter(log => log.userId === query.userId)
  }
  if (query.action) {
    logs = logs.filter(log => log.action === query.action)
  }
  if (query.resource) {
    logs = logs.filter(log => log.resource === query.resource)
  }
  if (query.resourceId !== undefined) {
    logs = logs.filter(log => log.resourceId === query.resourceId)
  }
  if (query.level) {
    logs = logs.filter(log => log.level === query.level)
  }
  if (query.keyword) {
    const keyword = query.keyword.toLowerCase()
    logs = logs.filter(log =>
      log.description.toLowerCase().includes(keyword) ||
      log.username.toLowerCase().includes(keyword) ||
      log.resourceName?.toLowerCase().includes(keyword)
    )
  }

  const total = logs.length
  const page = query.page || 1
  const pageSize = query.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)

  // 分页
  const startIndex = (page - 1) * pageSize
  const items = logs.slice(startIndex, startIndex + pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * 获取资源的所有操作记录
 */
export function getResourceAuditLogs(resource: string, resourceId: string | number): AuditLog[] {
  const logs = getLogs()
  return logs
    .filter(log => log.resource === resource && log.resourceId === resourceId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * 获取用户的操作记录
 */
export function getUserAuditLogs(userId: string, limit = 50): AuditLog[] {
  const logs = getLogs()
  return logs
    .filter(log => log.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统计
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 操作统计
 */
export interface AuditStats {
  totalCount: number
  todayCount: number
  actionCounts: Record<AuditAction, number>
  resourceCounts: Record<string, number>
  topUsers: { userId: string; username: string; count: number }[]
}

/**
 * 获取操作统计
 */
export async function getAuditStats(days = 7): Promise<AuditStats> {
  // 尝试从后端 IPC 查询
  if (window.electronAPI?.getAuditStats) {
    try {
      const result = await window.electronAPI.getAuditStats(days)
      if (result.success && result.data) return result.data as AuditStats
    } catch {}
  }

  // 回退到 localStorage
  const logs = getLogs()
  const today = new Date().toISOString().split('T')[0]
  
  // 筛选近 N 天
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)
  
  const actionCounts: Record<AuditAction, number> = {
    create: 0, read: 0, update: 0, delete: 0,
    export: 0, import: 0, login: 0, logout: 0, approve: 0, lock: 0, unlock: 0
  }
  
  const resourceCounts: Record<string, number> = {}
  const userCounts: Record<string, { username: string; count: number }> = {}

  for (const log of recentLogs) {
    // 统计操作类型
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    
    // 统计资源
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    
    // 统计用户
    if (!userCounts[log.userId]) {
      userCounts[log.userId] = { username: log.username, count: 0 }
    }
    userCounts[log.userId].count++
  }

  // 排序用户
  const topUsers = Object.entries(userCounts)
    .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalCount: logs.length,
    todayCount: logs.filter(log => log.timestamp.startsWith(today)).length,
    actionCounts,
    resourceCounts,
    topUsers,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志导出
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出日志到 JSON
 */
export async function exportAuditLogsToJson(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })
  const blob = new Blob([JSON.stringify(result.items, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`
  link.click()
  
  URL.revokeObjectURL(url)
}

/**
 * 导出日志到 CSV
 */
export async function exportAuditLogsToCsv(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })
  
  const headers = ['时间', '用户', '操作', '资源', '资源ID', '级别', '描述']
  const rows = result.items.map(log => [
    log.timestamp,
    log.username,
    log.action,
    log.resource,
    log.resourceId || '',
    log.level,
    log.description,
  ])
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志清理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 清理旧日志
 */
export async function clearOldLogs(daysToKeep = 90): Promise<number> {
  // 同步清理后端
  if (window.electronAPI?.clearAuditLogs) {
    try {
      const result = await window.electronAPI.clearAuditLogs(daysToKeep)
      if (result.success && result.data) return result.data.removedCount
    } catch {}
  }

  // 回退 localStorage
  const logs = getLogs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)
  const removedCount = logs.length - filteredLogs.length

  if (removedCount > 0) {
    saveLogs(filteredLogs)
  }

  return removedCount
}

/**
 * 清空所有日志（谨慎使用）
 */
export async function clearAllLogs(): Promise<void> {
  // 同步清理后端
  if (window.electronAPI?.clearAuditLogs) {
    try { await window.electronAPI.clearAuditLogs(1) } catch {}
  }
  localStorage.removeItem(AUDIT_LOG_KEY)
}

