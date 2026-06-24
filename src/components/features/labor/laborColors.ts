// laborColors.ts - 工人模块图表调色板
// 集中管理 recharts 饼图/柱图等需要 hex 字面量的场景。
// 优先使用 Tailwind 类（slate/amber/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  amber:      '#f59e0b', // Tailwind: amber-500
  emerald:    '#10b981', // Tailwind: emerald-500
  indigo:     '#6366f1', // Tailwind: indigo-500
  red:        '#ef4444', // Tailwind: red-500
  violet:     '#8b5cf6', // Tailwind: violet-500
  cyan:       '#06b6d4', // Tailwind: cyan-500
  orange:     '#f97316', // Tailwind: orange-500
  teal:       '#14b8a6', // Tailwind: teal-500
  rose:       '#e11d48', // Tailwind: rose-600
  violetDark: '#7c3aed', // Tailwind: violet-600
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.amber,
  COLORS.emerald,
  COLORS.indigo,
  COLORS.red,
  COLORS.violet,
  COLORS.cyan,
  COLORS.orange,
  COLORS.teal,
  COLORS.rose,
  COLORS.violetDark,
]
