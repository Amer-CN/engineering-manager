// settlementColors.ts - 结算模块打印/预览模板色板
// SettlementProjectActions / useSettlementHandlers / SettlementPrintTemplate 渲染结算凭证/打印页时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  bodyBg:         '#f1f5f9',   // 整体页面背景 (slate-100)
  cardBg:         '#fff',      // 凭证卡片背景
  cardBorder:     '#e2e8f0',   // 凭证卡片边框 (slate-200)
  primary:        '#6366f1',   // 链接/强调色 (indigo-500)
  mutedText:      '#94a3b8',   // 提示文本 (slate-400)
  secondaryText:  '#666',      // 副文本（中灰，用于 SettlementPrintTemplate 结算单号）
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.bodyBg,
  COLORS.cardBg,
  COLORS.cardBorder,
  COLORS.primary,
  COLORS.mutedText,
  COLORS.secondaryText,
]
