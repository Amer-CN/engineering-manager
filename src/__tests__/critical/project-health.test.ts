/**
 * 测试 12: 项目健康度计算测试 🟡 P2
 * 
 * 验证项目健康度评分逻辑正确性
 */

// ══════════════════════════════
// 从 src/utils/projectHealth.ts 复制的纯函数
// ══════════════════════════════

/**
 * 计算项目健康度评分 (0-100)
 * 维度：预算控制(40%) + 合同执行(30%) + 发票管理(30%)
 */
function calculateHealthScore(
  project: { budget: number },
  stats: {
    totalExpenses: number
    incomeTotal: number
    receivedInTotal: number
    invoiceInTotal: number
  }
): number {
  // 1. 预算控制得分 (预算使用率越低得分越高)
  const budgetUsage = stats.totalExpenses / (project.budget || 1)
  const budgetScore = Math.max(0, Math.min(100, 100 - budgetUsage * 100))

  // 2. 合同执行得分 (收入合同执行率)
  const contractScore = stats.incomeTotal > 0
    ? Math.min(100, (stats.receivedInTotal / stats.incomeTotal) * 100)
    : 100

  // 3. 发票管理得分 (发票核销率)
  const invoiceScore = stats.invoiceInTotal > 0
    ? Math.min(100, (stats.receivedInTotal / stats.invoiceInTotal) * 100)
    : 100

  // 加权计算
  const score = budgetScore * 0.4 + contractScore * 0.3 + invoiceScore * 0.3
  return Math.round(score)
}

/**
 * 获取健康度评级
 */
function getHealthLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: '健康', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
  if (score >= 60) return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-50' }
  if (score >= 40) return { label: '预警', color: 'text-amber-600', bgColor: 'bg-amber-50' }
  return { label: '危险', color: 'text-red-600', bgColor: 'bg-red-50' }
}

// ══════════════════════════════
// 测试
// ══════════════════════════════

import { describe, it, expect } from 'vitest'

describe('项目健康度计算', () => {
  // ─── calculateHealthScore ──────────────────────
  describe('calculateHealthScore', () => {
    const baseProject = { budget: 1000000 }
    const baseStats = {
      totalExpenses: 300000,
      incomeTotal: 500000,
      receivedInTotal: 400000,
      invoiceInTotal: 450000,
    }

    it('应返回 0-100 之间的整数', () => {
      const score = calculateHealthScore(baseProject, baseStats)
      expect(Number.isInteger(score)).toBe(true)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('预算使用率低 → 高分', () => {
      const score = calculateHealthScore(baseProject, {
        ...baseStats,
        totalExpenses: 100000 // 只用了 10% 预算
      })
      expect(score).toBeGreaterThanOrEqual(70)
    })

    it('预算使用率高 → 分数偏低', () => {
      const score = calculateHealthScore({ budget: 100000 }, {
        ...baseStats,
        totalExpenses: 90000 // 90% 预算用完
      })
      expect(score).toBeLessThanOrEqual(60)
    })

    it('预算为 0 时不应崩溃', () => {
      const score = calculateHealthScore({ budget: 0 }, baseStats)
      expect(Number.isInteger(score)).toBe(true)
    })

    it('合同收款率高 → 分数更高', () => {
      const lowCollection = calculateHealthScore(baseProject, {
        ...baseStats,
        receivedInTotal: 100000 // 收款率 20%
      })
      const highCollection = calculateHealthScore(baseProject, {
        ...baseStats,
        receivedInTotal: 480000 // 收款率 96%
      })
      expect(highCollection).toBeGreaterThan(lowCollection)
    })

    it('incomeTotal 为 0 时合同分数应为 100', () => {
      const score = calculateHealthScore(baseProject, {
        ...baseStats,
        incomeTotal: 0,
        receivedInTotal: 0,
        // invoiceInTotal 仍为 450000，receivedInTotal=0 → invoiceScore 低
        // 但 contractScore = 100，budgetScore ≈ 70
      })
      // budgetScore=70, contractScore=100, invoiceScore=0
      // score = 70*0.4 + 100*0.3 + 0*0.3 = 28+30+0 = 58
      expect(score).toBeGreaterThanOrEqual(50)
    })

    it('发票核销率影响分数', () => {
      const lowInvoice = calculateHealthScore(baseProject, {
        ...baseStats,
        invoiceInTotal: 500000,
        receivedInTotal: 200000 // 核销率 40%
      })
      const highInvoice = calculateHealthScore(baseProject, {
        ...baseStats,
        invoiceInTotal: 500000,
        receivedInTotal: 480000 // 核销率 96%
      })
      expect(highInvoice).toBeGreaterThan(lowInvoice)
    })

    it('invoiceInTotal 为 0 时发票分数应为 100', () => {
      const score = calculateHealthScore(baseProject, {
        ...baseStats,
        invoiceInTotal: 0,
      })
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('全部为 0 的极端情况', () => {
      const score = calculateHealthScore({ budget: 0 }, {
        totalExpenses: 0,
        incomeTotal: 0,
        receivedInTotal: 0,
        invoiceInTotal: 0,
      })
      expect(Number.isInteger(score)).toBe(true)
      // budgetUsage = 0/1 = 0 → budgetScore = 100
      // incomeTotal = 0 → contractScore = 100
      // invoiceInTotal = 0 → invoiceScore = 100
      expect(score).toBe(100)
    })

    it('应正确加权计算', () => {
      // 预算使用 30%，收款率 80%，核销率 ~89%
      const score = calculateHealthScore(
        { budget: 1000000 },
        {
          totalExpenses: 300000,
          incomeTotal: 500000,
          receivedInTotal: 400000,
          invoiceInTotal: 450000,
        }
      )

      // budgetScore = 100 - 30 = 70
      // contractScore = 80% * 100 = 80
      // invoiceScore = 88.89% * 100 = 88.89
      // score = 70*0.4 + 80*0.3 + 88.89*0.3 = 28 + 24 + 26.667 = 78.667
      // rounded = 79
      expect(score).toBe(79)
    })
  })

  // ─── getHealthLevel ──────────────────────
  describe('getHealthLevel', () => {
    it('80+ → 健康', () => {
      const result = getHealthLevel(85)
      expect(result.label).toBe('健康')
      expect(result.color).toBe('text-emerald-600')
      expect(result.bgColor).toBe('bg-emerald-50')
    })

    it('60~79 → 良好', () => {
      const result = getHealthLevel(65)
      expect(result.label).toBe('良好')
      expect(result.color).toBe('text-blue-600')
    })

    it('40~59 → 预警', () => {
      const result = getHealthLevel(45)
      expect(result.label).toBe('预警')
      expect(result.color).toBe('text-amber-600')
    })

    it('40 以下 → 危险', () => {
      const result = getHealthLevel(20)
      expect(result.label).toBe('危险')
      expect(result.color).toBe('text-red-600')
    })

    it('边界值：80 → 健康', () => {
      expect(getHealthLevel(80).label).toBe('健康')
    })

    it('边界值：60 → 良好', () => {
      expect(getHealthLevel(60).label).toBe('良好')
    })

    it('边界值：40 → 预警', () => {
      expect(getHealthLevel(40).label).toBe('预警')
    })

    it('边界值：0 → 危险', () => {
      expect(getHealthLevel(0).label).toBe('危险')
    })

    it('边界值：100 → 健康', () => {
      expect(getHealthLevel(100).label).toBe('健康')
    })
  })
})
