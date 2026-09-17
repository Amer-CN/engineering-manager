import type { InvoiceType, InvoiceTaxRate, InvoiceKind, Invoice, PaymentRecord } from '@/types'
import type { InvoiceFormData } from './InvoiceForm'
import type { PaymentFormData } from './PaymentForm'

// 税率口径（增值税法）：第十条 13%/9%/6%/零税率，第十一条 3% 征收率；
// 2026-01-01 前历史口径（旧税制过渡期税率）另见历史档案，新增选项前先对齐法条。
export const taxRateOptions: { value: InvoiceTaxRate; label: string }[] = [
  { value: 0, label: '不征税' },
  { value: 0.01, label: '1%' },
  { value: 0.03, label: '3%' },
  { value: 0.06, label: '6%' },
  { value: 0.09, label: '9%' },
  { value: 0.13, label: '13%' }
]

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
  invoiceKind: 'electronic_regular' as InvoiceKind,
  nonDeductibleReason: '',
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
  return {
    type: editingInvoice.type,
    invoiceKind: editingInvoice.invoiceKind || 'electronic_regular',
    nonDeductibleReason: editingInvoice.nonDeductibleReason || '',
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
