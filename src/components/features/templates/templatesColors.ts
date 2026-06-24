// templatesColors.ts - 模板模块预览/打印色板
// TemplatePreview / TemplateGenerate 等模板渲染组件生成预览 HTML 时使用。
// 内联 style={{}} + dangerouslySetInnerHTML 强制需要 hex，不可替换为 CSS 变量。
// Tailwind 等价类: slate-400, slate-500, indigo-500, red-500

export const COLORS = {
  textMuted:   '#94a3b8',   // slate-400 — 提示文本
  textSubtle:  '#64748b',   // slate-500 — 次要文本
  primary:     '#6366f1',   // indigo-500 — 强调色
  white:       '#fff',      // white — 白色背景
  danger:      '#ef4444',   // red-500 — 错误提示
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.textMuted,
  COLORS.textSubtle,
  COLORS.primary,
  COLORS.white,
  COLORS.danger,
]
