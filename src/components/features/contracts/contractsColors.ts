// contractsColors.ts - 合同模块图表调色板
// ContractDashboard 渲染收入/支出/回款/付款/协议饼图+柱图时使用。
// recharts fill/color props 强制需要 hex，不可替换为 CSS 变量。
// Tailwind 等价类: emerald-500, red-500, blue-500, amber-500, sky-500

export const COLORS = {
  income:     '#10b981',  // emerald-500 — 收入合同
  expense:    '#ef4444',  // red-500 — 支出合同
  received:   '#3b82f6',  // blue-500 — 已回款
  paid:       '#f59e0b',  // amber-500 — 已付款
  agreement:  '#0ea5e9',  // sky-500 — 其他协议
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.income,
  COLORS.expense,
  COLORS.received,
  COLORS.paid,
  COLORS.agreement,
]
