/**
 * 审计日志 IPC 处理器
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *
 * 字段映射注意事项（JSON ↔ SQLite）：
 *   timestamp     ↔ created_at
 *   username       ↔ user_name
 *   resource       ↔ resource_type
 *   description    ↔ details
 *   ip             ↔ ip_address
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, auditQueries } from '../sqlite/queries'

const MAX_LOGS = 10000

// ═══════════════════════════════════════════════════════════════════════════════
// 审计日志
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('audit:log', async (_event, auditLog: any) => {
  try {
    // ── JSON 写（原有逻辑） ──
    if (!db.auditLogs) db.auditLogs = []
    db.auditLogs.push(auditLog)
    if (db.auditLogs.length > MAX_LOGS) {
      db.auditLogs = db.auditLogs.slice(-MAX_LOGS)
    }
    saveDatabase()

    // ── SQLite 双写 ──
    auditQueries.logAudit(auditLog)

    return { success: true }
  } catch (error: any) {
    log.error('audit:log error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('audit:query', async (_event, query: any) => {
  try {
    // ── SQLite 读路径 ──
    if (useSqliteRead()) {
      const result = auditQueries.queryLogs(query)
      if (result !== null) {
        return { success: true, data: result }
      }
      log.warn('[DualWrite] audit.query SQLite read failed, falling back to JSON')
    }

    // ── JSON 读路径（原有逻辑） ──
    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
    if (!db.auditLogs) db.auditLogs = []

    let filtered = [...db.auditLogs]

    // 按日期筛选
    if (query.startDate) {
      filtered = filtered.filter((l: any) => l.timestamp >= query.startDate)
    }
    if (query.endDate) {
      const endDate = new Date(query.endDate)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((l: any) => new Date(l.timestamp) <= endDate)
    }

    // 按操作类型筛选
    if (query.action) {
      filtered = filtered.filter((l: any) => l.action === query.action)
    }
    // 按资源类型筛选
    if (query.resource) {
      filtered = filtered.filter((l: any) => l.resource === query.resource)
    }
    // 按级别筛选
    if (query.level) {
      filtered = filtered.filter((l: any) => l.level === query.level)
    }
    // 关键词搜索
    if (query.keyword) {
      const kw = query.keyword.toLowerCase()
      filtered = filtered.filter((l: any) =>
        l.username?.toLowerCase().includes(kw) ||
        l.description?.toLowerCase().includes(kw) ||
        l.resourceName?.toLowerCase().includes(kw)
      )
    }

    filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = filtered.length
    const page = query.page || 1
    const pageSize = query.pageSize || 20
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return {
      success: true,
      data: { items, total, page, pageSize, totalPages }
    }
  } catch (error: any) {
    log.error('audit:query error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('audit:stats', async (_event, days?: number) => {
  try {
    // ── SQLite 读路径 ──
    if (useSqliteRead()) {
      const result = auditQueries.getStats(days)
      if (result !== null) {
        return { success: true, data: result }
      }
      log.warn('[DualWrite] audit.stats SQLite read failed, falling back to JSON')
    }

    // ── JSON 读路径（原有逻辑） ──
    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
    if (!db.auditLogs) db.auditLogs = []

    const now = Date.now()
    const cutoffDate = days ? new Date(now - days * 24 * 60 * 60 * 1000).toISOString() : null

    let logs = db.auditLogs
    if (cutoffDate) {
      logs = logs.filter((l: any) => l.timestamp >= cutoffDate)
    }

    const totalCount = logs.length

    // 今日操作数
    const today = new Date().toISOString().split('T')[0]
    const todayCount = logs.filter((l: any) => l.timestamp.startsWith(today)).length

    // 操作类型分布
    const actionCounts: Record<string, number> = {}
    logs.forEach((l: any) => {
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1
    })

    // 资源类型分布
    const resourceCounts: Record<string, number> = {}
    logs.forEach((l: any) => {
      resourceCounts[l.resource] = (resourceCounts[l.resource] || 0) + 1
    })

    // 活跃用户
    const userCounts: Record<string, { userId: string; username: string; count: number }> = {}
    logs.forEach((l: any) => {
      const key = l.userId || 'unknown'
      if (!userCounts[key]) {
        userCounts[key] = { userId: key, username: l.username || 'unknown', count: 0 }
      }
      userCounts[key].count++
    })
    const topUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      success: true,
      data: { totalCount, todayCount, actionCounts, resourceCounts, topUsers }
    }
  } catch (error: any) {
    log.error('audit:stats error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('audit:clear', async (_event, daysToKeep: number) => {
  try {
    // ── JSON 写（原有逻辑） ──
    if (!db.auditLogs) db.auditLogs = []

    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()
    const before = db.auditLogs.length
    db.auditLogs = db.auditLogs.filter((l: any) => l.timestamp >= cutoffDate)
    const removed = before - db.auditLogs.length
    saveDatabase()

    // ── SQLite 双写 ──
    auditQueries.clearLogs(daysToKeep)

    return { success: true, data: { removedCount: removed } }
  } catch (error: any) {
    log.error('audit:clear error:', error)
    return { success: false, error: error.message }
  }
})

log.info('Audit IPC handlers registered')
