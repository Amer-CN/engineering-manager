/**
 * 项目健康度评分工具函数
 */

/**
 * 计算项目健康度评分 (0-100)
 * 维度：预算控制(40%) + 合同执行(30%) + 发票管理(30%)
 */
export function calculateHealthScore(
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
export function getHealthLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: '健康', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
  if (score >= 60) return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-50' }
  if (score >= 40) return { label: '预警', color: 'text-amber-600', bgColor: 'bg-amber-50' }
  return { label: '危险', color: 'text-red-600', bgColor: 'bg-red-50' }
}

/**
 * 人材机成本分类
 */
const LABOR_CATEGORIES = ['人工费', '工资', '劳务费', '管理人员薪酬', '社保', '公积金', '现场管理费']
const MATERIAL_CATEGORIES = ['材料费', '材料采购', '建材', '石材', '钢材', '水泥']
const MACHINERY_CATEGORIES = ['机械费', '设备租赁', '机械租赁', '台班费']

export function categorizeExpense(category: string): '人' | '材' | '机' | '其他' {
  if (LABOR_CATEGORIES.some(c => category.includes(c))) return '人'
  if (MATERIAL_CATEGORIES.some(c => category.includes(c))) return '材'
  if (MACHINERY_CATEGORIES.some(c => category.includes(c))) return '机'
  return '其他'
}

export interface CostBreakdown {
  labor: number
  material: number
  machinery: number
  other: number
  total: number
}

export function calculateCostBreakdown(expenseByCategory: Record<string, number>): CostBreakdown {
  const result: CostBreakdown = {
    labor: 0,
    material: 0,
    machinery: 0,
    other: 0,
    total: 0
  }

  const typeToKey: Record<string, keyof CostBreakdown> = {
    '人': 'labor',
    '材': 'material',
    '机': 'machinery',
    '其他': 'other'
  }

  Object.entries(expenseByCategory).forEach(([category, amount]) => {
    const type = categorizeExpense(category)
    const key = typeToKey[type]
    if (key && key !== 'total') {
      result[key] += amount
    }
    result.total += amount
  })

  return result
}
