// colorPresets — 编辑风图表官方色彩预设正本（Porcelain / Palm / Wire + Mono）
//
// ① 色值转写自 lieflat-charts 官方 color-presets.js 的参数层：色值/参数是不受版权保护的
//    事实层，本文件代码全部自写（学参数、自写代码）。
// ② hex 只允许出现在本文件（品牌预设是固定色板，明度阶/色相/荧光点本身是「内容」）；
//    其余文件一律通过 import 本模块取色，禁止散落 hex。
// ③ 浅档（#BAD6EB / #D0E3FF / #F2D17E 等）按官方语义用于暗底/大面积（RAMP 浅段、
//    HERODK），不做浅色底上的小元素主色。
// ④ 预设按浅色主题设计；当前产品默认浅色主题，不做暗色主题特判。

export type ColorSystem = 'mono' | 'porcelain' | 'palm' | 'wire'

export interface ColorPreset {
  id: ColorSystem
  /** 展示名 */
  name: string
  /** 官方选色逻辑 */
  logic: 'mono' | 'ordinal' | 'categorical' | 'mono+accent'
  /** 官方容量规则原文（超容量 → 按 pickColorSystem 回退） */
  capacityNote: string
  /** 官方 CAT4 正本（4 档，深→浅） */
  cat4: string[]
  /** 官方 RAMP 正本（5 档，浅→深；RAMP[0] 为暗底/大面积浅档） */
  ramp: string[]
  /** Palm 专属：6 类容量正本（SER） */
  ser?: string[]
  /** 主角/强调色（porcelain #081F5C / palm #D4A017 / wire #F5572F / mono 无） */
  hero: string
}

/** PORCELAIN（青瓷蓝）官方墨阶 rgba 正本：结构线/标注层用，随主体一起转写（数值不动） */
export const PORCELAIN_INK = {
  /** 次级文字 */
  mut: 'rgba(8,31,92,.60)',
  /** 标签文字 */
  lab: 'rgba(8,31,92,.72)',
  /** 淡元素 */
  faint: 'rgba(8,31,92,.32)',
  /** 网格/发丝结构线 */
  grid: 'rgba(8,31,92,.16)',
} as const

/** 官方加墨规则 INK_BOOST（三套彩色通用，非可选）：彩色淡色下灰阶 0.5px 发丝线会隐形——
 *  涉及彩色淡色描边/细线时线宽 ×1.8、透明度地板 0.85；dot heat 类高墨元素豁免 */
export const INK_BOOST = { lineWidthFactor: 1.8, opacityFloor: 0.85 } as const

export const PRESETS: Record<ColorSystem, ColorPreset> = {
  mono: {
    id: 'mono',
    name: 'Mono',
    logic: 'mono',
    capacityNote: '不进 hex，走既有 CSS 变量（var(--fg)/var(--fg-2)/var(--muted)/var(--border)）',
    cat4: [],
    ramp: [],
    hero: '',
  },
  porcelain: {
    id: 'porcelain',
    name: 'Porcelain · 青瓷蓝',
    logic: 'ordinal',
    capacityNote: '明度=数值；容量 4 档明度，类目 >4 换 Mono',
    // 官方 CAT4：TXT/HERO #081F5C · DATA #334EAC · DATA2 #7096D1 · FAINTDATA #BAD6EB
    cat4: ['#081F5C', '#334EAC', '#7096D1', '#BAD6EB'],
    // 官方 RAMP（浅→深）：#D0E3FF 为暗底/大面积浅档
    ramp: ['#D0E3FF', '#BAD6EB', '#7096D1', '#334EAC', '#081F5C'],
    hero: '#081F5C',
  },
  palm: {
    id: 'palm',
    name: 'Palm · 椰林绿',
    logic: 'categorical',
    capacityNote: '色相=类目；容量 4 类干净、6 类勉强、>6 换',
    // 官方 CAT4（4 类干净容量）
    cat4: ['#43593B', '#77835A', '#ACAD79', '#F2D17E'],
    // 官方 RAMP（浅→深）
    ramp: ['#F2D17E', '#ACAD79', '#929960', '#77835A', '#43593B'],
    // 官方 SER（6 类容量正本）。官方备注：琥珀 #D4A017（H≈160）与橄榄 #77835A（H≈167）
    // 明度只差 7，但语义相反——琥珀=「这个是重点」跳出，橄榄=退后，不当两个平等类目用。
    // 文字层正本：TXT/DATA2 #58402E（浓咖）· DATA #43593B（深绿）· HERODK #F2D17E（麦黄）
    ser: ['#43593B', '#D4A017', '#77835A', '#F2D17E', '#ACAD79', '#58402E'],
    hero: '#D4A017',
  },
  wire: {
    id: 'wire',
    name: 'Wire · 编辑部红',
    logic: 'mono+accent',
    capacityNote: '灰阶承载全部数据，橙只标一个主角元素——第二处上橙就等于没有主角',
    // 官方 CAT4：HERO 橙 + 三档灰阶；文字层正本 TXT #1F1E1C · DATA #22211F · DATA2 #8F8E86
    cat4: ['#F5572F', '#22211F', '#8F8E86', '#C0BFB7'],
    // 官方 RAMP（浅→深）：橙只作浅底主角落点，浅段 #DBDAD3/#C0BFB7 用于暗底/大面积
    ramp: ['#DBDAD3', '#C0BFB7', '#8F8E86', '#22211F', '#F5572F'],
    hero: '#F5572F',
  },
}

export interface PickInput {
  /** 类目有序（明度/时间序） */
  ordered?: boolean
  /** 单序列 */
  singleSeries?: boolean
  /** 无序类目数 */
  categoryCount?: number
  /** 需要视线落点（唯一主角元素） */
  needsFocal?: boolean
  /** 显式指定（同页/同区统一系统时使用，优先级最高） */
  explicit?: ColorSystem
}

/** 数据结构 → 自动选色（照官方语义，硬编码判断顺序，不做配置表）：
 *  explicit → 直接返回；needsFocal → Wire；有序单序列 → Porcelain；
 *  无序类目 1-6 → Palm；其余（含 >6 无序）→ Mono。同一页/同一组图只用一种系统。 */
export function pickColorSystem(input: PickInput): ColorSystem {
  if (input.explicit) return input.explicit
  if (input.needsFocal) return 'wire'
  if (input.ordered && input.singleSeries) return 'porcelain'
  if (input.categoryCount !== undefined && input.categoryCount >= 1 && input.categoryCount <= 6) {
    return 'palm'
  }
  return 'mono'
}

/** 官方 RAMP 反向映射：rank 0 = 最深（最重要），rank 越大越浅。
 *  total ≤ RAMP 长度：按 rank 直接取反向 RAMP（porcelain total=4 时恰为 CAT4 反序）；
 *  total 超 RAMP 长度（容量超限，调用方应先用 pickColorSystem 避免）：rank 0 独占最深，
 *  其余在「去最深后的浅段」循环，保证全图唯一最深。 */
export function rampColor(system: 'porcelain' | 'palm' | 'wire', rank: number, total: number): string {
  const ramp = PRESETS[system].ramp
  const deepFirst = [...ramp].reverse() // 官方 RAMP 浅→深 → 反转为深→浅
  if (total <= ramp.length) {
    const idx = Math.min(Math.max(rank, 0), deepFirst.length - 1)
    return deepFirst[idx]
  }
  if (rank <= 0) return deepFirst[0]
  const shallow = deepFirst.slice(1)
  return shallow[(rank - 1) % shallow.length]
}
