import { describe, test, expect } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'
import { DotMatrix } from '@/components/ui/charts/DotMatrix'
import { RungBars, pickRungUnit, formatRungUnitNote } from '@/components/ui/charts/RungBars'
import { TickRing } from '@/components/ui/charts/TickRing'

const barData = [
  { name: '材料费', value: 40 },
  { name: '劳务费', value: 20 },
  { name: '机械费', value: 0 },
]

// rAF mounted 触发 scaleX 0→1 入场：等待任一条到位（最大条必为 scaleX(1)）后再读内联样式断言
async function mountedBars(container: HTMLElement): Promise<HTMLElement[]> {
  await waitFor(() => {
    const done = Array.from(container.querySelectorAll<HTMLElement>('[data-bar]'))
      .some((el) => el.getAttribute('style')?.includes('scaleX(1)'))
    expect(done).toBe(true)
  })
  return Array.from(container.querySelectorAll<HTMLElement>('[data-bar]'))
}

describe('EditorialBars（编辑风横向条形）', () => {
  test('条长与数值严格成正比：scaleX = value / max（max 取全量最大值），不断轴不从零截断', async () => {
    const { container } = render(<EditorialBars data={barData} formatValue={(n) => String(n)} />)
    const bars = await mountedBars(container)
    expect(bars.length).toBe(3)
    expect(bars[0].getAttribute('style')).toContain('transform: scaleX(1)')
    expect(bars[1].getAttribute('style')).toContain('transform: scaleX(0.5)')
  })

  test('强调色只给第一名：accent vs 中性 fg-2；条尾数值同规则（第一名 fg 加粗）', async () => {
    const { container } = render(<EditorialBars data={barData} formatValue={(n) => String(n)} />)
    const bars = await mountedBars(container)
    expect(bars[0].getAttribute('style')).toContain('background: var(--accent)')
    expect(bars[1].getAttribute('style')).toContain('background: var(--fg-2)')
    expect(bars[2].getAttribute('style')).toContain('background: var(--fg-2)')

    const values = Array.from(container.querySelectorAll<HTMLElement>('span.font-mono'))
    expect(values.length).toBe(3)
    expect(values[0].getAttribute('style')).toContain('color: var(--fg)')
    expect(values[0].getAttribute('style')).toContain('font-weight: 700')
    expect(values[1].getAttribute('style')).toContain('color: var(--fg-2)')
  })

  test('accentFirst=false 时无强调色：全部 var(--fg-2)', async () => {
    const { container } = render(<EditorialBars data={barData} formatValue={(n) => String(n)} accentFirst={false} />)
    const bars = await mountedBars(container)
    expect(bars[0].getAttribute('style')).toContain('background: var(--fg-2)')
    expect(bars[1].getAttribute('style')).toContain('background: var(--fg-2)')
  })

  test('0 值行仍显示名称与「0」，条形宽 0', async () => {
    const { container } = render(<EditorialBars data={barData} formatValue={(n) => String(n)} />)
    expect(screen.getByText('机械费')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    const bars = await mountedBars(container)
    expect(bars[2].getAttribute('style')).toContain('transform: scaleX(0)')
  })

  test('合并路径不溢出：「其他」在末尾且大于其余条时，任何条 scaleX ≤ 1 且与最大条（600）保持正比', async () => {
    // 调用方把「其他」合并项追加在末尾（破坏降序契约）——组件内 max 守卫必须兜底
    const merged = [
      { name: '人工费', value: 100 },
      { name: '材料费', value: 90 },
      { name: '机械费', value: 80 },
      { name: '设计费', value: 70 },
      { name: '管理费', value: 60 },
      { name: '税费', value: 50 },
      { name: '其他', value: 600 },
    ]
    const { container } = render(<EditorialBars data={merged} formatValue={(n) => String(n)} />)
    const bars = await mountedBars(container)
    const scaleXOf = (el: HTMLElement) => {
      const m = el.getAttribute('style')?.match(/scaleX\(([\d.]+)\)/)
      return m ? parseFloat(m[1]) : -1
    }
    bars.forEach((el) => expect(scaleXOf(el)).toBeLessThanOrEqual(1))
    expect(scaleXOf(bars[6])).toBeCloseTo(1, 6)
    expect(scaleXOf(bars[0])).toBeCloseTo(100 / 600, 6)
    expect(scaleXOf(bars[1])).toBeCloseTo(90 / 600, 6)
    expect(scaleXOf(bars[5])).toBeCloseTo(50 / 600, 6)
  })

  test('条尾数值文本存在（formatValue 注入生效）', () => {
    render(<EditorialBars data={barData} formatValue={(n) => `¥${n}`} />)
    expect(screen.getByText('¥40')).toBeTruthy()
    expect(screen.getByText('¥20')).toBeTruthy()
    expect(screen.getByText('¥0')).toBeTruthy()
  })
})

describe('DotMatrix（编辑风点阵）', () => {
  test('count ≤ maxDots：1 点 = 1 个单位，全量渲染 12 点', () => {
    const { container } = render(<DotMatrix count={12} unitLabel="张" />)
    expect(container.querySelectorAll('[data-dot]').length).toBe(12)
  })

  test('count > maxDots：只画 maxDots 个点 + 尾随注记「共 55 张」，绝不画假点', () => {
    const { container } = render(<DotMatrix count={55} unitLabel="张" />)
    expect(container.querySelectorAll('[data-dot]').length).toBe(40)
    expect(screen.getByText('共 55 张')).toBeTruthy()
  })

  test('count = 0：显示 text-caption「0」，无点', () => {
    const { container } = render(<DotMatrix count={0} unitLabel="张" />)
    expect(container.querySelectorAll('[data-dot]').length).toBe(0)
    expect(screen.getByText('0')).toBeTruthy()
  })

  test('aria-label 为「共 N 张」', () => {
    render(<DotMatrix count={12} unitLabel="张" />)
    expect(screen.getByLabelText('共 12 张')).toBeTruthy()
  })
})

describe('RungBars（编辑风梯级柱）', () => {
  const rungData = [
    { name: '材料费', value: 100 },
    { name: '劳务费', value: 50 },
    { name: '机械费', value: 0 },
  ]

  // rAF mounted 触发整列 opacity 0→1 入场：等任一列到位后再读 DOM 断言
  async function mountedColumns(container: HTMLElement): Promise<HTMLElement[]> {
    await waitFor(() => {
      const done = Array.from(container.querySelectorAll<HTMLElement>('[data-rung-bar]'))
        .some((el) => el.getAttribute('style')?.includes('opacity: 1'))
      expect(done).toBe(true)
    })
    return Array.from(container.querySelectorAll<HTMLElement>('[data-rung-bar]'))
  }

  test('梯级数 = round(value / rungUnit)：读 DOM 内梯级元素计数', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} />)
    const cols = await mountedColumns(container)
    expect(cols.length).toBe(3)
    expect(cols[0].querySelectorAll('[data-rung]').length).toBe(10) // round(100/10)
    expect(cols[1].querySelectorAll('[data-rung]').length).toBe(5) // round(50/10)
  })

  test('冠军柱梯级实心（opacity 1，light 墨色 var(--fg)），其余柱同色 50% 透明度', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} />)
    const cols = await mountedColumns(container)
    const firstRung = cols[0].querySelector<HTMLElement>('[data-rung]')
    const secondRung = cols[1].querySelector<HTMLElement>('[data-rung]')
    expect(firstRung?.getAttribute('style')).toContain('background: var(--fg)')
    expect(firstRung?.getAttribute('style')).toContain('opacity: 1')
    expect(secondRung?.getAttribute('style')).toContain('background: var(--fg)')
    expect(secondRung?.getAttribute('style')).toContain('opacity: 0.5')
  })

  test('dark 反色：墨色取 var(--bg)', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} tone="dark" />)
    const cols = await mountedColumns(container)
    expect(cols[0].querySelector<HTMLElement>('[data-rung]')?.getAttribute('style')).toContain('background: var(--bg)')
  })

  test('dark 非冠军梯级回归：透明度 ≥0.5（0.55），深色反色卡上可辨', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} tone="dark" />)
    const cols = await mountedColumns(container)
    const secondRung = cols[1].querySelector<HTMLElement>('[data-rung]')
    expect(secondRung?.getAttribute('style')).toContain('opacity: 0.55')
  })

  test('显式单位：底部注记含「一梯级」', () => {
    render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} />)
    expect(screen.getByText(/一梯级/)).toBeTruthy()
  })

  test('自动单位（不传 rungUnit）：注记同样印出且梯级数在预算内', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} />)
    await waitFor(() => expect(container.querySelector('[data-rung]')).toBeTruthy())
    expect(container.textContent).toContain('一梯级')
    container.querySelectorAll<HTMLElement>('[data-rung-bar]').forEach((col) => {
      expect(col.querySelectorAll('[data-rung]').length).toBeLessThanOrEqual(30)
    })
  })

  test('0 值柱：显示名称与「0」，无梯级', async () => {
    const { container } = render(<RungBars data={rungData} formatValue={(n) => String(n)} rungUnit={10} />)
    expect(screen.getByText('机械费')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    const cols = await mountedColumns(container)
    expect(cols[2].querySelectorAll('[data-rung]').length).toBe(0)
  })

  test('乱序 fixture 不溢出：「其他」在末尾且最大时，任何柱梯级数 ≤ maxRungs（自动单位取全量最大）', async () => {
    const merged = [
      { name: '人工费', value: 100 },
      { name: '材料费', value: 90 },
      { name: '机械费', value: 80 },
      { name: '设计费', value: 70 },
      { name: '管理费', value: 60 },
      { name: '税费', value: 50 },
      { name: '其他', value: 600 },
    ]
    const { container } = render(<RungBars data={merged} formatValue={(n) => String(n)} maxRungs={30} />)
    const cols = await mountedColumns(container)
    cols.forEach((col) => {
      expect(col.querySelectorAll('[data-rung]').length).toBeLessThanOrEqual(30)
    })
    // pickRungUnit(600, 30) = 20 → round(600/20) = 30
    expect(cols[6].querySelectorAll('[data-rung]').length).toBe(30)
    expect(cols[0].querySelectorAll('[data-rung]').length).toBe(5) // round(100/20)
  })

  test('pickRungUnit 纯函数：确定性（同输入同输出）+ 边界行为', () => {
    expect(pickRungUnit(0)).toBe(1)
    expect(pickRungUnit(1150, 30)).toBe(50) // 1→1150 2→575 5→230 10→115 20→58 均超上限，50→23 首个落入 [12,30]
    expect(pickRungUnit(1150, 30)).toBe(pickRungUnit(1150, 30))
    expect(pickRungUnit(600, 30)).toBe(20) // round(600/20)=30 恰好命中上限
  })

  test('formatRungUnitNote：金额按元直出（cost_ledger.amount 全链路是元，不是分）', () => {
    expect(formatRungUnitNote(5000)).toBe('一梯级 = ¥5000')
    expect(formatRungUnitNote(50000)).toBe('一梯级 = ¥5万')
  })
})

describe('TickRing（编辑风刻度环）', () => {
  const litCount = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<SVGLineElement>('[data-tick]'))
      .filter((t) => t.getAttribute('stroke') === 'var(--fg)').length

  test('总刻度数恒为 100（SVG line + rotate 几何确定性）', () => {
    const { container } = render(<TickRing percent={40} label="回款率" />)
    expect(container.querySelectorAll('[data-tick]').length).toBe(100)
  })

  test('lit 数 = round(percent)：前 40 根墨色 var(--fg)，其余 var(--border)', () => {
    const { container } = render(<TickRing percent={40} />)
    const ticks = Array.from(container.querySelectorAll<SVGLineElement>('[data-tick]'))
    expect(litCount(container)).toBe(40)
    expect(ticks[0].getAttribute('stroke')).toBe('var(--fg)')
    expect(ticks[39].getAttribute('stroke')).toBe('var(--fg)')
    expect(ticks[40].getAttribute('stroke')).toBe('var(--border)')
    expect(ticks[99].getAttribute('stroke')).toBe('var(--border)')
  })

  test('环心文本 {percent}% 与 label 小字；aria-label「回款率 N%」', () => {
    render(<TickRing percent={40} label="回款率" />)
    expect(screen.getByText('40%')).toBeTruthy()
    expect(screen.getByText('回款率')).toBeTruthy()
    expect(screen.getByLabelText('回款率 40%')).toBeTruthy()
  })

  test('percent > 100 内部 clamp 到 100：lit = 100 且环心显示 100%', () => {
    const { container, getByText } = render(<TickRing percent={150} />)
    expect(litCount(container)).toBe(100)
    expect(getByText('100%')).toBeTruthy()
  })

  test('percent < 0 clamp 到 0：无 lit 刻度', () => {
    const { container } = render(<TickRing percent={-5} />)
    expect(litCount(container)).toBe(0)
  })
})
