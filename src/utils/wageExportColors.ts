// wageExportColors.ts - 工资表导出 HTML 模板色板
// utils/wage-export.ts 生成工资结算/支付汇总表 HTML 时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  settled:        '#059669',  // 已结清绿 (emerald-600)
  pending:        '#d97706',  // 待付橙 (amber-600)
  textBody:       '#333',     // 正文文本（深灰）
  textSub:        '#666',     // 副文本（中灰）
  borderTable:    '#bbb',     // 表格边框
  bgTableHeader:  '#f1f5f9',  // 表头背景 (slate-100)
  textFooter:     '#999',     // 页脚文本（浅灰）
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
