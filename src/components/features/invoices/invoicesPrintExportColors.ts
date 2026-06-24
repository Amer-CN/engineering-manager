// invoicesPrintExportColors.ts - 发票打印导出 HTML 模板色板
// invoices/printExport.ts 生成发票/收款单打印 HTML 时使用。
// HTML 字符串拼接强制需要 hex，不可替换为 CSS 变量。
// Tailwind 等价类: emerald-600

export const COLORS = {
  borderDark:    '#333',     // 无精确 Tailwind 对应 — 深灰主边框
  successGreen:  '#059669',  // emerald-600 — 已收/成功绿
  borderLight:   '#ddd',     // 无精确 Tailwind 对应 — 浅灰辅助边框
  headerBg:      '#f5f5f5',  // neutral-100 — 表头/标题背景
  textMuted:     '#666',     // 无精确 Tailwind 对应 — 中灰提示文本
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.borderDark,
  COLORS.successGreen,
  COLORS.borderLight,
  COLORS.headerBg,
  COLORS.textMuted,
]
