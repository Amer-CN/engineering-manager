import { InvoiceStatus, InvoiceType, InvoiceKind } from '@/types/electron'

export const statusConfigMap = {
  issued: { labelOut: '已开具', labelIn: '已收票', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  partially_paid: { labelOut: '部分收款', labelIn: '部分付款', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  received: { labelOut: '已收齐', labelIn: '已付清', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { labelOut: '已作废', labelIn: '已作废', color: 'text-red-600', bgColor: 'bg-red-100' },
  red_flushed: { labelOut: '已红冲', labelIn: '已红冲', color: 'text-orange-600', bgColor: 'bg-orange-100' }
} as const

export const getStatusLabel = (status: InvoiceStatus, type?: InvoiceType) => {
  const entry = statusConfigMap[status]
  if (!entry) return '未知'
  return type === 'invoice_in' ? entry.labelIn : entry.labelOut
}

export const getStatusConfig = (status: InvoiceStatus | string, invoiceType?: InvoiceType) => {
  const entry = statusConfigMap[status as InvoiceStatus]
  const label = entry ? (invoiceType === 'invoice_in' ? entry.labelIn : entry.labelOut) : '未知'
  return { label, color: entry?.color || 'text-slate-600', bgColor: entry?.bgColor || 'bg-slate-100' }
}

export const kindConfig: Record<InvoiceKind, { label: string; color: string; bgColor: string }> = {
  paper_regular: { label: '纸普', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  paper_special: { label: '纸专', color: 'text-red-600', bgColor: 'bg-red-100' },
  electronic_regular: { label: '电普', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  electronic_special: { label: '电专', color: 'text-purple-600', bgColor: 'bg-purple-100' }
}

export const getKindConfig = (kind: InvoiceKind | string) => {
  return kindConfig[kind as InvoiceKind] || { label: '纸质', color: 'text-amber-600', bgColor: 'bg-amber-100' }
}
