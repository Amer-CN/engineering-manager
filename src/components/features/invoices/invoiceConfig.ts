import { InvoiceStatus, InvoiceType, InvoiceKind } from '@/types/electron'

export const statusConfigMap = {
  issued: { labelOut: '已开具', labelIn: '已收票', color: 'text-[color:var(--muted)]', bgColor: 'bg-[color:var(--panel-2)]' },
  partially_paid: { labelOut: '部分收款', labelIn: '部分付款', color: 'text-[color:var(--warning)]', bgColor: 'bg-[color:var(--warning-soft)]' },
  received: { labelOut: '已收齐', labelIn: '已付清', color: 'text-[color:var(--success)]', bgColor: 'bg-[color:var(--success-soft)]' },
  cancelled: { labelOut: '已作废', labelIn: '已作废', color: 'text-[color:var(--muted)]', bgColor: 'bg-[color:var(--panel-2)]' },
  red_flushed: { labelOut: '已红冲', labelIn: '已红冲', color: 'text-[color:var(--danger)]', bgColor: 'bg-[color:var(--danger-soft)]' }
} as const

export const getStatusLabel = (status: InvoiceStatus, type?: InvoiceType) => {
  const entry = statusConfigMap[status]
  if (!entry) return '未知'
  return type === 'invoice_in' ? entry.labelIn : entry.labelOut
}

export const getStatusConfig = (status: InvoiceStatus | string, invoiceType?: InvoiceType) => {
  const entry = statusConfigMap[status as InvoiceStatus]
  const label = entry ? (invoiceType === 'invoice_in' ? entry.labelIn : entry.labelOut) : '未知'
  return { label, color: entry?.color || 'text-[color:var(--muted)]', bgColor: entry?.bgColor || 'bg-[color:var(--panel-2)]' }
}

export const kindConfig: Record<InvoiceKind, { label: string; color: string; bgColor: string }> = {
  paper_regular: { label: '纸普', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' },
  paper_special: { label: '纸专', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' },
  electronic_regular: { label: '电普', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' },
  electronic_special: { label: '电专', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' }
}

export const getKindConfig = (kind: InvoiceKind | string) => {
  return kindConfig[kind as InvoiceKind] || { label: '纸质', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' }
}
