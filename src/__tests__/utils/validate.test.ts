import {
  isValidPhone,
  isValidIdCard,
  isValidEmail,
  isValidCreditCode,
  isValidBankCard,
  isValidUrl,
  isRequired,
  minLength,
  maxLength,
  inRange,
} from '../../utils/validate'

describe('validate.ts', () => {
  // ─── isValidPhone ───────────────────────────────────────────
  describe('isValidPhone', () => {
    it('应接受有效的手机号', () => {
      expect(isValidPhone('13800138000')).toBe(true)
      expect(isValidPhone('15912345678')).toBe(true)
      expect(isValidPhone('19900001111')).toBe(true)
    })

    it('应拒绝无效的手机号', () => {
      expect(isValidPhone('12800138000')).toBe(false) // 12 开头
      expect(isValidPhone('1380013800')).toBe(false)  // 10 位
      expect(isValidPhone('138001380001')).toBe(false) // 12 位
      expect(isValidPhone('abc13800138000')).toBe(false)
    })

    it('应处理 null/undefined/空字符串', () => {
      expect(isValidPhone(null)).toBe(false)
      expect(isValidPhone(undefined)).toBe(false)
      expect(isValidPhone('')).toBe(false)
    })
  })

  // ─── isValidIdCard ───────────────────────────────────────────
  describe('isValidIdCard', () => {
    it('应接受 18 位身份证号', () => {
      expect(isValidIdCard('110101199001011234')).toBe(true)
      expect(isValidIdCard('11010119900101123X')).toBe(true)
      expect(isValidIdCard('11010119900101123x')).toBe(true) // 小写 x
    })

    it('应接受 15 位身份证号', () => {
      expect(isValidIdCard('110101900101123')).toBe(true)
    })

    it('应拒绝无效的身份证号', () => {
      expect(isValidIdCard('11010119900101')).toBe(false)    // 14 位
      expect(isValidIdCard('1101011990010112345')).toBe(false) // 19 位
      expect(isValidIdCard('abcdefghijklmnopqr')).toBe(false)
    })

    it('应处理 null/undefined', () => {
      expect(isValidIdCard(null)).toBe(false)
      expect(isValidIdCard(undefined)).toBe(false)
    })
  })

  // ─── isValidEmail ───────────────────────────────────────────
  describe('isValidEmail', () => {
    it('应接受有效的邮箱', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
      expect(isValidEmail('user+tag@sub.domain.com')).toBe(true)
    })

    it('应拒绝无效的邮箱', () => {
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
      expect(isValidEmail('user domain@test.com')).toBe(false) // 含空格
    })

    it('应处理 null/undefined', () => {
      expect(isValidEmail(null)).toBe(false)
      expect(isValidEmail(undefined)).toBe(false)
    })
  })

  // ─── isValidCreditCode ──────────────────────────────────────
  describe('isValidCreditCode', () => {
    it('应接受有效的统一社会信用代码', () => {
      // 18 位：2位字母 + 6位数字 + 10位字母数字
      expect(isValidCreditCode('911100006000000000')).toBe(true) // 示例
      expect(isValidCreditCode('91350100M000100000')).toBe(true)
    })

    it('应拒绝无效的统一社会信用代码', () => {
      expect(isValidCreditCode('9111000060000000')).toBe(false)   // 17 位
      expect(isValidCreditCode('9111000060000000000')).toBe(false) // 19 位
      expect(isValidCreditCode('I1110000600000000')).toBe(false)  // I 不在允许范围
    })

    it('应处理 null/undefined', () => {
      expect(isValidCreditCode(null)).toBe(false)
      expect(isValidCreditCode(undefined)).toBe(false)
    })
  })

  // ─── isValidBankCard (Luhn 算法) ────────────────────────────
  describe('isValidBankCard', () => {
    it('应接受通过 Luhn 校验的银行卡号', () => {
      // 通过 Luhn 校验的测试卡号
      expect(isValidBankCard('6225880212345673')).toBe(true)
      expect(isValidBankCard('6225880212345678901')).toBe(true) // 19 位
      expect(isValidBankCard('6228480402564890018')).toBe(true) // 19 位真实卡号
    })

    it('应拒绝未通过 Luhn 校验的银行卡号', () => {
      expect(isValidBankCard('6225880212345678')).toBe(false) // 未通过 Luhn
    })

    it('应拒绝非数字卡号', () => {
      expect(isValidBankCard('abcdefghijklmnop')).toBe(false)
    })

    it('应拒绝长度不符的卡号', () => {
      expect(isValidBankCard('622588021234567')).toBe(false)   // 15 位
      expect(isValidBankCard('62258802123456789012')).toBe(false) // 20 位
    })

    it('应支持带空格的卡号', () => {
      expect(isValidBankCard('6225 8802 1234 5673')).toBe(true)
    })

    it('应处理 null/undefined', () => {
      expect(isValidBankCard(null)).toBe(false)
      expect(isValidBankCard(undefined)).toBe(false)
    })
  })

  // ─── isValidUrl ─────────────────────────────────────────────
  describe('isValidUrl', () => {
    it('应接受有效的 URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://localhost:3000')).toBe(true)
      expect(isValidUrl('ftp://files.example.com/path')).toBe(true)
    })

    it('应拒绝无效的 URL', () => {
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('://missing-scheme')).toBe(false)
    })

    it('应处理 null/undefined', () => {
      expect(isValidUrl(null)).toBe(false)
      expect(isValidUrl(undefined)).toBe(false)
    })
  })

  // ─── isRequired ─────────────────────────────────────────────
  describe('isRequired', () => {
    it('应对有值的字符串返回 true', () => {
      expect(isRequired('hello')).toBe(true)
    })

    it('应对空白字符串返回 false', () => {
      expect(isRequired('   ')).toBe(false)
    })

    it('应对 null/undefined 返回 false', () => {
      expect(isRequired(null)).toBe(false)
      expect(isRequired(undefined)).toBe(false)
    })

    it('应对非空数组返回 true，空数组返回 false', () => {
      expect(isRequired([1, 2, 3])).toBe(true)
      expect(isRequired([])).toBe(false)
    })

    it('应对数字返回 true（0 也是有效值）', () => {
      expect(isRequired(0)).toBe(true)
      expect(isRequired(42)).toBe(true)
    })
  })

  // ─── minLength / maxLength ───────────────────────────────────
  describe('minLength', () => {
    it('应在达到最小长度时返回 true', () => {
      expect(minLength('abc', 3)).toBe(true)
      expect(minLength('abcd', 3)).toBe(true)
    })

    it('应在未达到最小长度时返回 false', () => {
      expect(minLength('ab', 3)).toBe(false)
    })

    it('应处理空字符串', () => {
      expect(minLength('', 1)).toBe(false)
    })
  })

  describe('maxLength', () => {
    it('应在未超过最大长度时返回 true', () => {
      expect(maxLength('ab', 3)).toBe(true)
      expect(maxLength('abc', 3)).toBe(true)
    })

    it('应在超过最大长度时返回 false', () => {
      expect(maxLength('abcd', 3)).toBe(false)
    })

    it('应处理空字符串（空字符串不超限）', () => {
      expect(maxLength('', 0)).toBe(true)
    })
  })

  // ─── inRange ────────────────────────────────────────────────
  describe('inRange', () => {
    it('应正确判断数值范围', () => {
      expect(inRange(5, 1, 10)).toBe(true)
      expect(inRange(1, 1, 10)).toBe(true)  // 边界
      expect(inRange(10, 1, 10)).toBe(true)  // 边界
      expect(inRange(0, 1, 10)).toBe(false)
      expect(inRange(11, 1, 10)).toBe(false)
    })
  })
})
