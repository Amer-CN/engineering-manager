/**
 * OCR 类型定义
 */

export type OCRProvider = 'baidu' | 'offline'

export interface OCRConfig {
  provider: OCRProvider
  enabled: boolean
  baidu?: {
    apiKey: string
    secretKey: string
  }
}

export interface OCRResult {
  success: boolean
  text?: string
  idCard?: {
    number: string
    name?: string
    gender?: string
    ethnicity?: string
    birthDate?: string
    address?: string
    issueAuthority?: string
    validDate?: string
  }
  invoice?: {
    invoiceNum: string
    invoiceCode: string
    invoiceDate: string
    invoiceType: string
    totalAmount: number
    amountWithoutTax: number
    totalTax: number
    taxRate: number
    sellerName: string
    purchaserName: string
    checkCode: string
    itemName: string
    remarks: string
  }
  bankCard?: {
    cardNumber: string
    bankName: string
    cardType: string
    validDate: string
  }
  businessLicense?: {
    creditCode: string
    companyName: string
    legalPerson: string
    registeredCapital: string
    address: string
    businessScope: string
    establishDate: string
    expireDate: string
  }
  bankReceipt?: {
    transactionDate: string
    transactionTime: string
    amount: number
    payerName: string
    payerAccount: string
    payeeName: string
    payeeAccount: string
    transactionNo: string
    bankName: string
    remarks: string
  }
  permit?: {
    companyCode: string
    companyName: string
    accountNumber: string
    bankName: string
    permitNumber: string
  }
  bankStatement?: {
    transactions: Array<{
      date: string
      time: string
      amount: number
      balance: number
      type: string
      counterparty: string
      remark: string
    }>
    accountNumber: string
    bankName: string
  }
  generalReceipt?: {
    text: string
    amount: number
    date: string
  }
  error?: string
}
