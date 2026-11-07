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
    /** T8：校验码（与 checkCode 同义，后端新字段名） */
    verifyCode?: string
    /** T8：销方/购方纳税人识别号（数电票仍有；旧票样可能只有名称） */
    sellerTaxNo?: string
    purchaserTaxNo?: string
    /** T8：开票人（数电票保留）；收款人/复核人仅历史票样可能存在 */
    drawer?: string
    payee?: string
    reviewer?: string
    /** T3/T8：税收分类编码（OCR 不一定返回） */
    taxCode?: string
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
