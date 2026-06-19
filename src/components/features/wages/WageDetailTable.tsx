import { DataTable, type Column } from '@/components/DataTable'

interface WageDetailTableProps {
  scopeData: any[]
  selectedIds: Set<number>
  scope: 'project' | 'all'
  paymentEdits: Map<number, { paidAmount: string; paidDate: string }>
  onToggleSelect: (id: number) => void
  onToggleAll: (ids: number[]) => void
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string) => void
}

export function WageDetailTable({
  scopeData, selectedIds, scope, paymentEdits,
  onToggleSelect, onToggleAll, onPaymentChange,
}: WageDetailTableProps) {
  function getEditPaidAmount(record: any) {
    const edit = paymentEdits.get(record.id)
    if (edit !== undefined) return edit.paidAmount
    return record.paidAmount != null ? String(record.paidAmount) : ''
  }

  function getEditPaidDate(record: any) {
    const edit = paymentEdits.get(record.id)
    return edit?.paidDate ?? record.paidDate ?? ''
  }

  // ── 动态列定义（根据 scope 决定是否显示项目列）──
  const columns: Column<any>[] = [
    {
      key: 'checkbox', title: '', width: '40px',
      render: (w) => (
        <input type="checkbox" checked={selectedIds.has(w.id)}
          onChange={() => onToggleSelect(w.id)} className="rounded" />
      )
    },
    { key: 'memberName', title: '姓名', render: (w) => <span className="font-medium">{w.memberName || '-'}</span> },
    { key: 'teamName', title: '班组', render: (w) => <span className="text-slate-500">{w.teamName || '-'}</span> },
    ...(scope === 'all' ? [{ key: 'projectName', title: '项目', render: (w: any) => <span className="text-slate-500">{(w as any).projectName || '-'}</span> }] : []),
    { key: 'yearMonth', title: '月份', render: (w) => <span className="text-slate-500">{w.yearMonth}</span> },
    { key: 'workDays', title: '出勤', render: (w) => <span>{w.workDays} 天</span> },
    { key: 'dailyWage', title: '日薪', render: (w) => <span>¥{w.dailyWage}/天</span> },
    {
      key: 'actualWage', title: '应发',
      render: (w) => {
        const actualWage = (w.dailyWage || 0) * (w.workDays || 0)
        return <span className="font-medium text-green-700">¥{actualWage.toFixed(2)}</span>
      }
    },
    {
      key: 'paidAmount', title: '实发金额',
      render: (w) => (
        <input type="text" inputMode="decimal" value={getEditPaidAmount(w)}
          placeholder="0.00"
          onChange={e => onPaymentChange(w.id, 'paidAmount', e.target.value)}
          disabled={!!w.paymentLocked}
          className={`w-24 px-2 py-1 border rounded text-center text-sm ${w.paymentLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
      )
    },
    {
      key: 'paidDate', title: '发放日期',
      render: (w) => (
        <div className="flex items-center gap-1">
          <input type="date" value={getEditPaidDate(w)}
            onChange={e => onPaymentChange(w.id, 'paidDate', e.target.value)}
            disabled={!!w.paymentLocked}
            className={`w-32 px-2 py-1 border rounded text-sm ${w.paymentLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
          {w.bankReceiptPath && (
            <span className="text-green-500 text-xs" title={`凭证: ${w.bankReceiptPath}`}>📎</span>
          )}
        </div>
      )
    },
    {
      key: 'diff', title: '差额',
      render: (w) => {
        const actualWage = (w.dailyWage || 0) * (w.workDays || 0)
        const paid = Number(getEditPaidAmount(w)) || 0
        const diff = actualWage - paid
        const diffColor = diff === 0 ? 'text-green-600' : diff > 0 ? 'text-amber-600' : 'text-red-500'
        const diffSign = diff > 0 ? '-' : diff < 0 ? '+' : ''
        return <span className={`font-medium ${diffColor}`}>{diffSign}¥{Math.abs(diff).toFixed(2)}</span>
      }
    },
  ]

  return (
    <div className="min-w-[900px]">
      <DataTable
        data={scopeData}
        columns={columns}
        rowKey="id"
        pagination={false}
        stickyHeader={true}
      />
    </div>
  )
}
