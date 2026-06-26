/**
 * 审计日志 — 导出（JSON / CSV）
 */
import type { AuditLogQuery } from './types'
import { queryAuditLogs } from './query'

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
