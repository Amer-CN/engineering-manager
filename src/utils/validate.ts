/**
 * 验证工具函数
 */

/**
 * 验证手机号
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 验证身份证号
 */
export function isValidIdCard(idCard: string | null | undefined): boolean {
  if (!idCard) return false
  // 15位或18位身份证
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return reg.test(idCard)
}

/**
 * 验证邮箱
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 验证统一社会信用代码
 */
export function isValidCreditCode(code: string | null | undefined): boolean {
  if (!code) return false
  // 18位统一社会信用代码
  return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(code)
}

/**
 * 验证银行卡号（使用 Luhn 算法）
 */
export function isValidBankCard(cardNumber: string | null | undefined): boolean {
  if (!cardNumber) return false
  const digits = cardNumber.replace(/\s/g, '')
  
  if (!/^\d{16,19}$/.test(digits)) return false
  
  let sum = 0
  let isEven = false
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)
    
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

/**
 * 验证URL
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证必填
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * 验证最小长度
 */
export function minLength(value: string, min: number): boolean {
  if (!value) return false
  return value.length >= min
}

/**
 * 验证最大长度
 */
export function maxLength(value: string, max: number): boolean {
  if (!value) return true
  return value.length <= max
}

/**
 * 验证数字范围
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * 发票号码校验（非阻塞提示）
 * 规则：新版数电票号码为 20 位纯数字；旧版 8 位号码需配合发票代码使用。
 * @returns null = 通过（无需提示）；否则返回提示文案
 */
export function validateInvoiceNumber(invoiceNo: string, invoiceCode: string): string | null {
  // 旧版票：填了发票代码 → 不校验号码位数
  if (invoiceCode && invoiceCode.trim().length > 0) return null
  // 号码为空 → 不提示
  if (!invoiceNo || invoiceNo.trim().length === 0) return null
  // 20 位纯数字 = 新版数电票，通过
  if (/^\d{20}$/.test(invoiceNo)) return null
  return '新版数电票发票号码为20位数字；旧版8位号码请一并填写发票代码'
}
