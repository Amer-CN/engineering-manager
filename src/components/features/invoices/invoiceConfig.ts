import { InvoiceStatus, InvoiceType, InvoiceKind, InvoiceMedium, InvoiceCategory } from '@/types/electron'

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
  return kindConfig[kind as InvoiceKind] || { label: '未知', color: 'text-[color:var(--fg-2)]', bgColor: 'bg-[color:var(--panel-2)]' }
}

// ═══════════════════════════════════════════════════════════
// 票种两维模型（介质 + 票种细分类）
// 两维是唯一真源；历史数据仅有 invoiceKind 时按前缀/后缀推导。
// ═══════════════════════════════════════════════════════════

export const mediumLabels: Record<InvoiceMedium, string> = {
  electronic: '电子',
  paper: '纸质'
}

export const categoryLabels: Record<InvoiceCategory, string> = {
  special: '专票',
  regular: '普票',
  passenger_transport: '旅客运输',
  toll: '通行费',
  train: '火车票',
  plane: '飞机票',
  quota: '定额发票',
  roll: '卷式发票'
}

export interface InvoiceDimensionsInput {
  invoiceMedium?: InvoiceMedium | '' | null
  invoiceCategory?: InvoiceCategory | '' | null
  invoiceKind?: InvoiceKind | string | null
}

const isInvoiceMedium = (v: unknown): v is InvoiceMedium => v === 'electronic' || v === 'paper'

const isInvoiceCategory = (v: unknown): v is InvoiceCategory =>
  v === 'special' || v === 'regular' || v === 'passenger_transport' ||
  v === 'toll' || v === 'train' || v === 'plane' || v === 'quota' || v === 'roll'

/** 旧数据兼容：从 invoiceKind 推导介质/票种（仅能覆盖专票/普票四值）。 */
export function parseInvoiceKind(kind?: string | null): { medium: InvoiceMedium | null; category: InvoiceCategory | null } {
  const k = (kind ?? '').trim()
  if (!k) return { medium: null, category: null }
  return {
    medium: k.startsWith('electronic_') ? 'electronic' : k.startsWith('paper_') ? 'paper' : null,
    category: k.endsWith('_special') ? 'special' : k.endsWith('_regular') ? 'regular' : null
  }
}

/** 读取两维：优先 invoiceMedium/invoiceCategory，逐字段为空时从 invoiceKind 推导。 */
export function resolveInvoiceDimensions(invoice: InvoiceDimensionsInput): {
  medium: InvoiceMedium | null
  category: InvoiceCategory | null
} {
  const legacy = parseInvoiceKind(invoice.invoiceKind as string | null | undefined)
  return {
    medium: isInvoiceMedium(invoice.invoiceMedium) ? invoice.invoiceMedium : legacy.medium,
    category: isInvoiceCategory(invoice.invoiceCategory) ? invoice.invoiceCategory : legacy.category
  }
}

/** 展示标签：`电子 · 专票`；无法推导时显示「未知」，不兜底成任一票种。 */
export function getInvoiceDimensionLabel(invoice: InvoiceDimensionsInput): string {
  const { medium, category } = resolveInvoiceDimensions(invoice)
  const parts = [medium ? mediumLabels[medium] : null, category ? categoryLabels[category] : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '未知'
}

/** 由两维派生兼容列 invoiceKind：仅专票/普票可折叠，其余票种为空串（服务端落 kind=NULL）。 */
export function deriveInvoiceKind(
  medium?: InvoiceMedium | '' | null,
  category?: InvoiceCategory | '' | null
): InvoiceKind | '' {
  if (category !== 'special' && category !== 'regular') return ''
  if (medium !== 'electronic' && medium !== 'paper') return ''
  return `${medium}_${category}` as InvoiceKind
}

/**
 * OCR 文本 → 票种两维。
 * 介质：电子 > 纸 >（增值税/发票 → 纸质）> fallback；票种按具体票种优先、「专用/普通」最后。
 * 未命中时保留调用方传入的 fallback（表单当前值），避免识别文本缺项时清空用户选择。
 * mediumInferredFromInvoiceText 仅在走「增值税/发票 → 纸质」推断时为 true，供 UI 提示核对。
 */
export function dimensionsFromOcrType(
  type: string,
  fallbackMedium?: InvoiceMedium | '' | null,
  fallbackCategory?: InvoiceCategory | '' | null
): { medium: InvoiceMedium | ''; category: InvoiceCategory | ''; mediumInferredFromInvoiceText: boolean } {
  const text = (type ?? '').toLowerCase()
  let medium: InvoiceMedium | ''
  let mediumInferredFromInvoiceText = false
  if (text.includes('电子') || text.includes('electronic')) {
    medium = 'electronic'
  } else if (text.includes('纸') || text.includes('paper')) {
    medium = 'paper'
  } else if (text.includes('增值税') || text.includes('发票') || text.includes('invoice')) {
    // 纸质票 OCR 文本通常无「电子」字样；此处按票面文字推断并提示用户核对。
    medium = 'paper'
    mediumInferredFromInvoiceText = true
  } else {
    medium = fallbackMedium ?? ''
  }
  // 具体票种必须排在「专用/普通」之前，避免「旅客运输电子普通发票」被判成普票。
  const categoryMatchers: [string, InvoiceCategory][] = [
    ['通行费', 'toll'], ['过路', 'toll'], ['过桥', 'toll'], ['toll', 'toll'],
    ['火车', 'train'], ['铁路', 'train'], ['train', 'train'],
    ['飞机', 'plane'], ['航空', 'plane'], ['行程单', 'plane'], ['plane', 'plane'],
    ['旅客运输', 'passenger_transport'], ['客运', 'passenger_transport'],
    ['公路', 'passenger_transport'], ['水路', 'passenger_transport'],
    ['出租', 'passenger_transport'], ['passenger', 'passenger_transport'],
    ['定额', 'quota'], ['quota', 'quota'],
    ['卷式', 'roll'], ['卷票', 'roll'], ['roll', 'roll'],
    ['专用', 'special'], ['special', 'special'],
    ['普通', 'regular'], ['regular', 'regular']
  ]
  const hit = categoryMatchers.find(([keyword]) => text.includes(keyword))
  return {
    medium,
    category: hit ? hit[1] : (fallbackCategory ?? ''),
    mediumInferredFromInvoiceText
  }
}

/** FP06 介质判定：两维优先，历史 kind 兜底；trim + 小写，与后端 OrdinalIgnoreCase 同口径。 */
export function isElectronicInvoice(invoice: InvoiceDimensionsInput): boolean {
  const medium = (invoice.invoiceMedium ?? '').trim().toLowerCase()
  const kind = (invoice.invoiceKind ?? '').trim().toLowerCase()
  return medium === 'electronic' || kind.startsWith('electronic_')
}
