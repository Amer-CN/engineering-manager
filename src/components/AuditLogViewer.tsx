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
  AuditAction,
  AuditLevel,
} from '../utils/audit'

// 操作类型映射
const ACTION_LABELS: Record<AuditAction, string> = {
  create: '创建',
  read: '查看',
  update: '更新',
  delete: '删除',
  export: '导出',
  import: '导入',
  login: '登录',
  logout: '退出',
  approve: '审批',
  lock: '锁定',
  unlock: '解锁',
}

// 级别映射
const LEVEL_COLORS: Record<AuditLevel, string> = {
  info: 'text-blue-600 bg-blue-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
}

// 资源标签映射
const RESOURCE_LABELS: Record<string, string> = {
  projects: '项目',
  partners: '合作单位',
  members: '员工',
  contracts: '合同',
  invoices: '发票',
  settlements: '结算',
  inventory: '库存',
  settings: '设置',
}

interface AuditLogViewerProps {
  /** 最大显示条数 */
  maxVisible?: number
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ maxVisible = 100 }) => {
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
    if (confirm('确定要清理 90 天前的日志吗？')) {
      const removed = await clearOldLogs(90)
      alert(`已清理 ${removed} 条旧日志`)
      loadLogs()
      loadStats()
    }
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
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200">
      {/* 头部统计 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border-b border-slate-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{stats.totalCount}</div>
            <div className="text-xs text-slate-500">总记录</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.todayCount}</div>
            <div className="text-xs text-slate-500">今日</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(stats.actionCounts).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-slate-500">本周操作</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.topUsers.length}</div>
            <div className="text-xs text-slate-500">活跃用户</div>
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="p-4 border-b border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="搜索关键词..."
            value={query.keyword || ''}
            onChange={e => setQuery({ ...query, keyword: e.target.value || undefined })}
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          
          <select
            value={query.action || ''}
            onChange={e => setQuery({ ...query, action: (e.target.value || undefined) as AuditAction })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">全部操作</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={query.resource || ''}
            onChange={e => setQuery({ ...query, resource: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">全部资源</option>
            {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <button
            type="submit"
            className="btn btn-primary text-sm"
          >
            搜索
          </button>

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              导出 CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              导出 JSON
            </button>
          </div>
        </form>
      </div>

      {/* 日志列表 */}
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">暂无日志记录</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                {/* 操作图标 */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  log.action === 'create' ? 'bg-green-100 text-green-600' :
                  log.action === 'delete' ? 'bg-red-100 text-red-600' :
                  log.action === 'update' ? 'bg-blue-100 text-blue-600' :
                  'bg-slate-100 text-slate-600'
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
                    <span className="font-medium text-slate-800">{log.description}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${LEVEL_COLORS[log.level]}`}>
                      {log.level === 'info' ? '信息' : log.level === 'warning' ? '警告' : '错误'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                    <span>{formatTime(log.timestamp)}</span>
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            第 {query.page} / {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, (query.page || 1) - 1))}
              disabled={query.page === 1}
              className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, (query.page || 1) + 1))}
              disabled={query.page === totalPages}
              className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 清理 */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 rounded-b-xl">
        <button
          onClick={handleClearOldLogs}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-600"
        >
          清理 90 天前的日志
        </button>
      </div>
    </div>
  )
}

export default AuditLogViewer
