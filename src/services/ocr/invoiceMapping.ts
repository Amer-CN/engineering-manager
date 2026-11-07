/**
 * 发票 OCR 结果 → 表单字段映射（纯函数，便于单测）。
 *
 * FP03（2026-11-07 取证结案）：数电票票面取消校验码、收款人、复核人（及发票代码/销售方章）；
 * 仅纸质发票、税控电子发票等历史票样可能返回这三项。识别不到一律空串，禁止伪造或默认填充。
 */
import type { OCRResult } from './types'

export interface InvoiceOcrFields {
  invoiceNo: string
  invoiceCode: string
  issueDate: string
  invoiceType: string
  amount: number
  priceAmount: number
  taxAmount: number
  taxRate: number
  sellerName: string
  sellerTaxNo: string
  purchaserName: string
  purchaserTaxNo: string
  itemName: string
  remarks: string
  verifyCode: string
  drawer: string
  payee: string
  reviewer: string
  taxCode: string
}

export function mapInvoiceOcr(inv: NonNullable<OCRResult['invoice']>): InvoiceOcrFields {
  return {
    invoiceNo: inv.invoiceNum || '',
    invoiceCode: inv.invoiceCode || '',
    issueDate: inv.invoiceDate || '',
    invoiceType: inv.invoiceType || '',
    amount: inv.totalAmount || 0,
    priceAmount: inv.amountWithoutTax || 0,
    taxAmount: inv.totalTax || 0,
    taxRate: inv.taxRate || 0,
    sellerName: inv.sellerName || '',
    sellerTaxNo: inv.sellerTaxNo || '',
    purchaserName: inv.purchaserName || '',
    purchaserTaxNo: inv.purchaserTaxNo || '',
    itemName: inv.itemName || '',
    remarks: inv.remarks || '',
    verifyCode: inv.verifyCode || inv.checkCode || '',
    drawer: inv.drawer || '',
    payee: inv.payee || '',
    reviewer: inv.reviewer || '',
    taxCode: inv.taxCode || '',
  }
}