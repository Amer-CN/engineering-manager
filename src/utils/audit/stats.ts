/**
 * 审计日志 — 统计分析
 */
import type { AuditAction } from './types'
import { getLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export interface AuditStats {
  totalCount: number
  todayCount: number
  actionCounts: Record<AuditAction, number>
  resourceCounts: Record<string, number>
  topUsers: Array<{ userId: string; username: string; count: number }>
}

export async function getAuditStats(days = 30): Promise<AuditStats> {
  // 优先查询后端
  try {
    const api = await getAPI()
    if (api.getAuditStats) {
      const result = await api.getAuditStats(days)
      if (result.success && result.data) return result.data as AuditStats
    }
  } catch (err) { console.warn('[AuditStats] 后端查询失败:', err) }

  // 回退到 localStorage
  const logs = getLogs()
  const today = new Date().toISOString().split('T')[0]

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
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    if (!userCounts[log.userId]) {
      userCounts[log.userId] = { username: log.username, count: 0 }
    }
    userCounts[log.userId].count++
  }

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
