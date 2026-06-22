import { FILE_CATEGORIES } from '../services/fileService'

export const getInvoiceCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.INVOICE_OUT : FILE_CATEGORIES.INVOICE_IN

export const getPaymentCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.PAYMENT_IN : FILE_CATEGORIES.PAYMENT_OUT