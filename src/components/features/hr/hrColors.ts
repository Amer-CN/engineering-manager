// hrColors.ts - 人事模块图表调色板
// 集中管理 recharts 饼图/柱图等需要 hex 字面量的场景。
// 优先使用 Tailwind 类（slate/indigo/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  indigo:   '#6366f1', // Tailwind: indigo-500
  emerald:  '#10b981', // Tailwind: emerald-500
  amber:    '#f59e0b', // Tailwind: amber-500
  red:      '#ef4444', // Tailwind: red-500
  violet:   '#8b5cf6', // Tailwind: violet-500
  cyan:     '#06b6d4', // Tailwind: cyan-500
  orange:   '#f97316', // Tailwind: orange-500
  lime:     '#84cc16', // Tailwind: lime-500
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.indigo,
  COLORS.emerald,
  COLORS.amber,
  COLORS.red,
  COLORS.violet,
  COLORS.cyan,
  COLORS.orange,
  COLORS.lime,
]
