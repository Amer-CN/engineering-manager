import React, { useState, useEffect, useCallback } from 'react'
import {
// @ts-ignore TS6133: AuditLevel is declared but never read
  AuditLog, AuditAction, AuditLevel,
// @ts-ignore TS6133: getAuditStats is declared but never read
  queryAuditLogs, getAuditStats, exportAuditLogsToJson,
  exportAuditLogsToCsv, clearOldLogs, AuditStats
} from '@/utils/audit'
import { usePermission } from '@/hooks/usePermission'
import { useAuditLogFilters } from '@/hooks/useAuditLogFilters'
import { Icon } from './ui/Icon'
import { AuditStatsPanel } from './AuditStatsPanel'
import { AuditFilterBar } from './AuditFilterBar'
import { AuditDetailModal } from './AuditDetailModal'

const PAGE_SIZE = 20

const actionConfig: Record<AuditAction, { label: string; color: string; bgColor: string }> = {
  create: { label: '创建', color: 'text-green-700', bgColor: 'bg-green-100' },
  read: { label: '查看', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  update: { label: '更新', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  delete: { label: '删除', color: 'text-red-700', bgColor: 'bg-red-100' },
  export: { label: '导出', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  import: { label: '导入', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  login: { label: '登录', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  logout: { label: '登出', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  approve: { label: '审批', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  lock: { label: '锁定', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  unlock: { label: '解锁', color: 'text-slate-700', bgColor: 'bg-slate-100' },
}

const resourceLabels: Record<string, string> = {
  projects: '项目', members: '人员', materials: '材料',
  expenses: '费用', costLedger: '成本台账', incomeContracts: '收入合同',
  expenseContracts: '支出合同', partners: '合作单位', invoices: '发票',
  payments: '收款记录', settlements: '结算单', drawings: '图纸', workerTeams: '班组',
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return { date: date.toLocaleDateString('zh-CN'), time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
}

interface AuditLogsProps { refresh?: () => void; embedded?: boolean }

export const AuditLogsContent: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const { can } = usePermission()
  const f = useAuditLogFilters()
  const [pagedData, setPagedData] = useState({ logs: [] as AuditLog[], total: 0, totalPages: 1 })
  const [statsView, setStatsView] = useState<{ data: AuditStats | null; visible: boolean }>({ data: null, visible: false })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const loadLogs = useCallback(async () => {
    const result = await queryAuditLogs({ ...f.filterParams, page: f.page, pageSize: PAGE_SIZE })
    setPagedData({ logs: result.items, total: result.total, totalPages: result.totalPages })
  }, [f.page, f.filterParams])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleSearch = () => { f.setPage(1); loadLogs() }

// @ts-ignore TS6133: handleExport is declared but never read
  const handleExport = async (format: 'json' | 'csv') => {
    if (!can('audit_logs:export')) { alert('您没有导出权限'); return }
    if (format === 'json') await exportAuditLogsToJson(f.filterParams)
    else await exportAuditLogsToCsv(f.filterParams)
  }

// @ts-ignore TS6133: handleClearOld is declared but never read
  const handleClearOld = async () => {
    if (!confirm('确定要清理90天前的日志吗？此操作不可恢复。')) return
    const removed = await clearOldLogs(90)
    alert(`已清理 ${removed} 条旧日志`)
    loadLogs()
  }

  const { logs, total, totalPages } = pagedData
  const { page } = f

  return (
    <>
      {statsView.visible && statsView.data && (
        <AuditStatsPanel statsData={statsView.data} onClose={() => setStatsView(prev => ({ ...prev, visible: false }))} actionConfig={actionConfig} />
      )}

      <AuditFilterBar
        startDate={f.startDate} endDate={f.endDate} filterAction={f.filterAction}
        filterResource={f.filterResource} filterLevel={f.filterLevel} keyword={f.keyword}
        total={total}
        onStartDateChange={v => f.set('startDate', v)} onEndDateChange={v => f.set('endDate', v)}
        onFilterActionChange={v => f.set('filterAction', v)} onFilterResourceChange={v => f.set('filterResource', v)}
        onFilterLevelChange={v => f.set('filterLevel', v)} onKeywordChange={v => f.set('keyword', v)}
        onSearch={handleSearch} onReset={f.reset} resourceLabels={resourceLabels}
      />

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="ClipboardList" size={44} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无操作日志</h3>
            <p className="text-slate-500">系统还未记录任何操作，或当前筛选条件下无数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">资源</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">描述</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">级别</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => {
                    const { date, time } = formatTimestamp(log.timestamp)
                    const action = actionConfig[log.action] || { label: log.action, color: 'text-slate-700', bgColor: 'bg-slate-100' }
                    return (
                      <tr key={log.id} className="table-row-hover">
                        <td className="px-4 py-3"><div className="text-sm text-slate-800">{date}</div><div className="text-xs text-slate-400">{time}</div></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">{log.username.charAt(0).toUpperCase()}</div><span className="text-sm text-slate-700">{log.username}</span></div>
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.bgColor} ${action.color}`}>{action.label}</span></td>
                        <td className="px-4 py-3 text-sm text-slate-600">{resourceLabels[log.resource] || log.resource}{log.resourceName && <div className="text-xs text-slate-400">{log.resourceName}</div>}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 max-w-xs truncate">{log.description}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${log.level === 'error' ? 'bg-red-100 text-red-700' : log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                            {log.level === 'error' ? '错误' : log.level === 'warning' ? '警告' : '信息'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center"><button onClick={() => setSelectedLog(log)} className="btn btn-ghost btn-sm text-primary-600">详情</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500">第 <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span> 页</div>
              <div className="flex items-center gap-2">
                <button onClick={() => f.setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return <button key={pageNum} onClick={() => f.setPage(pageNum)} className={`btn btn-sm ${pageNum === page ? 'btn-primary' : 'btn-ghost text-slate-700'}`}>{pageNum}</button>
                })}
                <button onClick={() => f.setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedLog && <AuditDetailModal selectedLog={selectedLog} onClose={() => setSelectedLog(null)} actionConfig={actionConfig} resourceLabels={resourceLabels} />}
    </>
  )
}

const AuditLogs: React.FC<AuditLogsProps> = ({ refresh }) => (
  <div className="max-w-[1400px] mx-auto p-6">
    <div className="flex items-center justify-between mb-6">
      <div><h1 className="text-2xl font-bold text-slate-800">操作日志</h1><p className="text-slate-500 dark:text-slate-400 mt-1">查看系统所有操作记录，追踪谁在什么时间做了什么</p></div>
    </div>
    <AuditLogsContent refresh={refresh} />
  </div>
)

export default AuditLogs
