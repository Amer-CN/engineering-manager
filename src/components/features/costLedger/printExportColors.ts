// printExportColors.ts - 成本台账打印导出模板色板
// costLedger/printExport.ts 生成经营/收入汇总报表 HTML 时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  textPrimary:    '#333',     // 主文本（深灰）
  textSecondary:  '#666',     // 副文本（中灰）
  border:         '#ccc',     // 表格边框
  tableHeaderBg:  '#f1f5f9',  // 表头背景 (slate-100)
  expense:        '#dc2626',  // 支出红 (red-600)
  income:         '#059669',  // 收入绿 (emerald-600)
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.textPrimary,
  COLORS.textSecondary,
  COLORS.border,
  COLORS.tableHeaderBg,
  COLORS.expense,
  COLORS.income,
]
