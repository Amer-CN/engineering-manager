import { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { useWagePaymentRecords } from '@/hooks/useWagePaymentRecords'
import { Icon } from '../../ui/Icon'
import PageHeader from '../../ui/PageHeader'
import PageContainer from '@/components/ui/PageContainer'
import { getAPI } from '@/services/api-adapter'

interface PaymentRecordFilters {
  projectId?: number
  yearMonth?: string
  status?: string
}

interface PaymentRow {
  id: number | string
  projectName: string
  yearMonth: string
  workerName: string
  workerPhone?: string
  actualWage?: number
  paidAmount?: number
  paymentStatus?: string
  paidDate?: string
  overdueDays?: number
  bankReceiptPath?: string
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
    getAPI().then(api => api.getProjects()).then(res => {
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

  const showPhone = viewMode === 'overdue'

  const baseColumns: Column<PaymentRow>[] = [
    { key: 'projectName', title: '项目名', render: (item) => <span className="text-[color:var(--fg-2)]">{item.projectName || '-'}</span> },
    { key: 'yearMonth', title: '月份', render: (item) => <span className="text-[color:var(--fg-2)]">{item.yearMonth || '-'}</span> },
    { key: 'workerName', title: '工人姓名', sortable: true, filterable: true,
      sorter: (a, b) => (a.workerName || '').localeCompare(b.workerName || '', 'zh-CN'),
      render: (item) => <span className="text-[color:var(--fg-2)] font-medium">{item.workerName || '-'}</span> },
  ]

  const phoneColumn: Column<PaymentRow> = { key: 'workerPhone', title: '联系电话', render: (item) => <span className="text-[color:var(--fg-2)]">{item.workerPhone || '-'}</span> }

  const tailColumns: Column<PaymentRow>[] = [
    { key: 'actualWage', title: '应发金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.actualWage || 0) - (b.actualWage || 0)),
      render: (item) => <span className="text-[color:var(--fg-2)]">{item.actualWage?.toFixed(2) || '0.00'}</span> },
    { key: 'paidAmount', title: '实发金额', align: 'right', sortable: true,
      sorter: (a, b) => ((a.paidAmount || 0) - (b.paidAmount || 0)),
      render: (item) => <span className="text-[color:var(--fg-2)]">{item.paidAmount?.toFixed(2) || '0.00'}</span> },
    { key: 'paymentStatus', title: '发放状态',
      filterable: 'select',
      filterOptions: [
        { label: '已发清', value: '已发清' },
        { label: '部分发放', value: '部分发放' },
        { label: '逾期', value: '逾期' },
        { label: '未发放', value: '未发放' }
      ],
      filterAccessor: (item: PaymentRow) => item.paymentStatus || '',
      render: (item) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        item.paymentStatus === '已发清' ? 'bg-success-100 text-success-700' :
        item.paymentStatus === '部分发放' ? 'bg-warning-100 text-warning-700' :
        item.paymentStatus === '逾期' ? 'bg-danger-100 text-danger-700' :
        'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
      }`}>
        {item.paymentStatus || '-'}
      </span>
    )},
    { key: 'paidDate', title: '发放日期', render: (item) => <span className="text-[color:var(--fg-2)]">{item.paidDate || '-'}</span> },
  ]

  const overdueColumn: Column<PaymentRow> = { key: 'overdueDays', title: '逾期天数', align: 'right', render: (item) => <span className="text-danger-600 font-medium">{item.overdueDays || 0}</span> }

  const receiptColumn: Column<PaymentRow> = { key: 'bankReceiptPath', title: '银行回单', render: (item) => (
    item.bankReceiptPath ? (
      <button
        onClick={async () => (await getAPI()).openExternalFile({
          category: 'bank_receipts',
          subCategory: '',
          fileName: item.bankReceiptPath!,
          projectName: undefined,
        })}
        className="text-[color:var(--accent)] hover:opacity-80 text-xs"
      >
        查看
      </button>
    ) : <span>-</span>
  )}

  const columns: Column<PaymentRow>[] = [
    ...baseColumns,
    ...(showPhone ? [phoneColumn] : []),
    ...tailColumns,
    ...(viewMode === 'overdue' ? [overdueColumn] : []),
    receiptColumn,
  ]

  const renderFilters = () => (
    <div className="bg-[color:var(--card)] p-4 rounded-lg border border-[color:var(--border)] mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-[color:var(--fg-2)]">项目：</label>
        <select
          value={filters.projectId || ''}
          onChange={e => handleFilterChange('projectId', e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-sm border border-[color:var(--border)] rounded-lg"
        >
          <option value="">全部</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-[color:var(--fg-2)]">月份：</label>
        <input
          type="month"
          value={filters.yearMonth || ''}
          onChange={e => handleFilterChange('yearMonth', e.target.value || undefined)}
          className="px-3 py-1.5 text-sm border border-[color:var(--border)] rounded-lg"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-[color:var(--fg-2)]">状态：</label>
        <select
          value={filters.status || '全部'}
          onChange={e => handleFilterChange('status', e.target.value === '全部' ? undefined : e.target.value)}
          className="px-3 py-1.5 text-sm border border-[color:var(--border)] rounded-lg"
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
        className="px-3 py-1.5 text-sm text-[color:var(--fg-2)] border border-[color:var(--border)] rounded-lg hover:bg-[color:var(--panel-2)]"
      >
        重置筛选
      </button>

      <div className="ml-auto">
        <button
          onClick={exportToExcel}
          className="px-4 py-1.5 text-sm font-medium text-[color:var(--on-accent)] bg-[color:var(--accent)] rounded-lg hover:opacity-90 flex items-center gap-1"
        >
          <Icon name="Download" size={14} />
          导出 Excel
        </button>
      </div>
    </div>
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="工资发放记录"
        actions={<>
          <button onClick={() => { setViewMode('all'); loadPaymentRecords() }}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${viewMode === 'all' ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--card)] text-[color:var(--fg-2)] border border-[color:var(--border)]'}`}>
            全部记录
          </button>
          <button onClick={handleViewOverdue}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${viewMode === 'overdue' ? 'bg-danger-600 text-white' : 'bg-[color:var(--card)] text-[color:var(--fg-2)] border border-[color:var(--border)]'}`}>
            欠薪列表
          </button>
        </>}
      />

      {/* 欠薪预警横幅 */}
      {viewMode === 'all' && overdueStats && (
        <div className="bg-danger-50 border border-danger-200 text-danger-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">
              欠薪预警：涉及 {overdueStats.overdueWorkerCount} 名工人，
              共计 {overdueStats.totalOverdueAmount.toFixed(2)} 元，
              最长逾期 {overdueStats.maxOverdueDays} 天
            </span>
          </div>
          <button
            onClick={handleViewOverdue}
            className="px-3 py-1 text-sm font-medium text-white bg-danger-600 rounded hover:bg-danger-700"
          >
            查看详情
          </button>
        </div>
      )}

      {/* 筛选栏 */}
      {viewMode === 'all' && renderFilters()}

      {/* 数据表格 */}
      <DataTable
        data={(viewMode === 'all' ? records : overdueList) as PaymentRow[]}
        columns={columns}
        rowKey="id"
        pagination={false}
        showContainer={true}
        stickyHeader={true}
        loading={loading}
        emptyText="暂无数据"
        emptyIcon="Receipt"
      />
    </PageContainer>
  )
}
