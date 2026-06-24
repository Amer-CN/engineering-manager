// settlementColors.ts - 结算模块打印/预览模板色板
// SettlementProjectActions / useSettlementHandlers / SettlementPrintTemplate 渲染结算凭证/打印页时使用。
// 内联 style={{}} 强制需要 hex，不可替换为 CSS 变量。
// Tailwind 等价类: slate-100, slate-200, indigo-500, slate-400

export const COLORS = {
  bodyBg:         '#f1f5f9',   // slate-100 — 整体页面背景
  cardBg:         '#fff',      // white — 凭证卡片背景
  cardBorder:     '#e2e8f0',   // slate-200 — 凭证卡片边框
  primary:        '#6366f1',   // indigo-500 — 链接/强调色
  mutedText:      '#94a3b8',   // slate-400 — 提示文本
  secondaryText:  '#666',      // 无精确 Tailwind 对应 — 中灰副文本
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.bodyBg,
  COLORS.cardBg,
  COLORS.cardBorder,
  COLORS.primary,
  COLORS.mutedText,
  COLORS.secondaryText,
]
