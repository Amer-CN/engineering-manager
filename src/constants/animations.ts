/**
 * Shared framer-motion animation variants for Dashboard-style pages.
 * Import these instead of defining local duplicates.
 */

/** Emil ease-out 曲线（= CSS token var(--ease-out)）的 framer-motion cubic-bezier 形式，全库统一曲线源头 */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

/** Stagger container — wrap a group of sections so they animate in sequence */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
} as const

/** Section variant — fade + slide up for each content block */
export const sectionVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
} as const

/** Page-level transition — simple fade in */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
} as const
