/**
 * 工人管理模块主题常量
 * Bedrock: 模块品牌色已统一为 accent/primary（无独立色系）
 */
export const LABOR_THEME = {
  primary: '[color:var(--accent)]',
  primaryHover: '[color:var(--accent)]',
  primaryRing: '[color:var(--accent-soft)]',
  primaryLight: '[color:var(--accent-soft)]',
  primaryLighter: '[color:var(--accent-soft)]',
  tabIndicator: 'bg-[color:var(--accent)]',
  spinner: 'border-t-[color:var(--accent)]',
  text: 'text-[color:var(--accent)]',
  bg: 'bg-[color:var(--accent)]',
  bgHover: 'hover:opacity-90',
  bgLight: 'bg-[color:var(--accent-soft)]',
  border: 'border-[color:var(--border)]',
  ring: 'focus:ring-[color:var(--accent-soft)]',
} as const

export const LABOR_TAB_KEY = 'labor_active_tab'
