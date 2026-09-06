/**
 * PII 脱敏工具函数单元测试
 * 覆盖 src/utils/mask.ts 5 个函数的所有边界
 */

import { describe, it, expect } from 'vitest'
import {
  maskIdCard,
  maskPhone,
  maskBankAccount,
  maskEmail,
  maskPII,
} from '../../utils/mask'

describe('maskIdCard', () => {
  it('18 位身份证: 保留前 4 + 后 4, 中间 10 个 *', () => {
    const id = '11010519491231002X'
    expect(maskIdCard(id)).toBe('1101**********002X')
  })

  it('15 位老身份证: 保留前 4 + 后 4, 中间 7 个 *', () => {
    const id = '110105491231002'
    expect(maskIdCard(id)).toBe('1101*******1002')
  })

  it('太短 (<8) 原样返回', () => {
    expect(maskIdCard('1234567')).toBe('1234567')
    expect(maskIdCard('abc')).toBe('abc')
  })

  it('等于 8 位也会脱敏 (边界)', () => {
    // 长度 8: 中间长度 = max(4, 8-8)=4, 前4 + 4* + 后4 还原回原值
    expect(maskIdCard('12345678')).toBe('1234****5678')
  })

  it('null / undefined 返回空字符串', () => {
    expect(maskIdCard(null)).toBe('')
    expect(maskIdCard(undefined)).toBe('')
  })

  it('空字符串返回空字符串', () => {
    expect(maskIdCard('')).toBe('')
  })

  it('自动 trim 前后空格', () => {
    expect(maskIdCard('  11010519491231002X  ')).toBe('1101**********002X')
  })
})

describe('maskPhone', () => {
  it('11 位手机: 保留前 3 + 后 4, 中间 4 个 *', () => {
    expect(maskPhone('13800138000')).toBe('138****8000')
  })

  it('11 位但不是 1 开头也会脱敏 (前 3 + 后 4)', () => {
    // 按实现: 长度 >= 7 时一律按 前3+****+后4 输出
    expect(maskPhone('23800138000')).toBe('238****8000')
  })

  it('太短 (<7) 原样返回', () => {
    expect(maskPhone('123456')).toBe('123456')
    expect(maskPhone('139')).toBe('139')
  })

  it('等于 7 位也会脱敏 (边界)', () => {
    expect(maskPhone('1234567')).toBe('123****4567')
  })

  it('null / undefined 返回空字符串', () => {
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
  })

  it('空字符串返回空字符串', () => {
    expect(maskPhone('')).toBe('')
  })
})

describe('maskBankAccount', () => {
  it('19 位银行卡: 保留前 4 + 后 4, 中间 11 个 *', () => {
    const acct = '6225880137660000123'
    expect(maskBankAccount(acct)).toBe('6225***********0123')
  })

  it('16 位银行卡: 保留前 4 + 后 4, 中间 8 个 *', () => {
    expect(maskBankAccount('6225880137660000')).toBe('6225********0000')
  })

  it('太短 (<8) 原样返回', () => {
    expect(maskBankAccount('1234567')).toBe('1234567')
    expect(maskBankAccount('6225')).toBe('6225')
  })

  it('null / undefined 返回空字符串', () => {
    expect(maskBankAccount(null)).toBe('')
    expect(maskBankAccount(undefined)).toBe('')
  })

  it('空字符串返回空字符串', () => {
    expect(maskBankAccount('')).toBe('')
  })

  it('自动 trim 前后空格', () => {
    expect(maskBankAccount('  6225880137660000  ')).toBe('6225********0000')
  })
})

describe('maskEmail', () => {
  it('邮箱: 首字符 + *** + @域名', () => {
    expect(maskEmail('alice@example.com')).toBe('a***@example.com')
  })

  it('local 长度为 1 原样返回', () => {
    expect(maskEmail('a@example.com')).toBe('a@example.com')
  })

  it('无 @ 原样返回', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email')
  })

  it('@ 在首位 (atIdx=0) 原样返回', () => {
    expect(maskEmail('@example.com')).toBe('@example.com')
  })

  it('null / undefined 返回空字符串', () => {
    expect(maskEmail(null)).toBe('')
    expect(maskEmail(undefined)).toBe('')
  })

  it('空字符串返回空字符串', () => {
    expect(maskEmail('')).toBe('')
  })
})

describe('maskPII (type dispatch)', () => {
  it('idCard 类型分派到 maskIdCard', () => {
    expect(maskPII('idCard', '11010519491231002X')).toBe('1101**********002X')
  })

  it('phone 类型分派到 maskPhone', () => {
    expect(maskPII('phone', '13800138000')).toBe('138****8000')
  })

  it('bankAccount 类型分派到 maskBankAccount', () => {
    expect(maskPII('bankAccount', '6225880137660000')).toBe('6225********0000')
  })

  it('email 类型分派到 maskEmail', () => {
    expect(maskPII('email', 'alice@example.com')).toBe('a***@example.com')
  })

  it('null / undefined 对所有 type 都返回空字符串', () => {
    expect(maskPII('idCard', null)).toBe('')
    expect(maskPII('phone', undefined)).toBe('')
    expect(maskPII('bankAccount', null)).toBe('')
    expect(maskPII('email', undefined)).toBe('')
  })
})
