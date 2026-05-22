import React from 'react'

interface WageDetailRowProps {
  record: any
  scope: 'project' | 'all'
  isSelected: boolean
  paidAmount: string
  paidDate: string
  onToggleSelect: (id: number) => void
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string) => void
}

export const WageDetailRow = React.memo(function WageDetailRow({
  record, scope, isSelected, paidAmount, paidDate,
  onToggleSelect, onPaymentChange,
}: WageDetailRowProps) {
  const actualWage = (record.dailyWage || 0) * (record.workDays || 0)
  const paid = Number(paidAmount) || 0
  const diff = actualWage - paid
  const diffColor = diff === 0 ? 'text-green-600' : diff > 0 ? 'text-amber-600' : 'text-red-500'
  const diffSign = diff > 0 ? '-' : diff < 0 ? '+' : ''

  return (
    <tr className="border-t border-slate-100 table-row-hover">
      <td className="px-3 py-3">
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(record.id)} className="rounded" />
      </td>
      <td className="px-3 py-3 font-medium">{record.memberName || '-'}</td>
      <td className="px-3 py-3 text-slate-500">{record.teamName || '-'}</td>
      {scope === 'all' && <td className="px-3 py-3 text-slate-500">{(record as any).projectName || '-'}</td>}
      <td className="px-3 py-3 text-slate-500">{record.yearMonth}</td>
      <td className="px-3 py-3">{record.workDays} 天</td>
      <td className="px-3 py-3">¥{record.dailyWage}/天</td>
      <td className="px-3 py-3 font-medium text-green-700">¥{actualWage.toFixed(2)}</td>
      <td className="px-3 py-3">
        <input type="text" inputMode="decimal" value={paidAmount}
          placeholder="0.00"
          onChange={e => onPaymentChange(record.id, 'paidAmount', e.target.value)}
          disabled={!!record.paymentLocked}
          className={`w-24 px-2 py-1 border rounded text-center text-sm ${record.paymentLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <input type="date" value={paidDate}
            onChange={e => onPaymentChange(record.id, 'paidDate', e.target.value)}
            disabled={!!record.paymentLocked}
            className={`w-32 px-2 py-1 border rounded text-sm ${record.paymentLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
          {record.bankReceiptPath && (
            <span className="text-green-500 text-xs" title={`凭证: ${record.bankReceiptPath}`}>📎</span>
          )}
        </div>
      </td>
      <td className={`px-3 py-3 font-medium ${diffColor}`}>
        {diffSign}¥{Math.abs(diff).toFixed(2)}
      </td>
    </tr>
  )
})
