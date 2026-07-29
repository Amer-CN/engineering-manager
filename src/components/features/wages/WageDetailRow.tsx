import React from 'react'
import type { WageRecord } from '@/types'

interface WageDetailRowProps {
  record: WageRecord
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
  const diffColor = diff === 0 ? 'text-success-600' : diff > 0 ? 'text-warning-600' : 'text-danger-500'
  const diffSign = diff > 0 ? '-' : diff < 0 ? '+' : ''

  return (
    <tr className="border-t border-[color:var(--border)] table-row-hover">
      <td className="px-3 py-3">
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(record.id)} className="rounded" />
      </td>
      <td className="px-3 py-3 font-medium">{record.memberName || '-'}</td>
      <td className="px-3 py-3 text-[color:var(--muted)]">{record.teamName || '-'}</td>
      {scope === 'all' && <td className="px-3 py-3 text-[color:var(--muted)]">{record.projectName || '-'}</td>}
      <td className="px-3 py-3 text-[color:var(--muted)]">{record.yearMonth}</td>
      <td className="px-3 py-3">{record.workDays} 天</td>
      <td className="px-3 py-3 font-mono tabular-nums">¥{record.dailyWage}/天</td>
      <td className="px-3 py-3 font-medium text-success-700 font-mono tabular-nums">¥{actualWage.toFixed(2)}</td>
      <td className="px-3 py-3">
        <input type="text" inputMode="decimal" value={paidAmount}
          placeholder="0.00"
          onChange={e => onPaymentChange(record.id, 'paidAmount', e.target.value)}
          disabled={!!record.paymentLocked}
          className={`w-24 px-2 py-1 border rounded text-center text-sm ${record.paymentLocked ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed' : 'border-[color:var(--border)]'}`} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <input type="date" value={paidDate}
            onChange={e => onPaymentChange(record.id, 'paidDate', e.target.value)}
            disabled={!!record.paymentLocked}
            className={`w-32 px-2 py-1 border rounded text-sm ${record.paymentLocked ? 'bg-[color:var(--panel-2)] border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed' : 'border-[color:var(--border)]'}`} />
          {record.bankReceiptPath && (
            <span className="text-success-500 text-xs" title={`凭证: ${record.bankReceiptPath}`}>📎</span>
          )}
        </div>
      </td>
      <td className={`px-3 py-3 font-medium ${diffColor}`}>
        {diffSign}¥{Math.abs(diff).toFixed(2)}
      </td>
    </tr>
  )
})
