import React, { useState, useEffect, useCallback } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import {
  AuditLog, AuditAction,
  queryAuditLogs, AuditStats
} from '@/utils/audit'
import { useAuditLogFilters } from '@/hooks/useAuditLogFilters'
import { Icon } from './ui/Icon'
import { Card } from './ui/Card'
import { StatusBadge, AUDIT_LEVEL } from '@/constants/status'
import { AuditStatsPanel } from './AuditStatsPanel'
import { AuditFilterBar } from './AuditFilterBar'
import { AuditDetailModal } from './AuditDetailModal'
import { Button } from './ui/Button'

const PAGE_SIZE = 20

const actionConfig: Record<AuditAction, { label: string; color: string; bgColor: string }> = {
  create: { label: '创建', color: 'text-green-700', bgColor: 'bg-green-100' },
  read: { label: '查看', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  update: { label: '更新', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  delete: { label: '删除', color: 'text-red-700', bgColor: 'bg-red-100' },
  export: { label: '导出', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  import: { label: '导入', color: 'text-primary-700', bgColor: 'bg-primary-100' },
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

  const { logs, total, totalPages } = pagedData
  const { page } = f

  // ── DataTable 列定义 ──
  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp', title: '时间',
      render: (log) => {
        const { date, time } = formatTimestamp(log.timestamp)
        return (
          <div>
            <div className="text-sm text-slate-800">{date}</div>
            <div className="text-xs text-slate-400">{time}</div>
          </div>
        )
      }
    },
    {
      key: 'username', title: '用户',
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">{(log.username || '?').charAt(0).toUpperCase()}</div>
          <span className="text-sm text-slate-700">{log.username || '-'}</span>
        </div>
      )
    },
    {
      key: 'action', title: '操作',
      render: (log) => {
        const action = actionConfig[log.action] || { label: log.action, color: 'text-slate-700', bgColor: 'bg-slate-100' }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.bgColor} ${action.color}`}>{action.label}</span>
        )
      }
    },
    {
      key: 'resource', title: '资源',
      render: (log) => (
        <span className="text-slate-600">
          {resourceLabels[log.resource] || log.resource}
          {log.resourceName && <div className="text-xs text-slate-400">{log.resourceName}</div>}
        </span>
      )
    },
    {
      key: 'description', title: '描述',
      render: (log) => (
        <span className="text-sm text-slate-700 max-w-xs truncate block">{log.description}</span>
      )
    },
    {
      key: 'level', title: '级别', align: 'center',
      render: (log) => (
        <StatusBadge status={log.level} config={AUDIT_LEVEL} />
      )
    },
    {
      key: 'detail', title: '操作', align: 'center',
      render: (log) => (
        <Button onClick={() => setSelectedLog(log)}  variant="ghost" size="sm" className="text-primary-600">详情</Button>
      )
    },
  ]

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

  {logs.length === 0 ? (
  <Card bordered={false} className="overflow-hidden p-12 text-center">
  <Icon name="ClipboardList" size={44} className="text-slate-300 mb-4" />
  <h3 className="text-lg font-medium text-slate-800 mb-2">暂无操作日志</h3>
  <p className="text-slate-500">系统还未记录任何操作，或当前筛选条件下无数据</p>
  </Card>
  ) : (
  <>
  <DataTable
    data={logs}
    columns={columns}
    rowKey="id"
    pagination={false}
    useHoverScrollbar={true}
    scrollClassName="h-full"
    emptyText="暂无操作日志"
    emptyIcon="ClipboardList"
  />

  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
  <div className="text-sm text-slate-500">第 <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span> 页</div>
  <div className="flex items-center gap-2">
  <Button onClick={() => f.setPage(Math.max(1, page - 1))} disabled={page <= 1}  variant="secondary" size="sm" className="disabled:opacity-50 disabled:cursor-not-allowed">上一页</Button>
  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
  return <Button key={pageNum} onClick={() => f.setPage(pageNum)} variant={pageNum === page ? 'primary' : 'ghost'} size="sm" className={pageNum === page ? undefined : 'text-slate-700'}>{pageNum}</Button>
  })}
  <Button onClick={() => f.setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}  variant="secondary" size="sm" className="disabled:opacity-50 disabled:cursor-not-allowed">下一页</Button>
  </div>
  </div>
  </>
  )}

  {selectedLog && <AuditDetailModal selectedLog={selectedLog} onClose={() => setSelectedLog(null)} actionConfig={actionConfig} resourceLabels={resourceLabels} />}
  </>
  )
}

const AuditLogs: React.FC<AuditLogsProps> = ({ refresh }) => (
  <div className="max-w-[1400px] mx-auto p-6">
  <div className="flex items-center justify-between mb-6">
  <div><h1 className="text-2xl font-bold text-slate-800">操作日志</h1><p className="text-slate-500 mt-1">查看系统所有操作记录，追踪谁在什么时间做了什么</p></div>
  </div>
  <AuditLogsContent refresh={refresh} />
  </div>
)

export default AuditLogs
