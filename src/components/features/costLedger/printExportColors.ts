// printExportColors.ts - 成本台账打印导出模板色板
// costLedger/printExport.ts 生成经营/收入汇总报表 HTML 时使用。
// HTML 字符串拼接强制需要 hex，不可替换为 CSS 变量。
// Tailwind 等价类: slate-100, red-600, emerald-600

export const COLORS = {
  textPrimary:    '#333',     // 无精确 Tailwind 对应 — 深灰主文本
  textSecondary:  '#666',     // 无精确 Tailwind 对应 — 中灰副文本
  border:         '#ccc',     // 无精确 Tailwind 对应 — 表格边框
  tableHeaderBg:  '#f1f5f9',  // slate-100 — 表头背景
  expense:        '#dc2626',  // red-600 — 支出红
  income:         '#059669',  // emerald-600 — 收入绿
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.textPrimary,
  COLORS.textSecondary,
  COLORS.border,
  COLORS.tableHeaderBg,
  COLORS.expense,
  COLORS.income,
]
