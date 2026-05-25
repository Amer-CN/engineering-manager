import { useState, useEffect } from 'react'
import { useWagePaymentRecords } from '@/hooks/useWagePaymentRecords'
import { Icon } from '../../ui/Icon'

interface PaymentRecordFilters {
  projectId?: number
  yearMonth?: string
  status?: string
}

export default function WagePaymentRecords() {
  const {
    loading,
    records,
    overdueStats,
    overdueList,
    filters,
    applyFilters,
    loadPaymentRecords,
    loadOverdueList,
    exportToExcel,
  } = useWagePaymentRecords()

  const [viewMode, setViewMode] = useState<'all' | 'overdue'>('all')
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    window.electronAPI.getProjects().then(res => {
      if (res.success && res.data) {
        setProjects(res.data.filter((p: any) => p.status !== 'archived'))
      }
    }).catch(() => {})
  }, [])

  const handleFilterChange = (key: keyof PaymentRecordFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    applyFilters(newFilters)
  }

  const handleViewOverdue = () => {
    setViewMode('overdue')
    loadOverdueList()
  }

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">项目：</label>
        <select
          value={filters.projectId || ''}
          onChange={e => handleFilterChange('projectId', e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
        >
          <option value="">全部</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">月份：</label>
        <input
          type="month"
          value={filters.yearMonth || ''}
          onChange={e => handleFilterChange('yearMonth', e.target.value || undefined)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">状态：</label>
        <select
          value={filters.status || '全部'}
          onChange={e => handleFilterChange('status', e.target.value === '全部' ? undefined : e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
        >
          <option value="全部">全部</option>
          <option value="已发清">已发清</option>
          <option value="部分发放">部分发放</option>
          <option value="未发放">未发放</option>
          <option value="逾期">逾期</option>
        </select>
      </div>

      <button
        onClick={() => applyFilters({})}
        className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
      >
        重置筛选
      </button>

      <div className="ml-auto">
        <button
          onClick={exportToExcel}
          className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-1"
        >
          <Icon name="Download" size={14} />
          导出 Excel
        </button>
      </div>
    </div>
  )

  const renderTable = (data: any[], showPhone: boolean = false) => (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-slate-600 font-medium">项目名</th>
            <th className="px-4 py-3 text-slate-600 font-medium">月份</th>
            <th className="px-4 py-3 text-slate-600 font-medium">工人姓名</th>
            {showPhone && <th className="px-4 py-3 text-slate-600 font-medium">联系电话</th>}
            <th className="px-4 py-3 text-slate-600 font-medium text-right">应发金额</th>
            <th className="px-4 py-3 text-slate-600 font-medium text-right">实发金额</th>
            <th className="px-4 py-3 text-slate-600 font-medium">发放状态</th>
            <th className="px-4 py-3 text-slate-600 font-medium">发放日期</th>
            {viewMode === 'overdue' && <th className="px-4 py-3 text-slate-600 font-medium text-right">逾期天数</th>}
            <th className="px-4 py-3 text-slate-600 font-medium">银行回单</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={showPhone ? 10 : 9} className="px-4 py-8 text-center text-slate-400">
                {loading ? '加载中...' : '暂无数据'}
              </td>
            </tr>
          ) : (
            data.map((record, idx) => (
              <tr key={record.id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{record.projectName || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{record.yearMonth || '-'}</td>
                <td className="px-4 py-3 text-slate-700 font-medium">{record.workerName || '-'}</td>
                {showPhone && <td className="px-4 py-3 text-slate-700">{record.workerPhone || '-'}</td>}
                <td className="px-4 py-3 text-slate-700 text-right">{record.actualWage?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3 text-slate-700 text-right">{record.paidAmount?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    record.paymentStatus === '已发清' ? 'bg-green-100 text-green-700' :
                    record.paymentStatus === '部分发放' ? 'bg-yellow-100 text-yellow-700' :
                    record.paymentStatus === '逾期' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {record.paymentStatus || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{record.paidDate || '-'}</td>
                {viewMode === 'overdue' && (
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{record.overdueDays || 0}</td>
                )}
                <td className="px-4 py-3">
                  {record.bankReceiptPath ? (
                    <button
                      onClick={() => window.electronAPI.openExternalFile({
                        category: 'bank_receipts',
                        subCategory: '',
                        fileName: record.bankReceiptPath,
                        projectName: undefined,
                      })}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      查看
                    </button>
                  ) : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">工资发放记录</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode('all'); loadPaymentRecords() }}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              viewMode === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            全部记录
          </button>
          <button
            onClick={handleViewOverdue}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              viewMode === 'overdue' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
            }`}
          >
            欠薪列表
          </button>
        </div>
      </div>

      {/* 欠薪预警横幅 */}
      {viewMode === 'all' && overdueStats && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              欠薪预警：涉及 {overdueStats.overdueWorkerCount} 名工人，
              共计 {overdueStats.totalOverdueAmount.toFixed(2)} 元，
              最长逾期 {overdueStats.maxOverdueDays} 天
            </span>
          </div>
          <button
            onClick={handleViewOverdue}
            className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            查看详情
          </button>
        </div>
      )}

      {/* 筛选栏 */}
      {viewMode === 'all' && renderFilters()}

      {/* 数据表格 */}
      {viewMode === 'all' && renderTable(records)}
      {viewMode === 'overdue' && renderTable(overdueList, true)}
    </div>
  )
}
