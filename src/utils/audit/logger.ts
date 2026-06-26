/**
 * 审计日志 — 日志记录器
 */
import type { AuditAction, AuditLevel, AuditLog } from './types'
import { getLogs, saveLogs } from './storage'

let currentUsername = 'anonymous'
let currentUserId = 'unknown'

export function setCurrentAuditUser(userId: string | null, username: string | null): void {
  currentUserId = userId || 'unknown'
  currentUsername = username || 'anonymous'
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 记录操作日志
 */
export async function logAudit(
  action: AuditAction,
  resource: string,
  options: {
    resourceId?: string | number
    resourceName?: string
    level?: AuditLevel
    description: string
    details?: Record<string, unknown>
  } = { description: '' }
): Promise<void> {
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
    description: options.description,
    details: options.details,
  }

  const logs = getLogs()
  logs.push(log)
  saveLogs(logs)

  // 异步发送到后端（fire-and-forget）
  import('@/services/api-adapter').then(async ({ getAPI }) => {
    try {
      const api = await getAPI()
      if (api.createAuditLog) {
        await api.createAuditLog({
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          resourceName: log.resourceName,
          level: log.level,
          description: log.description,
          details: log.details,
        })
      }
    } catch {
      // 后端发送失败不影响前端
    }
  }).catch(() => {})
}

// ─── 便捷记录函数 ───

export function logCreate(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('create', resource, { ...options, description: options.description || `创建${resource}`, level: 'info' })
}

export function logUpdate(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('update', resource, { ...options, description: options.description || `更新${resource}`, level: 'info' })
}

export function logDelete(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('delete', resource, { ...options, description: options.description || `删除${resource}`, level: 'warning' })
}

export function logExport(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('export', resource, { ...options, description: options.description || `导出${resource}`, level: 'info' })
}

export function logImport(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('import', resource, { ...options, description: options.description || `导入${resource}`, level: 'info' })
}

export function logLogin(username: string, details?: Record<string, unknown>) {
  return logAudit('login', 'auth', { description: `用户登录: ${username}`, level: 'info', details })
}

export function logLogout(username: string, details?: Record<string, unknown>) {
  return logAudit('logout', 'auth', { description: `用户登出: ${username}`, level: 'info', details })
}

export function logApprove(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('approve', resource, { ...options, description: options.description || `审批${resource}`, level: 'info' })
}

export function logLock(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('lock', resource, { ...options, description: options.description || `锁定${resource}`, level: 'warning' })
}

export function logUnlock(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('unlock', resource, { ...options, description: options.description || `解锁${resource}`, level: 'info' })
}
