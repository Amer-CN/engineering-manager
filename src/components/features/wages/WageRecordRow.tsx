import React from 'react'
import type { WageRecord } from '@/types'

interface WageRecordRowProps {
  record: WageRecord
  isSelected: boolean
  paidAmount: string
  paidDate: string
  onToggleSelect: (id: number) => void
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
}

export const WageRecordRow = React.memo(function WageRecordRow({
  record, isSelected, paidAmount, paidDate,
  onToggleSelect, onPaymentChange,
}: WageRecordRowProps) {
  const diff = (parseFloat(paidAmount) || 0) - record.actualWage
  const diffColor = diff > 0.01 ? 'text-red-600' : diff < -0.01 ? 'text-amber-600' : 'text-green-600'
  const diffSign = diff > 0.01 ? '+' : ''

  return (
    <tr className="border-t border-slate-100 table-row-hover">
      <td className="px-3 py-3">
        <input type="checkbox" checked={isSelected}
          onChange={() => onToggleSelect(record.id)} className="rounded" />
      </td>
      <td className="px-3 py-3 font-medium">{record.memberName || '-'}</td>
      <td className="px-3 py-3">{record.yearMonth}</td>
      <td className="px-3 py-3">{record.workDays} 天</td>
      <td className="px-3 py-3 font-medium">¥{record.actualWage.toFixed(2)}</td>
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
        {diffSign}¥{diff.toFixed(2)}
      </td>
    </tr>
  )
})
