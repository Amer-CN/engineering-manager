import type { InvoiceType, InvoiceTaxRate, InvoiceKind, Invoice, PaymentRecord } from '@/types'
import type { InvoiceMedium, InvoiceCategory, TaxRate } from '@/types/electron'
import type { InvoiceFormData } from './InvoiceForm'
import type { PaymentFormData } from './PaymentForm'
import { categoryLabels, deriveInvoiceKind, mediumLabels, resolveInvoiceDimensions } from './invoiceConfig'

// 税率口径（增值税法）：第十条 13%/9%/6%/零税率，第十一条 3% 征收率；
// 2026-01-01 前历史口径（旧税制过渡期税率）另见历史档案，新增选项前先对齐法条。
// P1/T1：服务端税率主数据（tax_rates，063 迁移）是默认数据源；本数组降级为
// hook 失败/空时的兜底。数值集合必须与 063 种子一致，不得单边新增档位。
export const taxRateOptions: { value: InvoiceTaxRate; label: string }[] = [
  { value: 0, label: '不征税' },
  { value: 0.01, label: '1%' },
  { value: 0.03, label: '3%' },
  { value: 0.06, label: '6%' },
  { value: 0.09, label: '9%' },
  { value: 0.13, label: '13%' }
]

// —— 税率主数据（服务端）→ 下拉选项的投影（P1/T1） ——
// 0 档沿用「不征税」文案（与上面兜底选项一致）；其余按百分比展示。
export const taxRateLabel = (rate: number): string =>
  rate === 0 ? '不征税' : `${+(rate * 100).toFixed(4)}%`

/** 服务端税率的展示名：优先主数据 name，缺失时按 rate 兜底。 */
export const taxRateDisplayLabel = (r: Pick<TaxRate, 'name' | 'rate'>): string =>
  r.name?.trim() ? r.name : taxRateLabel(r.rate)

/**
 * 默认下拉选项：服务端 6 档正常时用主数据；hook 失败/空/含非标准档位时
 * 回落 taxRateOptions，保证表单永远有值可选（不阻塞开票）。
 *
 * 去重顺序（R3）：先按 effectiveFrom 降序（缺失/空视为最早），同 rate 只保留
 * 生效期最新的一条，再按 rate 升序输出 —— 避免下拉里同一税率出现两次且展示旧档。
 */
export function resolveTaxRateSelectOptions(rates?: TaxRate[] | null): { value: number; label: string }[] {
  if (!rates || rates.length === 0) return taxRateOptions
  const valid = rates.filter(r =>
    Number.isFinite(r?.rate) && (taxRateOptions as { value: number }[]).some(o => o.value === r.rate))
  if (valid.length === 0) return taxRateOptions
  const seen = new Set<number>()
  const options = [...valid]
    .sort((a, b) => (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? ''))
    .filter(r => (seen.has(r.rate) ? false : (seen.add(r.rate), true)))
    .sort((a, b) => a.rate - b.rate)
    .map(r => ({ value: r.rate, label: taxRateDisplayLabel(r) }))
  return options
}

// 票种两维（P0-a'）：介质 × 票种细分类，表单分别选择，invoiceKind 仅作兼容派生列。
export const mediumOptions: { value: InvoiceMedium; label: string }[] = [
  { value: 'electronic', label: mediumLabels.electronic },
  { value: 'paper', label: mediumLabels.paper }
]

export const categoryOptions: { value: InvoiceCategory; label: string }[] = [
  { value: 'special', label: categoryLabels.special },
  { value: 'regular', label: categoryLabels.regular },
  { value: 'passenger_transport', label: categoryLabels.passenger_transport },
  { value: 'toll', label: categoryLabels.toll },
  { value: 'train', label: categoryLabels.train },
  { value: 'plane', label: categoryLabels.plane },
  { value: 'quota', label: categoryLabels.quota },
  { value: 'roll', label: categoryLabels.roll }
]

// 兼容导出：旧客户端/旧调用点仍可按四值 kind 选择（新表单已改为两维下拉）。
export const invoiceKindOptions: { value: InvoiceKind; label: string }[] = [
  { value: 'paper_regular', label: '纸质普票' },
  { value: 'paper_special', label: '纸质专票' },
  { value: 'electronic_regular', label: '电子普票' },
  { value: 'electronic_special', label: '电子专票' }
]

// FP08 进项不得抵扣原因六值（''=可抵扣；口径：增值税法第22条，
// 细则见 docs/finance-knowledge/invoice/数电票与增值税规则.md）
export const nonDeductibleReasonOptions: { value: string; label: string }[] = [
  { value: 'simple_taxation', label: '简易计税' },
  { value: 'exempt', label: '免税项目' },
  { value: 'abnormal_loss', label: '非正常损失' },
  { value: 'welfare_personal', label: '福利/个人消费' },
  { value: 'catering_entertainment', label: '餐饮娱乐' },
  { value: 'other', label: '其他' }
]

export const getNonDeductibleReasonLabel = (v?: string | null): string =>
  nonDeductibleReasonOptions.find(o => o.value === (v ?? '').trim())?.label ?? ''

export const defaultInvoiceFormData: InvoiceFormData = {
  type: 'invoice_in',
  invoiceMedium: 'electronic',
  invoiceCategory: 'regular',
  invoiceKind: 'electronic_regular' as InvoiceKind,
  nonDeductibleReason: '',
  isDeducted: false,
  deductDate: '',
  deductPeriod: '',
  deductibleTax: 0,
  invoiceNo: '',
  invoiceCode: '',
  name: '',
  amount: 0,
  priceAmount: 0,
  taxAmount: 0,
  taxRate: 0.09 as InvoiceTaxRate,
  issueDate: new Date().toISOString().split('T')[0],
  sellerId: '',
  buyerId: '',
  projectId: '',
  contractId: '',
  remarks: '',
  fileUrl: '',
  fileType: ''
}

export const defaultPaymentFormData: PaymentFormData = {
  type: 'invoice_in' as InvoiceType,
  amount: 0,
  recordDate: new Date().toISOString().split('T')[0],
  projectId: '',
  partnerId: '',
  contractId: '',
  remarks: '',
  invoiceDetails: [],
  fileUrl: '',
  fileType: ''
}

export function getInvoiceFormData(editingInvoice: Invoice | null): InvoiceFormData {
  if (!editingInvoice) return { ...defaultInvoiceFormData }
  // 两维是唯一真源：优先 invoiceMedium/invoiceCategory，缺失时从历史 invoiceKind 推导；
  // 推导不出时留空（表单必填，由用户选择），不再兜底成 electronic_regular。
  const dims = resolveInvoiceDimensions(editingInvoice)
  const invoiceMedium = dims.medium ?? ''
  const invoiceCategory = dims.category ?? ''
  return {
    type: editingInvoice.type,
    invoiceMedium,
    invoiceCategory,
    invoiceKind: deriveInvoiceKind(invoiceMedium, invoiceCategory),
    nonDeductibleReason: editingInvoice.nonDeductibleReason || '',
    isDeducted: editingInvoice.isDeducted ?? false,
    deductDate: editingInvoice.deductDate || '',
    deductPeriod: editingInvoice.deductPeriod || '',
    deductibleTax: editingInvoice.deductibleTax || 0,
    invoiceNo: editingInvoice.invoiceNo || '',
    invoiceCode: editingInvoice.invoiceCode || '',
    name: editingInvoice.name || '',
    amount: editingInvoice.amount || 0,
    priceAmount: editingInvoice.priceAmount || editingInvoice.amount || 0,
    taxAmount: editingInvoice.taxAmount || 0,
    taxRate: editingInvoice.taxRate || 0.09,
    issueDate: editingInvoice.issueDate || '',
    sellerId: editingInvoice.sellerId || '',
    buyerId: editingInvoice.buyerId || '',
    projectId: editingInvoice.projectId || '',
    contractId: editingInvoice.contractId || '',
    remarks: editingInvoice.remarks || '',
    fileUrl: '',
    fileType: ''
  }
}

export function getPaymentFormData(editingPayment: PaymentRecord | null): PaymentFormData {
  if (!editingPayment) return { ...defaultPaymentFormData }
  return {
    type: editingPayment.type || 'invoice_in',
    amount: editingPayment.amount || 0,
    recordDate: editingPayment.recordDate || '',
    projectId: editingPayment.projectId || '',
    partnerId: editingPayment.partnerId || '',
    contractId: editingPayment.contractId || '',
    remarks: editingPayment.remarks || '',
    invoiceDetails: editingPayment.invoiceDetails || [],
    fileUrl: '',
    fileType: ''
  }
}
