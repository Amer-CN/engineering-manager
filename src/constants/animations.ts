/**
 * Shared framer-motion animation variants for Dashboard-style pages.
 * Import these instead of defining local duplicates.
 */

/** Emil ease-out 曲线（= CSS token var(--ease-out)）的 framer-motion cubic-bezier 形式，全库统一曲线源头 */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

/** Stagger container — wrap a group of sections so they animate in sequence */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
} as const

/** Section variant — fade + slide up for each content block */
export const sectionVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
} as const

/**
 * 首次链条入场（登录页 / Dashboard 首屏共用）——"启动→登录→进首页"第一章编排。
 * 页面级容器只做 opacity（防与 App.tsx 页面切换 0.15s 淡入叠加），位移只发生在内容块级。
 */
export const chapterEntrance = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT, staggerChildren: 0.06 } },
} as const

/** 单个内容块 —— 淡入 + 上移 12px */
export const itemRise = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
} as const

/** 品牌标 —— 淡入 + 上移 8px + 从 0.94 起步放大（Emil 规范禁 scale(0)） */
export const logoRise = {
  hidden: { opacity: 0, y: 8, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE_OUT } },
} as const

/** Page-level transition — simple fade in */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
} as const
