/**
 * 审计日志 — localStorage 存储层
 */
import type { AuditLog } from './types'

export const AUDIT_LOG_KEY = 'audit_logs'

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

export function getLogs(): AuditLog[] {
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
export function saveLogs(logs: AuditLog[]): void {
  const trimmedLogs = logs.slice(-3000).map(({ details, ...rest }) => rest)
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs))
  } catch {
    const halved = trimmedLogs.slice(-Math.floor(trimmedLogs.length / 2))
    try { localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(halved)) } catch { /* 放弃 */ }
  }
}
