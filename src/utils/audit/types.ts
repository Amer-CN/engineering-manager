/**
 * 审计日志 — 类型定义
 */

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout' | 'approve' | 'lock' | 'unlock'

export type AuditLevel = 'info' | 'warning' | 'error'

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

export interface AuditLogResult {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
