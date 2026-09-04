/**
 * mascot-themes.ts — 吉祥物三主题颜色适配（纯数据 + 亮度推导，无 React）。
 * 设计依据：眼睛对比身体（浅身深眼/深身浅眼）、身体对比页面（与页面低对比的组合加描边）。
 * 主题分组：data-theme white/sandstone → light 组，graphite → dark 组（ThemeScheme 集合封闭）。
 *
 * 变体由亮度规则自动推导（标准 sRGB 相对亮度），覆盖全部 12 个官方色：
 * - 眼色：bodyLum > 0.45 → #26231e（浅身深眼），否则 #f9f9f9（深身浅眼）
 * - 描边：|bodyLum - bgLum| < 0.25 → 描边（dark 组浅描边、light 组深描边，与页面反差），否则 null
 */

import { COLORS } from './bloub/bot/skins'

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

/** 全部 12 个官方身体色（单一真源：vendored bloub/bot/skins 的 COLORS 派生，不手抄 hex） */
export const BODY_COLORS: Record<string, string> = Object.fromEntries(
  COLORS.map((c) => [c.id, c.hex] as [string, string])
)

/** 标准 sRGB 相对亮度（WCAG 线性化）：0 纯黑 ~ 1 纯白 */
export function relativeLuminance(hex: string): number {
  const v = parseInt(hex.slice(1), 16)
  const channel = (x: number) => {
    const c = x / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel((v >> 16) & 255) + 0.7152 * channel((v >> 8) & 255) + 0.0722 * channel(v & 255)
}

/** 组底色亮度：light 组取 white 页面 #f7f3ea、dark 组取 graphite 页面 #2e2d29（与 PAPER_BY_THEME 同源近似值） */
const GROUP_BG_LUM: Record<MascotThemeGroup, number> = {
  light: relativeLuminance('#f7f3ea'), // 0.898159
  dark: relativeLuminance('#2e2d29'), // 0.026177
}

const EYES_LUM = 0.45
const STROKE_GAP = 0.25

/**
 * 变体推导。回归基准（亮度逐条复算，与旧手写矩阵完全一致，矩阵已由推导取代）：
 * | 选项 | light 组 | dark 组 |
 * |---|---|---|
 * | encre #0a0a0c（lum 0.003082） | #0a0a0c / #f9f9f9 / 无（Δbg=0.895077 ≥ 0.25） | #0a0a0c / #f9f9f9 / rgba(241,239,233,0.25)（Δbg=0.023096 < 0.25） |
 * | creme #f1efe9（lum 0.863170） | #f1efe9 / #26231e / rgba(10,10,12,0.30)（Δbg=0.034989 < 0.25） | #f1efe9 / #26231e / 无（Δbg=0.836993 ≥ 0.25） |
 * | ambre #f0b429（lum 0.513279） | #f0b429 / #26231e / 无（Δbg=0.384880 ≥ 0.25） | #f0b429 / #26231e / 无（Δbg=0.487102 ≥ 0.25） |
 */
export function resolveVariant(colorId: string, group: MascotThemeGroup): Variant {
  const body = BODY_COLORS[colorId] ?? BODY_COLORS.encre // 非法 colorId 回退 encre（与 Mascot 现有回退一致）
  const bodyLum = relativeLuminance(body)
  const lowContrast = Math.abs(bodyLum - GROUP_BG_LUM[group]) < STROKE_GAP
  return {
    body,
    eyes: bodyLum > EYES_LUM ? '#26231e' : '#f9f9f9', // 浅身深眼 / 深身浅眼
    stroke: lowContrast ? (group === 'dark' ? 'rgba(241,239,233,0.25)' : 'rgba(10,10,12,0.30)') : null,
  }
}
