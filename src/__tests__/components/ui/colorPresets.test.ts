import { describe, test, expect } from 'vitest'
import {
  PRESETS,
  PORCELAIN_INK,
  INK_BOOST,
  pickColorSystem,
  rampColor,
  type ColorSystem,
  type PickInput,
} from '@/components/ui/charts/colorPresets'

// colorPresets 官方正本测试：pickColorSystem 规则表驱动 + 官方值快照断言 + WCAG 对比度断言。
// 纯模块测试（不渲染组件、不引图表库、无随机数）。

describe('pickColorSystem（数据结构 → 自动选色，硬编码判断顺序）', () => {
  const cases: { name: string; input: PickInput; want: ColorSystem }[] = [
    { name: 'explicit 优先（压过 needsFocal）', input: { explicit: 'palm', needsFocal: true }, want: 'palm' },
    { name: 'explicit porcelain 压过有序单序列', input: { explicit: 'porcelain', ordered: true, singleSeries: true }, want: 'porcelain' },
    { name: 'needsFocal → wire', input: { needsFocal: true }, want: 'wire' },
    { name: 'ordered + singleSeries → porcelain', input: { ordered: true, singleSeries: true }, want: 'porcelain' },
    { name: 'ordered 但多序列、无类目数 → mono', input: { ordered: true }, want: 'mono' },
    { name: '无序 5 类（≤6）→ palm', input: { categoryCount: 5 }, want: 'palm' },
    { name: '无序 8 类（>6 容量超限）→ mono', input: { categoryCount: 8 }, want: 'mono' },
    { name: '全空 → mono', input: {}, want: 'mono' },
  ]
  for (const c of cases) {
    test(c.name, () => {
      expect(pickColorSystem(c.input)).toBe(c.want)
    })
  }
})

describe('PRESETS 结构与官方值快照（逐项写死期望数组，不得改动数值）', () => {
  test('三彩色预设 id/name/logic 正确', () => {
    expect(PRESETS.porcelain.id).toBe('porcelain')
    expect(PRESETS.porcelain.name).toBe('Porcelain · 青瓷蓝')
    expect(PRESETS.porcelain.logic).toBe('ordinal')
    expect(PRESETS.palm.id).toBe('palm')
    expect(PRESETS.palm.name).toBe('Palm · 椰林绿')
    expect(PRESETS.palm.logic).toBe('categorical')
    expect(PRESETS.wire.id).toBe('wire')
    expect(PRESETS.wire.name).toBe('Wire · 编辑部红')
    expect(PRESETS.wire.logic).toBe('mono+accent')
  })

  test('porcelain cat4/ramp/hero 与官方值逐项相等', () => {
    expect(PRESETS.porcelain.cat4).toEqual(['#081F5C', '#334EAC', '#7096D1', '#BAD6EB'])
    expect(PRESETS.porcelain.ramp).toEqual(['#D0E3FF', '#BAD6EB', '#7096D1', '#334EAC', '#081F5C'])
    expect(PRESETS.porcelain.hero).toBe('#081F5C')
  })

  test('palm ser 恰 6 个且与官方 SER 正本相等；cat4/ramp/hero 同', () => {
    expect(PRESETS.palm.ser).toEqual(['#43593B', '#D4A017', '#77835A', '#F2D17E', '#ACAD79', '#58402E'])
    expect(PRESETS.palm.ser).toHaveLength(6)
    expect(PRESETS.palm.cat4).toEqual(['#43593B', '#77835A', '#ACAD79', '#F2D17E'])
    expect(PRESETS.palm.ramp).toEqual(['#F2D17E', '#ACAD79', '#929960', '#77835A', '#43593B'])
    expect(PRESETS.palm.hero).toBe('#D4A017')
  })

  test('wire cat4/ramp 相等且 hero = #F5572F（荧光橙，浅底用）', () => {
    expect(PRESETS.wire.cat4).toEqual(['#F5572F', '#22211F', '#8F8E86', '#C0BFB7'])
    expect(PRESETS.wire.ramp).toEqual(['#DBDAD3', '#C0BFB7', '#8F8E86', '#22211F', '#F5572F'])
    expect(PRESETS.wire.hero).toBe('#F5572F')
  })

  test('mono 不进 hex（cat4/ramp 空、hero 空）', () => {
    expect(PRESETS.mono.cat4).toEqual([])
    expect(PRESETS.mono.ramp).toEqual([])
    expect(PRESETS.mono.hero).toBe('')
    expect(PRESETS.mono.logic).toBe('mono')
  })

  test('PORCELAIN_INK rgba 墨阶正本与 INK_BOOST 加墨规则快照', () => {
    expect(PORCELAIN_INK.mut).toBe('rgba(8,31,92,.60)')
    expect(PORCELAIN_INK.lab).toBe('rgba(8,31,92,.72)')
    expect(PORCELAIN_INK.faint).toBe('rgba(8,31,92,.32)')
    expect(PORCELAIN_INK.grid).toBe('rgba(8,31,92,.16)')
    expect(INK_BOOST.lineWidthFactor).toBe(1.8)
    expect(INK_BOOST.opacityFloor).toBe(0.85)
  })
})

describe('rampColor（官方 RAMP 反向映射：rank 0 = 最深）', () => {
  test('total 不超 ramp：porcelain 全档直取反向 RAMP（total=4 恰为 CAT4 反序）', () => {
    expect(rampColor('porcelain', 0, 5)).toBe('#081F5C')
    expect(rampColor('porcelain', 1, 5)).toBe('#334EAC')
    expect(rampColor('porcelain', 2, 5)).toBe('#7096D1')
    expect(rampColor('porcelain', 3, 5)).toBe('#BAD6EB')
    expect(rampColor('porcelain', 4, 5)).toBe('#D0E3FF')
    expect(rampColor('porcelain', 0, 4)).toBe('#081F5C')
    expect(rampColor('porcelain', 3, 4)).toBe('#BAD6EB')
  })

  test('palm rank 0 = 最深深绿（总量 6 同样最深打头）', () => {
    expect(rampColor('palm', 0, 6)).toBe('#43593B')
    expect(rampColor('palm', 4, 6)).toBe('#F2D17E')
  })

  test('total 超 ramp（容量超限）：rank 0 独占最深，其余循环浅段', () => {
    expect(rampColor('porcelain', 0, 12)).toBe('#081F5C')
    expect(rampColor('porcelain', 1, 12)).toBe('#334EAC')
    expect(rampColor('porcelain', 5, 12)).toBe('#334EAC') // (5-1) % 4 = 0 → 浅段首
    expect(rampColor('porcelain', 4, 12)).toBe('#D0E3FF')
  })
})

// WCAG 相对亮度公式（测试内实现，不引依赖）：
// 通道线性化 c ≤ 0.03928 → c/12.92，否则 ((c+0.055)/1.055)^2.4；
// L = 0.2126R + 0.7152G + 0.0722B；对白底对比度 = 1.05 / (L + 0.05)
function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05)
}

describe('WCAG 对比度（对 #ffffff）', () => {
  // 官方容量规则备注：琥珀 #D4A017 实测 ≈2.38:1，低于 3:1——官方语义是「重点跳出」的
  // 强调色（色块/面积段填充），不是文字色；官方值不得改动，故如实断言其区间，
  // 不写无法成立的 ≥3:1。其余深色档全部 ≥3:1。
  test('深色档（porcelain cat4[0..1]、palm 深绿/橄榄、wire hero）对白底 ≥3:1', () => {
    const darks = ['#081F5C', '#334EAC', '#43593B', '#77835A', PRESETS.wire.hero]
    for (const hex of darks) {
      expect(contrastOnWhite(hex)).toBeGreaterThanOrEqual(3)
    }
  })

  test('官方琥珀 #D4A017（palm hero/SER[1]）实测 ≈2.38:1：低于 3:1，仅作跳出强调/面积段用', () => {
    const c = contrastOnWhite('#D4A017')
    expect(c).toBeGreaterThanOrEqual(2.3)
    expect(c).toBeLessThan(3)
  })

  test('浅档（#BAD6EB/#D0E3FF）<3:1——仅暗底/大面积用途，不做浅底小元素主色', () => {
    expect(contrastOnWhite('#BAD6EB')).toBeLessThan(3)
    expect(contrastOnWhite('#D0E3FF')).toBeLessThan(3)
  })
})
