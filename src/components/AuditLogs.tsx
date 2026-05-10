import React, { useState, useEffect, useCallback } from 'react'
import { 
  AuditLog, 
  AuditAction, 
  AuditLevel, 
  queryAuditLogs, 
  getAuditStats,
  exportAuditLogsToJson,
  exportAuditLogsToCsv,
  clearOldLogs,
  AuditStats
} from '../utils/audit'
import { formatMoney } from '../utils/format'
import { usePermission } from '../hooks/usePermission'
import { Icon } from './ui/Icon'

// 操作类型标签配置
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

// 资源类型中文映射
const resourceLabels: Record<string, string> = {
  projects: '项目',
  members: '人员',
  tasks: '任务',
  materials: '材料',
  expenses: '费用',
  costLedger: '成本台账',
  incomeContracts: '收入合同',
  expenseContracts: '支出合同',
  partners: '合作单位',
  invoices: '发票',
  payments: '收款记录',
  settlements: '结算单',
  drawings: '图纸',
  workerTeams: '班组',
}

// 格式化时间戳
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return {
    date: date.toLocaleDateString('zh-CN'),
    time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
}

interface AuditLogsProps {
  refresh?: () => void
  embedded?: boolean
}

export const AuditLogsContent: React.FC<{ refresh?: () => void }> = ({ refresh }) => {
  const { can } = usePermission()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  
  // 筛选条件
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('')
  const [filterResource, setFilterResource] = useState('')
  const [filterLevel, setFilterLevel] = useState<AuditLevel | ''>('')
  const [keyword, setKeyword] = useState('')
  
  // 统计
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [showStats, setShowStats] = useState(false)
  
  // 详情模态框
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // 加载日志
  const loadLogs = useCallback(async () => {
    const result = await queryAuditLogs({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      action: filterAction || undefined,
      resource: filterResource || undefined,
      level: filterLevel || undefined,
      keyword: keyword || undefined,
      page,
      pageSize,
    })

    setLogs(result.items)
    setTotal(result.total)
    setTotalPages(result.totalPages)
  }, [startDate, endDate, filterAction, filterResource, filterLevel, keyword, page, pageSize])

  // 加载统计
  const loadStats = async () => {
    const statsData = await getAuditStats(30) // 近30天统计
    setStats(statsData)
    setShowStats(true)
  }

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    loadLogs()
  }

  // 重置筛选
  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setFilterAction('')
    setFilterResource('')
    setFilterLevel('')
    setKeyword('')
    setPage(1)
  }

  // 导出
  const handleExport = async (format: 'json' | 'csv') => {
    if (!can('audit_logs:export')) {
      alert('您没有导出权限')
      return
    }

    if (format === 'json') {
      await exportAuditLogsToJson({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        action: filterAction || undefined,
        resource: filterResource || undefined,
      })
    } else {
      await exportAuditLogsToCsv({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        action: filterAction || undefined,
        resource: filterResource || undefined,
      })
    }
  }

  // 清理旧日志
  const handleClearOld = async () => {
    if (!confirm('确定要清理90天前的日志吗？此操作不可恢复。')) return

    const removed = await clearOldLogs(90)
    alert(`已清理 ${removed} 条旧日志`)
    loadLogs()
  }

  // 查看详情
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log)
  }

  // 字段名→中文标签映射（按资源类型）
  const getFieldLabel = (resource: string, field: string): string => {
    const commonFields: Record<string, string> = {
      name: '名称', status: '状态', remarks: '备注', amount: '金额',
      projectId: '关联项目', partnerId: '关联单位', contractNo: '合同编号',
      signedDate: '签订日期', startDate: '开始日期', endDate: '结束日期',
      paymentMethod: '付款方式', fileUrl: '附件',
    }
    const resourceFields: Record<string, Record<string, string>> = {
      projects: { description: '描述', budget: '预算', projectManagerId: '项目经理' },
      members: { phone: '电话', idNumber: '身份证号', position: '职位', entryDate: '入职时间', actualLeaveDate: '离职日期', memberType: '人员类型' },
      incomeContracts: { partnerLabel: '甲方' },
      expenseContracts: { partnerLabel: '乙方' },
      invoices: { invoiceNo: '发票号码', taxAmount: '税额', kind: '发票类型', invoiceDate: '开票日期' },
      payments: { recordDate: '日期', type: '类型', receivedAmount: '已收金额', contractId: '关联合同', invoiceId: '关联发票' },
      tasks: { priority: '优先级', assigneeId: '负责人', dueDate: '截止日期' },
      expenses: { category: '类别', expenseDate: '日期', projectId: '关联项目' },
      costLedger: { direction: '方向', amount: '金额', category: '分类', date: '日期', counterparty: '对方', channel: '支付渠道', summary: '摘要', projectId: '关联项目' },
    }
    return resourceFields[resource]?.[field] || commonFields[field] || field
  }

  // 格式化单个值为可读文本
  const formatFieldValue = (resource: string, field: string, value: any): string => {
    if (value === undefined || value === null) return '（空）'
    if (typeof value === 'boolean') return value ? '是' : '否'
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `[${value.length} 项]`
      return JSON.stringify(value)
    }
    // 金额字段格式化
    if (field === 'amount' || field === 'budget' || field === 'taxAmount' || field === 'receivedAmount') {
      const num = Number(value)
      if (!isNaN(num)) return `¥${formatMoney(num)}`
    }
    // 状态值翻译
    if (field === 'status') {
      const statusMap: Record<string, string> = {
        active: '进行中', draft: '草稿', pending: '待审批', expired: '已到期',
        terminated: '已终止', archived: '已归档', completed: '已完成',
        paid: '已付清', unpaid: '未付', partially_paid: '部分付款',
        received: '已收齐', issued: '已开具', cancelled: '已作废',
      }
      if (statusMap[String(value)]) return statusMap[String(value)]
    }
    return String(value)
  }

  // 渲染详情信息（人可读格式）
  const renderDetail = (log: AuditLog) => {
    const details = log.details
    if (!details) return <p className="text-slate-500 text-sm">无详细信息</p>

    // 导出/删除等没有 before/after 的操作
    if (details.count !== undefined && !details.before && !details.after) {
      return (
        <div className="space-y-2">
          {details.count !== undefined && (
            <div className="text-sm text-slate-600">数量：<span className="font-medium">{details.count}</span> 条</div>
          )}
          {details.reason && <div className="text-sm text-slate-600">原因：{details.reason}</div>}
        </div>
      )
    }

    // 审批操作
    if (details.approved !== undefined) {
      return (
        <div className="space-y-2">
          <div className="text-sm text-slate-600">
            审批结果：<span className={`font-medium ${details.approved ? 'text-green-600' : 'text-red-600'}`}>{details.approved ? '通过' : '驳回'}</span>
          </div>
          {details.reason && <div className="text-sm text-slate-600">原因：{details.reason}</div>}
        </div>
      )
    }

    // 更新操作：before/after 对比
    if (details.before && details.after) {
      const allFields = Array.from(new Set([...Object.keys(details.before), ...Object.keys(details.after)]))
      const changedFields = allFields.filter(f => {
        const b = details.before[f]
        const a = details.after[f]
        return JSON.stringify(b) !== JSON.stringify(a)
      })

      if (changedFields.length === 0) {
        return <p className="text-sm text-slate-500">无字段变更</p>
      }

      return (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-24">字段</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">修改前</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">修改后</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changedFields.map(field => (
                <tr key={field}>
                  <td className="px-3 py-2 text-xs font-medium text-slate-600">{getFieldLabel(log.resource, field)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 line-through">{formatFieldValue(log.resource, field, details.before[field])}</td>
                  <td className="px-3 py-2 text-xs text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.after[field])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // 创建操作：仅 after
    if (details.after && !details.before) {
      const fields = Object.keys(details.after).filter(k => k !== 'fileUrl' || (typeof details.after[k] === 'string' && details.after[k].length < 100))
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600">创建内容</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {fields.slice(0, 12).map(field => (
              <div key={field} className="flex justify-between text-sm">
                <span className="text-slate-500">{getFieldLabel(log.resource, field)}</span>
                <span className="text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.after[field])}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // 删除操作：仅 before
    if (details.before && !details.after) {
      const fields = Object.keys(details.before).filter(k => k !== 'fileUrl' || (typeof details.before[k] === 'string' && details.before[k].length < 100))
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600">已删除内容</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {fields.slice(0, 12).map(field => (
              <div key={field} className="flex justify-between text-sm">
                <span className="text-slate-500">{getFieldLabel(log.resource, field)}</span>
                <span className="text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.before[field])}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return <p className="text-sm text-slate-500">无详细信息</p>
  }

  return (
    <>
      {/* 统计面板 */}
      {showStats && stats && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">近30天操作统计</h3>
            <button
              onClick={() => setShowStats(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">总操作数</div>
              <div className="text-2xl font-bold text-blue-700">{stats.totalCount}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">今日操作</div>
              <div className="text-2xl font-bold text-green-700">{stats.todayCount}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 mb-1">创建操作</div>
              <div className="text-2xl font-bold text-purple-700">{stats.actionCounts.create || 0}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600 mb-1">删除操作</div>
              <div className="text-2xl font-bold text-orange-700">{stats.actionCounts.delete || 0}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">操作类型分布</h4>
              <div className="space-y-2">
                {Object.entries(stats.actionCounts)
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{actionConfig[action as AuditAction]?.label || action}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                }
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">活跃用户TOP5</h4>
              <div className="space-y-2">
                {stats.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-slate-100 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-slate-600">{user.username}</span>
                    </div>
                    <span className="font-medium">{user.count} 次</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选器 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">操作类型</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as AuditAction | '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部</option>
              <option value="create">创建</option>
              <option value="update">更新</option>
              <option value="delete">删除</option>
              <option value="export">导出</option>
              <option value="import">导入</option>
              <option value="approve">审批</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">资源类型</label>
            <select
              value={filterResource}
              onChange={e => setFilterResource(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部</option>
              {Object.entries(resourceLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">日志级别</label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value as AuditLevel | '')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部</option>
              <option value="info">信息</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">关键词搜索</label>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索用户、描述..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            共找到 <span className="font-medium text-slate-700">{total}</span> 条记录
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              重置
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* 日志列表 */}
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
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">操作</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">资源</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">描述</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">级别</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => {
                    const { date, time } = formatTimestamp(log.timestamp)
                    const action = actionConfig[log.action] || { label: log.action, color: 'text-slate-700', bgColor: 'bg-slate-100' }
                    const resourceLabel = resourceLabels[log.resource] || log.resource
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-800">{date}</div>
                          <div className="text-xs text-slate-400">{time}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                              {log.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700">{log.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.bgColor} ${action.color}`}>
                            {action.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {resourceLabel}
                          {log.resourceName && (
                            <div className="text-xs text-slate-400">{log.resourceName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 max-w-xs truncate">
                          {log.description}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.level === 'error' ? 'bg-red-100 text-red-700' :
                            log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.level === 'error' ? '错误' : log.level === 'warning' ? '警告' : '信息'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewDetail(log)}
                            className="px-3 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                          >
                            详情
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                第 <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span> 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded ${
                        pageNum === page
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 详情模态框 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">操作日志详情</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">时间</label>
                  <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                    {new Date(selectedLog.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">用户</label>
                  <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.username}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">操作类型</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      actionConfig[selectedLog.action]?.bgColor || 'bg-slate-100'
                    } ${actionConfig[selectedLog.action]?.color || 'text-slate-700'}`}>
                      {actionConfig[selectedLog.action]?.label || selectedLog.action}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">资源类型</label>
                  <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                    {resourceLabels[selectedLog.resource] || selectedLog.resource}
                  </div>
                </div>
                {selectedLog.resourceName && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500">资源名称</label>
                    <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.resourceName}</div>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500">描述</label>
                  <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.description}</div>
                </div>
              </div>
              
              {/* 详细信息 */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">详细信息</label>
                {renderDetail(selectedLog)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const AuditLogs: React.FC<AuditLogsProps> = ({ refresh }) => {
  return (
    <div className="max-w-[1400px] mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">操作日志</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">查看系统所有操作记录，追踪谁在什么时间做了什么</p>
        </div>
      </div>
      <AuditLogsContent refresh={refresh} />
    </div>
  )
}

export default AuditLogs
