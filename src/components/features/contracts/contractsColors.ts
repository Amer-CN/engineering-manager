// contractsColors.ts - 合同模块图表调色板
// ContractDashboard 渲染收入/支出/回款/付款/协议饼图+柱图时使用。
// 优先使用 Tailwind 类（emerald/red/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  income:     '#10b981',  // 收入合同 (emerald-500)
  expense:    '#ef4444',  // 支出合同 (red-500)
  received:   '#3b82f6',  // 已回款 (blue-500)
  paid:       '#f59e0b',  // 已付款 (amber-500)
  agreement:  '#0ea5e9',  // 其他协议 (sky-500)
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.income,
  COLORS.expense,
  COLORS.received,
  COLORS.paid,
  COLORS.agreement,
]
