// projectsColors.ts - 项目模块图表调色板
// 集中管理 recharts 饼图/柱图等需要 hex 字面量的场景。
// 优先使用 Tailwind 类（slate/blue/...），仅当 recharts 强制需要 hex 时引用本字典。

export const COLORS = {
  // 原始调色板（ProjectCommandCenter 用途：成本/财务/健康度图表）
  blue:         '#3b82f6',
  emerald:      '#10b981',
  orange:       '#f97316',
  purple:       '#8b5cf6',
  lightEmerald: '#34d399',
  red:          '#ef4444',
  lightRed:     '#f87171',
  amber:        '#f59e0b',

  // 健康度语义色（ProjectCard HealthRing 用途：>=80 / >=60 / >=40 / <40）
  healthGood:     '#10b981',
  healthModerate: '#3b82f6',
  healthWarning:  '#f59e0b',
  healthCritical: '#ef4444',
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.blue,
  COLORS.emerald,
  COLORS.orange,
  COLORS.purple,
  COLORS.lightEmerald,
  COLORS.red,
  COLORS.lightRed,
  COLORS.amber,
  COLORS.healthGood,
  COLORS.healthModerate,
  COLORS.healthWarning,
  COLORS.healthCritical,
]
