import React from 'react'
import { formatMoney } from '@/utils/format'
import { normalizeDate } from '@/utils/date'
import { DIRECTION_CONFIG, getCategoryDisplayLabel, getLevel1Color, isCategoryMissing } from './config'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerRowProps {
  entry: CostLedgerEntry
  categoryLevel: 'level1' | 'level2'
  categories?: CostLedgerCategory[] | null
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
}

export const CostLedgerRow = React.memo(function CostLedgerRow({ entry, categoryLevel, categories, onEdit, onDelete }: CostLedgerRowProps) {
  const dir = DIRECTION_CONFIG[entry.direction]
  return (
    <tr className="border-b border-slate-100 text-sm table-row-hover">
      <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700 truncate">{entry.voucherNo || '-'}</td>
      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{normalizeDate(entry.date)}</td>
      <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${dir.bg} ${dir.color}`}>{dir.label}</span></td>
      <td className="px-3 py-2 text-slate-700 align-top">
        <span className="line-clamp-2">
          {categoryLevel === 'level1' && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: getLevel1Color(entry.category, categories) }} />
          )}
          {getCategoryDisplayLabel(entry.category, categoryLevel, categories)}
        </span>
        {isCategoryMissing(entry.category, categories) && (
          <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 text-[10px]" title="分类已删除或禁用">已删</span>
        )}
      </td>
      <td className="px-3 py-2 font-medium text-slate-700 truncate">{entry.counterparty}</td>
      <td className="px-3 py-2 text-xs text-slate-600 truncate" title={entry.channel}>{entry.channel}</td>
      <td className={`px-3 py-2 text-right font-mono font-medium whitespace-nowrap ${entry.direction === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
        {entry.direction === 'expense' ? '-' : '+'}{formatMoney(entry.amount)}
      </td>
      <td className="px-3 py-2 text-xs text-slate-600 truncate" title={entry.summary}>
        {entry.summary}
        {entry.linkedInvoiceStatus === 'deleted' && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 text-[10px]">已删发票</span>}
      </td>
      <td className="px-3 py-2 text-xs text-slate-500 truncate" title={entry.notes || ''}>
        {entry.notes || '-'}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button onClick={() => onEdit(entry)} className="mr-1 text-xs text-blue-600 hover:text-blue-800">编辑</button>
        <button onClick={() => onDelete(entry.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
      </td>
    </tr>
  )
})
