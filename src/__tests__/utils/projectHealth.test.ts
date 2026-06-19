import {
  calculateHealthScore,
  getHealthLevel,
  categorizeExpense,
  calculateCostBreakdown,
} from '../../utils/projectHealth'

describe('projectHealth.ts', () => {
  // ─── calculateHealthScore ────────────────────────────────────────
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
        totalExpenses: 100000, // 只用了 10% 预算
      })
      expect(score).toBeGreaterThanOrEqual(70)
    })

    it('预算使用率高 → 分数偏低', () => {
      const score = calculateHealthScore({ budget: 100000 }, {
        ...baseStats,
        totalExpenses: 90000, // 90% 预算用完
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
        receivedInTotal: 100000, // 收款率 20%
      })
      const highCollection = calculateHealthScore(baseProject, {
        ...baseStats,
        receivedInTotal: 480000, // 收款率 96%
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
        receivedInTotal: 200000, // 核销率 40%
      })
      const highInvoice = calculateHealthScore(baseProject, {
        ...baseStats,
        invoiceInTotal: 500000,
        receivedInTotal: 480000, // 核销率 96%
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
  })

  // ─── getHealthLevel ──────────────────────────────────────────────
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

  // ─── categorizeExpense ───────────────────────────────────────────
  describe('categorizeExpense', () => {
    it('人工费类别 → 人', () => {
      expect(categorizeExpense('人工费')).toBe('人')
      expect(categorizeExpense('工资')).toBe('人')
      expect(categorizeExpense('劳务费')).toBe('人')
      expect(categorizeExpense('管理人员薪酬')).toBe('人')
      expect(categorizeExpense('社保')).toBe('人')
      expect(categorizeExpense('公积金')).toBe('人')
      expect(categorizeExpense('现场管理费')).toBe('人')
    })

    it('材料费类别 → 材', () => {
      expect(categorizeExpense('材料费')).toBe('材')
      expect(categorizeExpense('材料采购')).toBe('材')
      expect(categorizeExpense('建材')).toBe('材')
      expect(categorizeExpense('石材')).toBe('材')
      expect(categorizeExpense('钢材')).toBe('材')
      expect(categorizeExpense('水泥')).toBe('材')
    })

    it('机械费类别 → 机', () => {
      expect(categorizeExpense('机械费')).toBe('机')
      expect(categorizeExpense('设备租赁')).toBe('机')
      expect(categorizeExpense('机械租赁')).toBe('机')
      expect(categorizeExpense('台班费')).toBe('机')
    })

    it('不匹配 → 其他', () => {
      expect(categorizeExpense('差旅费')).toBe('其他')
      expect(categorizeExpense('办公费')).toBe('其他')
      expect(categorizeExpense('')).toBe('其他')
    })

    it('部分匹配也应识别', () => {
      expect(categorizeExpense('钢筋工人工资')).toBe('人') // 先匹配 "工资"
      expect(categorizeExpense('水泥材料费')).toBe('材') // 匹配 "材料费"
    })
  })

  // ─── calculateCostBreakdown ──────────────────────────────────────
  describe('calculateCostBreakdown', () => {
    it('空对象 → 全部为 0', () => {
      const result = calculateCostBreakdown({})
      expect(result).toEqual({
        labor: 0,
        material: 0,
        machinery: 0,
        other: 0,
        total: 0,
      })
    })

    it('应正确分类并汇总', () => {
      const result = calculateCostBreakdown({
        '人工费': 50000,
        '材料费': 30000,
        '机械费': 20000,
        '差旅费': 5000,
      })
      expect(result.labor).toBe(50000)
      expect(result.material).toBe(30000)
      expect(result.machinery).toBe(20000)
      expect(result.other).toBe(5000)
      expect(result.total).toBe(105000)
    })

    it('多类别累加', () => {
      const result = calculateCostBreakdown({
        '工资': 30000,
        '社保': 10000,
        '材料采购': 20000,
        '建材': 15000,
        '设备租赁': 8000,
        '办公费': 3000,
      })
      expect(result.labor).toBe(40000)
      expect(result.material).toBe(35000)
      expect(result.machinery).toBe(8000)
      expect(result.other).toBe(3000)
      expect(result.total).toBe(86000)
    })
  })
})
