import {
  formatDate,
  normalizeDate,
  formatDateTime,
  formatDateChinese,
  calculateAge,
  isValidDate,
  parseDateString,
  getRelativeTime,
} from '../../utils/date'

describe('date.ts', () => {
  // ─── formatDate ──────────────────────────────────────────────
  describe('formatDate', () => {
    it('应格式化 Date 对象为 YYYY-MM-DD', () => {
      const date = new Date('2025-03-15T08:30:00')
      expect(formatDate(date)).toBe('2025-03-15')
    })

    it('应格式化 ISO 字符串', () => {
      expect(formatDate('2025-01-01T00:00:00Z')).toBe('2025-01-01')
    })

    it('应处理 null/undefined', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
    })

    it('应处理无效日期', () => {
      expect(formatDate('invalid-date')).toBe('')
    })
  })

  // ─── normalizeDate ──────────────────────────────────────────
  describe('normalizeDate', () => {
    it('应保持标准格式不变', () => {
      expect(normalizeDate('2025-03-15')).toBe('2025-03-15')
    })

    it('应处理点分隔的日期', () => {
      expect(normalizeDate('2025.03.15')).toBe('2025-03-15')
    })

    it('应处理斜杠分隔的日期', () => {
      expect(normalizeDate('2025/03/15')).toBe('2025-03-15')
    })

    it('应处理混合分隔符', () => {
      expect(normalizeDate('2025.3,10')).toBe('2025-03-10')
    })

    it('应处理 null/undefined', () => {
      expect(normalizeDate(null)).toBe('')
      expect(normalizeDate(undefined)).toBe('')
    })

    it('应原样返回无法解析的日期', () => {
      expect(normalizeDate('some random text')).toBe('some random text')
    })
  })

  // ─── formatDateTime ─────────────────────────────────────────
  describe('formatDateTime', () => {
    it('应格式化日期时间', () => {
      const result = formatDateTime('2025-03-15T08:30:00')
      // 中文 locale 格式，大致包含日期和时间
      expect(result).toContain('2025')
      expect(result).toContain('08')
    })

    it('应处理 null/undefined', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime(undefined)).toBe('')
    })
  })

  // ─── formatDateChinese ──────────────────────────────────────
  describe('formatDateChinese', () => {
    it('应格式化为中文日期', () => {
      const result = formatDateChinese('2025-03-15')
      expect(result).toBe('2025年3月15日')
    })

    it('应处理 null/undefined', () => {
      expect(formatDateChinese(null)).toBe('')
      expect(formatDateChinese(undefined)).toBe('')
    })
  })

  // ─── calculateAge ───────────────────────────────────────────
  describe('calculateAge', () => {
    it('应正确计算年龄', () => {
      const currentYear = new Date().getFullYear()
      // 使用 1 月 1 日，确保已过生日（除非今天是 1 月 1 日本身，也不影响）
      const birthYear = currentYear - 30
      const age = calculateAge(`${birthYear}-01-01`)
      expect(age).toBe(30)
    })

    it('生日未到本年时应减 1 岁', () => {
      // 固定"今天"为 2026-05-23，生日为 06-15（未到）
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-23'))

      const age = calculateAge('1990-06-15')
      expect(age).toBe(35) // 2026-1990=36, 但未过生日 → 35

      vi.useRealTimers()
    })

    it('应处理 null/undefined', () => {
      expect(calculateAge(null)).toBe(0)
      expect(calculateAge(undefined)).toBe(0)
    })

    it('应处理无效日期', () => {
      expect(calculateAge('not-a-date')).toBe(0)
    })

    it('年龄不应为负数', () => {
      // 未来日期
      const age = calculateAge('2099-01-01')
      expect(age).toBe(0)
    })
  })

  // ─── isValidDate ───────────────────────────────────────────
  describe('isValidDate', () => {
    it('应识别有效日期', () => {
      expect(isValidDate('2025-03-15')).toBe(true)
      expect(isValidDate(new Date())).toBe(true)
    })

    it('应识别无效日期', () => {
      expect(isValidDate('invalid')).toBe(false)
      expect(isValidDate(new Date('invalid'))).toBe(false)
    })

    it('应处理 null/undefined', () => {
      expect(isValidDate(null)).toBe(false)
      expect(isValidDate(undefined)).toBe(false)
    })
  })

  // ─── parseDateString ───────────────────────────────────────
  describe('parseDateString', () => {
    it('应解析 YYYY-MM-DD 格式', () => {
      expect(parseDateString('2025-03-15')).toBe('2025-03-15')
    })

    it('应解析 YYYY/MM/DD 格式', () => {
      expect(parseDateString('2025/03/15')).toBe('2025-03-15')
    })

    it('应解析 YYYY.MM.DD 格式', () => {
      expect(parseDateString('2025.03.15')).toBe('2025-03-15')
    })

    it('应解析 YYYYMMDD 格式', () => {
      expect(parseDateString('20250315')).toBe('2025-03-15')
    })

    it('应解析中文日期格式', () => {
      expect(parseDateString('2025年3月15日')).toBe('2025-03-15')
    })

    it('应解析单数字月日', () => {
      expect(parseDateString('2025-3-5')).toBe('2025-03-05')
    })

    it('应拒绝无效月份', () => {
      expect(parseDateString('2025-13-01')).toBeNull()
    })

    it('应拒绝无效日期', () => {
      expect(parseDateString('2025-02-30')).toBeNull() // 2月30日不存在
    })

    it('应处理空字符串', () => {
      expect(parseDateString('')).toBeNull()
    })

    it('应解析 DD/MM/YYYY 格式（日>12 无歧义）', () => {
      // 15日，不可能是月份，应识别为 DD/MM/YYYY
      expect(parseDateString('15/03/2025')).toBe('2025-03-15')
    })

    it('应解析 MM/DD/YYYY 格式（月>12 不可能，走 DD/MM 路径）', () => {
      // 13不可能为月份，应识别为 DD/MM/YYYY
      expect(parseDateString('13/03/2025')).toBe('2025-03-13')
    })

    it('应拒绝无效日期（日超出月份最大天数）', () => {
      expect(parseDateString('31/02/2025')).toBeNull() // 2月没有31日
    })
  })

  // ─── getRelativeTime ───────────────────────────────────────
  describe('getRelativeTime', () => {
    it('应对刚过去的秒数返回"刚刚"', () => {
      const justNow = new Date(Date.now() - 5 * 1000).toISOString()
      expect(getRelativeTime(justNow)).toBe('刚刚')
    })

    it('应对过去的分钟数返回"X分钟前"', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      expect(getRelativeTime(fiveMinAgo)).toBe('5分钟前')
    })

    it('应对过去的小时数返回"X小时前"', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      expect(getRelativeTime(twoHoursAgo)).toBe('2小时前')
    })

    it('应对过去的天数返回"X天前"', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      expect(getRelativeTime(threeDaysAgo)).toBe('3天前')
    })

    it('应对过去的周数返回"X周前"', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      expect(getRelativeTime(tenDaysAgo)).toBe('1周前')
    })

    it('应对过去的月数返回"X月前"', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      expect(getRelativeTime(twoMonthsAgo)).toBe('2月前')
    })

    it('应对过去的年数返回"X年前"', () => {
      const twoYearsAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
      expect(getRelativeTime(twoYearsAgo)).toBe('1年前')
    })

    it('应处理 null/undefined', () => {
      expect(getRelativeTime(null)).toBe('')
      expect(getRelativeTime(undefined)).toBe('')
    })
  })
})
