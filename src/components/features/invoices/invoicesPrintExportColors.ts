// invoicesPrintExportColors.ts - 发票打印导出 HTML 模板色板
// invoices/printExport.ts 生成发票/收款单打印 HTML 时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  borderDark:    '#333',     // 主边框（深灰，用于表格主分隔线）
  successGreen:  '#059669',  // 已收/成功绿 (emerald-600)
  borderLight:   '#ddd',     // 辅助边框（浅灰）
  headerBg:      '#f5f5f5',  // 表头/标题背景
  textMuted:     '#666',     // 提示文本（中灰）
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.borderDark,
  COLORS.successGreen,
  COLORS.borderLight,
  COLORS.headerBg,
  COLORS.textMuted,
]
