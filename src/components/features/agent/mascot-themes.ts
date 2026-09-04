/**
 * mascot-themes.ts — 吉祥物三主题颜色适配（纯数据 + 查表，无 React）。
 * 设计依据：眼睛对比身体（浅身深眼/深身浅眼）、身体对比页面（与页面低对比的组合加描边）。
 * 主题分组：data-theme white/sandstone → light 组，graphite → dark 组（ThemeScheme 集合封闭）。
 *
 * 矩阵（body / eyes / stroke；stroke=null 不描边）：
 * | 选项 | light 组 | dark 组 |
 * |---|---|---|
 * | encre 墨黑 | #0a0a0c / #f9f9f9 / 无 | #0a0a0c / #f9f9f9 / rgba(241,239,233,0.25) |
 * | creme 米白 | #f1efe9 / #26231e / rgba(10,10,12,0.30) | #f1efe9 / #26231e / 无 |
 * | ambre 琥珀 | #f0b429 / #26231e / 无 | #f0b429 / #26231e / 无 |
 */

/** light 组 = white/sandstone 页面；dark 组 = graphite 页面 */
export type MascotThemeGroup = 'light' | 'dark'

/** 单个主题组下的外观：身体填充、眼睛填充、身体描边（null = 不描边） */
export type Variant = { body: string; eyes: string; stroke: string | null }

/** graphite → dark，其余（含 null/未知值）→ light */
export function resolveThemeGroup(dataTheme: string | null): MascotThemeGroup {
  return dataTheme === 'graphite' ? 'dark' : 'light'
}

/** notch 衬底：三主题 --bg 的 oklch 手工近似 hex（主题集合封闭，查表合法）；未知键回退 #f9f9f9 */
export const PAPER_BY_THEME: Record<string, string> = {
  white: '#f7f3ea',
  sandstone: '#fbfbfb',
  graphite: '#2e2d29',
}

export function resolvePaper(dataTheme: string | null): string {
  return PAPER_BY_THEME[dataTheme ?? ''] ?? '#f9f9f9'
}

/** 颜色选项 × 主题组变体矩阵（数值已定，勿改） */
export const MASCOT_VARIANTS: Record<string, { light: Variant; dark: Variant }> = {
  encre: {
    light: { body: '#0a0a0c', eyes: '#f9f9f9', stroke: null },
    dark: { body: '#0a0a0c', eyes: '#f9f9f9', stroke: 'rgba(241,239,233,0.25)' },
  },
  creme: {
    light: { body: '#f1efe9', eyes: '#26231e', stroke: 'rgba(10,10,12,0.30)' },
    dark: { body: '#f1efe9', eyes: '#26231e', stroke: null },
  },
  ambre: {
    light: { body: '#f0b429', eyes: '#26231e', stroke: null },
    dark: { body: '#f0b429', eyes: '#26231e', stroke: null },
  },
}

/** 非法 colorId 回退 encre.light（与 Mascot 现有回退一致） */
export function resolveVariant(colorId: string, group: MascotThemeGroup): Variant {
  return MASCOT_VARIANTS[colorId]?.[group] ?? MASCOT_VARIANTS.encre.light
}
