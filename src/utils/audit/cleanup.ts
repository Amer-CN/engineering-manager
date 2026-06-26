/**
 * 审计日志 — 清理
 */
import { getLogs, saveLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export async function clearOldLogs(daysToKeep = 90): Promise<number> {
  // 同步清理后端
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) {
      const result = await api.clearAuditLogs(daysToKeep)
      if (result.success && result.data) return result.data.removedCount
    }
  } catch (err) { console.warn('[AuditCleanup] 清理旧日志失败:', err) }

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

export async function clearAllLogs(): Promise<void> {
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) await api.clearAuditLogs(1)
  } catch (err) { console.warn('[AuditCleanup] 清空日志失败:', err) }
  localStorage.removeItem('audit_logs')
}
