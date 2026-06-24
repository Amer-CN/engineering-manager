// dashboardColors.ts - 仪表盘模块图表调色板
// 集中管理 Dashboard 页面 recharts 饼图/柱图等需要 hex 字面量的场景。
// 优先使用 Tailwind 类（slate/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  // 发票状态色（Dashboard 概览页 invoice status 饼图）
  fallbackCategory:     '#9ca3af', // Tailwind: gray-400
  invoiceReceived:      '#10b981', // Tailwind: emerald-500
  invoicePartiallyPaid: '#f59e0b', // Tailwind: amber-500
  invoiceIssued:        '#3b82f6', // Tailwind: blue-500
  invoiceCancelled:     '#94a3b8', // Tailwind: slate-400
  invoiceRedFlushed:    '#ef4444', // Tailwind: red-500
  invoiceFallback:      '#94a3b8', // Tailwind: slate-400

  // 通用 chart fallback 色（DashboardCharts 成本分类柱图循环用）
  chartBlue:    '#3b82f6', // Tailwind: blue-500
  chartEmerald: '#10b981', // Tailwind: emerald-500
  chartOrange:  '#f97316', // Tailwind: orange-500
  chartViolet:  '#8b5cf6', // Tailwind: violet-500
  chartTeal:    '#06b6d4', // Tailwind: cyan-500
  chartAmber:   '#f59e0b', // Tailwind: amber-500
} as const

/** 发票状态饼图 palette（按 invoiceReceived → fallbackCategory 顺序） */
export const CHART_PALETTE: readonly string[] = [
  COLORS.invoiceReceived,
  COLORS.invoicePartiallyPaid,
  COLORS.invoiceIssued,
  COLORS.invoiceCancelled,
  COLORS.invoiceRedFlushed,
  COLORS.invoiceFallback,
  COLORS.fallbackCategory,
]

/** 通用分类柱图 fallback palette（DashboardCharts 循环用） */
export const CHART_COLORS: string[] = [
  COLORS.chartBlue,
  COLORS.chartEmerald,
  COLORS.chartOrange,
  COLORS.chartViolet,
  COLORS.chartTeal,
  COLORS.chartAmber,
]
