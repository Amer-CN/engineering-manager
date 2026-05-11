import type { InvoiceFormData } from './InvoiceForm'
import type { PaymentFormData } from './PaymentForm'
import type { Invoice, InvoiceKind, InvoiceTaxRate, PaymentRecord } from '../../../types/electron'

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

export const defaultInvoiceFormData: InvoiceFormData = {
  type: 'invoice_in',
  invoiceKind: 'electronic_regular' as InvoiceKind,
  invoiceNo: '',
  invoiceCode: '',
  name: '',
  amount: 0,
  priceAmount: 0,
  taxAmount: 0,
  taxRate: 0.09 as any,
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
  type: 'invoice_in' as any,
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
    invoiceKind: (editingInvoice as any).kind || 'electronic_regular',
    invoiceNo: editingInvoice.invoiceNo || '',
    invoiceCode: (editingInvoice as any).invoiceCode || '',
    name: editingInvoice.name || '',
    amount: editingInvoice.amount || 0,
    priceAmount: (editingInvoice as any).priceAmount || editingInvoice.amount || 0,
    taxAmount: editingInvoice.taxAmount || 0,
    taxRate: (editingInvoice as any).taxRate || 0.09,
    issueDate: editingInvoice.issueDate || '',
    sellerId: (editingInvoice as any).sellerId || '',
    buyerId: (editingInvoice as any).buyerId || '',
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
