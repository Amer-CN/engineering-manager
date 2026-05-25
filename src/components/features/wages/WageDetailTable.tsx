import { WageDetailRow } from './WageDetailRow'

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
  const allSelected = scopeData.length > 0 && selectedIds.size === scopeData.length

  function getEditPaidAmount(record: any) {
    const edit = paymentEdits.get(record.id)
    if (edit !== undefined) return edit.paidAmount
    return record.paidAmount != null ? String(record.paidAmount) : ''
  }

  function getEditPaidDate(record: any) {
    const edit = paymentEdits.get(record.id)
    return edit?.paidDate ?? record.paidDate ?? ''
  }

  return (
    <div className="min-w-[900px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
          <tr className="text-left">
            <th className="px-3 py-3 w-10">
              <input type="checkbox" checked={allSelected}
                onChange={() => onToggleAll(scopeData.map(w => w.id))} className="rounded" />
            </th>
            <th className="px-3 py-3 font-medium text-slate-600">姓名</th>
            <th className="px-3 py-3 font-medium text-slate-600">班组</th>
            {scope === 'all' && <th className="px-3 py-3 font-medium text-slate-600">项目</th>}
            <th className="px-3 py-3 font-medium text-slate-600">月份</th>
            <th className="px-3 py-3 font-medium text-slate-600">出勤</th>
            <th className="px-3 py-3 font-medium text-slate-600">日薪</th>
            <th className="px-3 py-3 font-medium text-slate-600">应发</th>
            <th className="px-3 py-3 font-medium text-slate-600">实发金额</th>
            <th className="px-3 py-3 font-medium text-slate-600">发放日期</th>
            <th className="px-3 py-3 font-medium text-slate-600">差额</th>
          </tr>
        </thead>
        <tbody>
          {scopeData.map(w => (
            <WageDetailRow
              key={w.id}
              record={w}
              scope={scope}
              isSelected={selectedIds.has(w.id)}
              paidAmount={getEditPaidAmount(w)}
              paidDate={getEditPaidDate(w)}
              onToggleSelect={onToggleSelect}
              onPaymentChange={onPaymentChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
