import React, { useEffect, useState } from 'react'
import { formatMoney } from '@/utils/format'
import { normalizeDate } from '@/utils/date'
import { DIRECTION_CONFIG, getCategoryDisplayLabel, getLevel1Color, isCategoryMissing } from './config'
import { getNonDeductibleReasonLabel } from '../invoices/constants'
import { getAPI } from '@/services/api-adapter'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerRowProps {
  entry: CostLedgerEntry
  categoryLevel: 'level1' | 'level2'
  categories?: CostLedgerCategory[] | null
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
}

// FP08：关联发票不得抵扣原因只读展示。cost_ledger 不加列，经 linked_invoice_id
// 联动读发票行；以 projectId 为键缓存发票列表，N 行共用一次请求。
const linkedReasonCache = new Map<number, Promise<Record<number, string>>>()

async function getLinkedReasonMap(projectId: number): Promise<Record<number, string>> {
  const hit = linkedReasonCache.get(projectId)
  if (hit) return hit
  const p = (async () => {
    try {
      const api = await getAPI()
      const r: any = api?.getInvoices ? await api.getInvoices(projectId) : null
      const map: Record<number, string> = {}
      if (r?.success && Array.isArray(r.data)) {
        for (const inv of r.data) {
          const reason = (inv?.nonDeductibleReason ?? '') as string
          if (inv?.id != null && reason) map[inv.id] = reason
        }
      }
      return map
    } catch {
      return {} as Record<number, string>
    }
  })()
  linkedReasonCache.set(projectId, p)
  return p
}

/** 测试用：清空关联原因缓存（生产无调用方）。 */
export function clearLinkedInvoiceReasonCache() {
  linkedReasonCache.clear()
}

export const CostLedgerRow = React.memo(function CostLedgerRow({ entry, categoryLevel, categories, onEdit, onDelete }: CostLedgerRowProps) {
  const dir = DIRECTION_CONFIG[entry.direction]
  const [linkedReason, setLinkedReason] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (entry.linkedInvoiceId && entry.projectId) {
      const linkId = entry.linkedInvoiceId
      getLinkedReasonMap(entry.projectId).then(map => {
        if (alive) setLinkedReason(map[linkId] || null)
      })
    } else {
      setLinkedReason(null)
    }
    return () => { alive = false }
  }, [entry.linkedInvoiceId, entry.projectId])
  return (
    <tr className="text-sm table-row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="px-3 py-2 text-center font-mono font-semibold truncate tabular-nums" style={{ color: 'var(--fg-2)' }}>{entry.voucherNo || '-'}</td>
      <td className="px-3 py-2 whitespace-nowrap font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{normalizeDate(entry.date)}</td>
      <td className="px-3 py-2">
        <span className={`flex items-center gap-1 text-xs ${entry.direction === 'expense' ? 'opacity-70' : ''}`} style={{ color: 'var(--fg)' }}>
          <span>{entry.direction === 'expense' ? '↓' : '↑'}</span>
          <span>{dir.label}</span>
        </span>
      </td>
      <td className="px-3 py-2 align-top" style={{ color: 'var(--fg-2)' }}>
        <span className="line-clamp-2">
          {categoryLevel === 'level1' && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: getLevel1Color(entry.category, categories) }} />
          )}
          {getCategoryDisplayLabel(entry.category, categoryLevel, categories)}
        </span>
        {isCategoryMissing(entry.category, categories) && (
          <span className="ml-1 rounded px-1 text-caption" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }} title="分类已删除或禁用">已删</span>
        )}
      </td>
      <td className="px-3 py-2 font-medium truncate" style={{ color: 'var(--fg-2)' }}>{entry.counterparty}</td>
      <td className="px-3 py-2 text-xs truncate" title={entry.channel} style={{ color: 'var(--muted)' }}>{entry.channel}</td>
      <td className="px-3 py-2 text-right font-mono font-medium whitespace-nowrap tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>
        {entry.direction === 'expense' ? '-' : '+'}{formatMoney(entry.amount)}
      </td>
      <td className="px-3 py-2 text-xs truncate" title={entry.summary} style={{ color: 'var(--muted)' }}>
        {entry.summary}
        {entry.linkedInvoiceStatus === 'deleted' && <span className="ml-1 rounded px-1 text-caption" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>已删发票</span>}
        {linkedReason && <span className="ml-1 rounded px-1 text-caption" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }} title={`关联发票不得抵扣：${getNonDeductibleReasonLabel(linkedReason)}`}>不得抵扣·{getNonDeductibleReasonLabel(linkedReason)}</span>}
      </td>
      <td className="px-3 py-2 text-xs truncate" title={entry.notes || ''} style={{ color: 'var(--muted)' }}>
        {entry.notes || '-'}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button onClick={() => onEdit(entry)} className="mr-1 text-xs" style={{ color: 'var(--accent)' }}>编辑</button>
        <button onClick={() => onDelete(entry.id)} className="text-xs" style={{ color: 'var(--danger)' }}>删除</button>
      </td>
    </tr>
  )
})
