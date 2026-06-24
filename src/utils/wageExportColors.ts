// wageExportColors.ts - 工资表导出 HTML 模板色板
// utils/wage-export.ts 生成工资结算/支付汇总表 HTML 时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  settled:        '#059669',  // Tailwind: emerald-600
  pending:        '#d97706',  // Tailwind: amber-600
  textBody:       '#333',     // Tailwind: slate-800 (近似)
  textSub:        '#666',     // Tailwind: gray-500 (近似)
  borderTable:    '#bbb',     // Tailwind: gray-300 (近似)
  bgTableHeader:  '#f1f5f9',  // Tailwind: slate-100
  textFooter:     '#999',     // Tailwind: gray-400 (近似)
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.settled,
  COLORS.pending,
  COLORS.textBody,
  COLORS.textSub,
  COLORS.borderTable,
  COLORS.bgTableHeader,
  COLORS.textFooter,
]
