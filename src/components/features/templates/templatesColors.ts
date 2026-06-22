// templatesColors.ts - 模板模块预览/打印色板
// TemplatePreview / TemplateGenerate 等模板渲染组件生成预览 HTML 时使用。
// 优先使用 Tailwind 类（slate/indigo/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  textMuted:   '#94a3b8',   // 提示文本 (slate-400)
  textSubtle:  '#64748b',   // 次要文本 (slate-500)
  primary:     '#6366f1',   // 强调色 (indigo-500)
  white:       '#fff',      // 白色背景
  danger:      '#ef4444',   // 错误提示 (red-500)
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.textMuted,
  COLORS.textSubtle,
  COLORS.primary,
  COLORS.white,
  COLORS.danger,
]
