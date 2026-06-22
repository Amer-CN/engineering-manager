// dashboardColors.ts - 仪表盘模块图表调色板
// 集中管理 Dashboard 页面 recharts 饼图/柱图等需要 hex 字面量的场景。
// 优先使用 Tailwind 类（slate/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  fallbackCategory:     '#9ca3af',
  invoiceReceived:      '#10b981',
  invoicePartiallyPaid: '#f59e0b',
  invoiceIssued:        '#3b82f6',
  invoiceCancelled:     '#94a3b8',
  invoiceRedFlushed:    '#ef4444',
  invoiceFallback:      '#94a3b8',
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.invoiceReceived,
  COLORS.invoicePartiallyPaid,
  COLORS.invoiceIssued,
  COLORS.invoiceCancelled,
  COLORS.invoiceRedFlushed,
  COLORS.invoiceFallback,
  COLORS.fallbackCategory,
]
