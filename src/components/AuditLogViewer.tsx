/**
 * 审计日志组件
 * 
 * 提供审计日志的查看和搜索功能
 */

import React, { useState, useEffect } from 'react'
import {
  queryAuditLogs,
  getAuditStats,
  exportAuditLogsToJson,
  exportAuditLogsToCsv,
  clearOldLogs,
  AuditLog,
  AuditLogQuery,
  AuditStats,
} from '../utils/audit'
import { Card } from './ui/Card'
import type { AuditAction } from '../utils/audit'
import { ACTION_LABELS, LEVEL_COLORS, RESOURCE_LABELS } from '../constants/auditLog'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import { Button } from './ui/Button'

interface AuditLogViewerProps {
  /** 最大显示条数 */
  maxVisible?: number
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ maxVisible = 100 }) => {
  const { confirm, ConfirmDialog } = useConfirm()
  const showToast = useToastStore(state => state.showToast)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState<AuditLogQuery>({
  page: 1,
  pageSize: 20,
  })
  const [totalPages, setTotalPages] = useState(1)

  // 加载日志
  const loadLogs = async () => {
  setLoading(true)
  try {
  const result = await queryAuditLogs(query)
  setLogs(result.items)
  setTotalPages(result.totalPages)
  } finally {
  setLoading(false)
  }
  }

  // 加载统计
  const loadStats = async () => {
  const s = await getAuditStats(7)
  setStats(s)
  }

  useEffect(() => {
  loadLogs()
  loadStats()
  }, [])

  useEffect(() => {
  loadLogs()
  }, [query])

  // 搜索
  const handleSearch = (e: React.FormEvent) => {
  e.preventDefault()
  setQuery({ ...query, page: 1 })
  }

  // 分页
  const handlePageChange = (page: number) => {
  setQuery({ ...query, page })
  }

  // 导出
  const handleExport = async (format: 'json' | 'csv') => {
  if (format === 'json') {
  await exportAuditLogsToJson(query)
  } else {
  await exportAuditLogsToCsv(query)
  }
  }

  // 清理旧日志
  const handleClearOldLogs = async () => {
  const ok = await confirm({ title: '确认清理', content: '确定要清理 90 天前的日志吗？', confirmVariant: 'danger' })
  if (!ok) return
  const removed = await clearOldLogs(90)
  showToast(`已清理 ${removed} 条旧日志`, 'success')
  loadLogs()
  loadStats()
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  })
  }

  return (
  <Card className="border border-[color:var(--border)]">
  {ConfirmDialog}
  {/* 头部统计 */}
  {stats && (
  <div className="grid grid-cols-4 gap-4 p-4 bg-[color:var(--panel-2)] border-b border-[color:var(--border)]">
  <div className="text-center">
  <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg-2)]">{stats.totalCount}</div>
  <div className="text-xs text-[color:var(--muted)]">总记录</div>
  </div>
  <div className="text-center">
  <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-600">{stats.todayCount}</div>
  <div className="text-xs text-[color:var(--muted)]">今日</div>
  </div>
  <div className="text-center">
  <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">
  {Object.values(stats.actionCounts).reduce((a, b) => a + b, 0)}
  </div>
  <div className="text-xs text-[color:var(--muted)]">本周操作</div>
  </div>
  <div className="text-center">
  <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{stats.topUsers.length}</div>
  <div className="text-xs text-[color:var(--muted)]">活跃用户</div>
  </div>
  </div>
  )}

  {/* 搜索栏 */}
  <div className="p-4 border-b border-[color:var(--border)]">
  <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
  <input
  type="text"
  placeholder="搜索关键词..."
  value={query.keyword || ''}
  onChange={e => setQuery({ ...query, keyword: e.target.value || undefined })}
  className="flex-1 min-w-[200px] px-3 py-2 border border-[color:var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
  />
  
  <select
  value={query.action || ''}
  onChange={e => setQuery({ ...query, action: (e.target.value || undefined) as AuditAction })}
  className="px-3 py-2 border border-[color:var(--border)] rounded-lg text-sm"
  >
  <option value="">全部操作</option>
  {Object.entries(ACTION_LABELS).map(([key, label]) => (
  <option key={key} value={key}>{label}</option>
  ))}
  </select>

  <select
  value={query.resource || ''}
  onChange={e => setQuery({ ...query, resource: e.target.value || undefined })}
  className="px-3 py-2 border border-[color:var(--border)] rounded-lg text-sm"
  >
  <option value="">全部资源</option>
  {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
  <option key={key} value={key}>{label}</option>
  ))}
  </select>

  <Button
  type="submit"
  
   variant="primary" className="text-sm">
  搜索
  </Button>

  <div className="flex gap-2 ml-auto">
  <Button
  type="button"
  onClick={() => handleExport('csv')}
  
   variant="secondary" size="sm">
  导出 CSV
  </Button>
  <Button
  type="button"
  onClick={() => handleExport('json')}
  
   variant="secondary" size="sm">
  导出 JSON
  </Button>
  </div>
  </form>
  </div>

  {/* 日志列表 */}
  <div className="divide-y divide-[color:var(--border)] max-h-[500px] overflow-y-auto">
  {loading ? (
  <div className="p-8 text-center text-[color:var(--muted)]">加载中...</div>
  ) : logs.length === 0 ? (
  <div className="p-8 text-center text-[color:var(--muted)]">暂无日志记录</div>
  ) : (
  logs.map(log => (
  <div key={log.id} className="p-4 hover:bg-[color:var(--panel-2)] transition-colors">
  <div className="flex items-start gap-3">
  {/* 操作图标 */}
  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
  log.action === 'create' ? 'bg-success-100 text-success-600' :
  log.action === 'delete' ? 'bg-danger-100 text-danger-600' :
  log.action === 'update' ? 'bg-warning-100 text-warning-600' :
  'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
  }`}>
  {log.action === 'create' ? '+' :
  log.action === 'delete' ? '×' :
  log.action === 'update' ? '~' :
  log.action === 'export' ? '↓' :
  log.action === 'import' ? '↑' : '•'}
  </div>

  {/* 内容 */}
  <div className="flex-1 min-w-0">
  <div className="flex items-center gap-2 flex-wrap">
  <span className="font-medium text-[color:var(--fg)]">{log.description}</span>
  <span className={`px-1.5 py-0.5 rounded text-xs ${LEVEL_COLORS[log.level]}`}>
  {log.level === 'info' ? '信息' : log.level === 'warning' ? '警告' : '错误'}
  </span>
  </div>
  <div className="mt-1 text-xs text-[color:var(--muted)] flex items-center gap-3 flex-wrap">
  <span className="font-mono tabular-nums">{formatTime(log.timestamp)}</span>
  <span>用户: {log.username}</span>
  <span>{RESOURCE_LABELS[log.resource] || log.resource}</span>
  {log.resourceId && <span>ID: {log.resourceId}</span>}
  </div>
  </div>
  </div>
  </div>
  ))
  )}
  </div>

  {/* 分页 */}
  {totalPages > 1 && (
  <div className="p-4 border-t border-[color:var(--border)] flex items-center justify-between">
  <div className="text-sm text-[color:var(--muted)]">
  第 {query.page} / {totalPages} 页
  </div>
  <div className="flex gap-2">
  <button
  onClick={() => handlePageChange(Math.max(1, (query.page || 1) - 1))}
  disabled={query.page === 1}
  className="px-3 py-1 border border-[color:var(--border)] rounded text-sm disabled:opacity-50"
  >
  上一页
  </button>
  <button
  onClick={() => handlePageChange(Math.min(totalPages, (query.page || 1) + 1))}
  disabled={query.page === totalPages}
  className="px-3 py-1 border border-[color:var(--border)] rounded text-sm disabled:opacity-50"
  >
  下一页
  </button>
  </div>
  </div>
  )}

  {/* 清理 */}
  <div className="p-4 border-t border-[color:var(--border)] bg-[color:var(--panel-2)] rounded-b-xl">
  <button
  onClick={handleClearOldLogs}
  className="text-sm text-[color:var(--muted)] hover:text-danger-600"
  >
  清理 90 天前的日志
  </button>
  </div>
  </Card>
  )
}

export default AuditLogViewer
