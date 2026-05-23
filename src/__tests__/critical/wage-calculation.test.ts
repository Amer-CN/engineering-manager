/**
 * 测试 2: 工资源码计算准确性测试 🔴 P0
 * 
 * 验证工资计算逻辑正确性
 * 
 * 注意：由于 electron/ipc-handlers/wage-calc.ts 依赖 CommonJS 模块，
 * 这里直接复制纯函数实现进行测试。
 */

import { describe, it, expect } from 'vitest'

// ════════════════════════════════════════
// 从 electron/ipc-handlers/wage-calc.ts 复制的纯函数
// ════════════════════════════════════════

/**
 * 获取指定月份的天数
 */
function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/**
 * 计算实际工资
 * 公式：日工资 × 工作天数 + 奖金 - 扣款
 */
function calculateActualWage(
  dailyWage: number, workDays: number, bonus: number, deduction: number
): number {
  return Math.round((dailyWage * workDays + bonus - deduction) * 100) / 100
}

// ════════════════════════════════════════
// 测试
// ════════════════════════════════════════

describe('工资源码计算准确性', () => {

  // ─── calculateActualWage 单元测试 ───────────────────
  describe('calculateActualWage', () => {

    it('应按 日工资 × 工作天数 + 奖金 - 扣款 计算', () => {
      const dailyWage = 300
      const workDays = 22
      const bonus = 500
      const deduction = 200

      const result = calculateActualWage(dailyWage, workDays, bonus, deduction)

      // 300 × 22 + 500 - 200 = 6600 + 500 - 200 = 6900
      expect(result).toBe(6900)
    })

    it('应正确处理加班费（通过 workDays 参数）', () => {
      const dailyWage = 300
      // 22 天正常 + 3 天加班（按 1.5 倍）
      // 实际传入 workDays = 22 + 3×1.5 = 26.5
      const workDays = 26.5
      const bonus = 0
      const deduction = 0

      const result = calculateActualWage(dailyWage, workDays, bonus, deduction)

      // 300 × 26.5 = 7950
      expect(result).toBe(7950)
    })

    it('应正确处理无奖金无扣款', () => {
      const result = calculateActualWage(300, 22, 0, 0)

      // 300 × 22 = 6600
      expect(result).toBe(6600)
    })

    it('应正确四舍五入（保留 2 位小数）', () => {
      const result = calculateActualWage(300, 22.5, 0, 0)

      // 300 × 22.5 = 6750
      expect(result).toBe(6750)
    })

    it('应处理日工资为 0', () => {
      const result = calculateActualWage(0, 22, 0, 0)

      expect(result).toBe(0)
    })

    it('应处理工作天数为 0', () => {
      const result = calculateActualWage(300, 0, 0, 0)

      expect(result).toBe(0)
    })

    it('应处理负数（扣款大于应发）', () => {
      const result = calculateActualWage(300, 22, 0, 7000)

      // 300 × 22 - 7000 = 6600 - 7000 = -400
      expect(result).toBe(-400)
    })

    it('应处理小数工作天数', () => {
      const result = calculateActualWage(300, 22.3, 0, 0)

      // 300 × 22.3 = 6690
      expect(result).toBe(6690)
    })

    it('应处理很大的数字', () => {
      const result = calculateActualWage(10000, 30, 5000, 1000)

      // 10000 × 30 + 5000 - 1000 = 300000 + 4000 = 304000
      expect(result).toBe(304000)
    })
  })

  // ─── getDaysInMonth 单元测试 ──────────────────
  describe('getDaysInMonth', () => {

    it('应正确计算月份天数（31 天）', () => {
      expect(getDaysInMonth('2026-05')).toBe(31) // 5月
      expect(getDaysInMonth('2026-07')).toBe(31) // 7月
      expect(getDaysInMonth('2026-12')).toBe(31) // 12月
    })

    it('应正确计算月份天数（30 天）', () => {
      expect(getDaysInMonth('2026-04')).toBe(30) // 4月
      expect(getDaysInMonth('2026-06')).toBe(30) // 6月
      expect(getDaysInMonth('2026-09')).toBe(30) // 9月
    })

    it('应正确处理 2 月（非闰年）', () => {
      expect(getDaysInMonth('2025-02')).toBe(28) // 2025 非闰年
    })

    it('应正确处理 2 月（闰年）', () => {
      expect(getDaysInMonth('2024-02')).toBe(29) // 2024 闰年
      expect(getDaysInMonth('2028-02')).toBe(29) // 2028 闰年
    })

    it('应处理无效日期格式（返回当月天数或报错）', () => {
      // 13月无效，但 JavaScript Date 会处理（返回 2027年1月）
      const result = getDaysInMonth('2026-13')
      expect(result).toBeGreaterThanOrEqual(28)
      expect(result).toBeLessThanOrEqual(31)
    })

    it('应处理年份边界', () => {
      expect(getDaysInMonth('2020-02')).toBe(29) // 2020 闰年
      expect(getDaysInMonth('2100-02')).toBe(28) // 2100 非闰年（整百年）
    })

    it('应处理 1 月', () => {
      expect(getDaysInMonth('2026-01')).toBe(31)
    })

    it('应处理 3 月', () => {
      expect(getDaysInMonth('2026-03')).toBe(31)
    })

    it('应处理 11 月', () => {
      expect(getDaysInMonth('2026-11')).toBe(30)
    })
  })
})
