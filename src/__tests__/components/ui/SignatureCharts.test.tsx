import { describe, test, expect } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BarcodeCalendar } from '@/components/ui/charts/BarcodeCalendar'
import { DotCascade, pickCascadeUnit, formatCascadeUnitNote } from '@/components/ui/charts/DotCascade'
import { SquareHundred } from '@/components/ui/charts/SquareHundred'

// rAF mounted 触发整体 opacity 0→1 入场：等元素到位后再读 DOM 断言（同 EditorialCharts.test 风格）
async function mountedRoot(container: HTMLElement, selector: string): Promise<HTMLElement> {
  await waitFor(() => {
    const el = container.querySelector<HTMLElement>(selector)
    expect(el?.getAttribute('style')?.includes('opacity: 1')).toBe(true)
  })
  return container.querySelector<HTMLElement>(selector)!
}

// SquareHundred 根 div（opacity 所在层）无专属选择器，取 container 首元素断言淡入
async function mountedFade(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    expect((container.firstElementChild as HTMLElement)?.getAttribute('style')?.includes('opacity: 1')).toBe(true)
  })
}

describe('BarcodeCalendar（编辑风条码日历）', () => {
  const calData = [
    { label: '1', value: 10, weekend: true },
    { label: '2', value: 0 },
    { label: '3', value: 5 },
    { label: '4', value: 20 },
    { label: '5', value: 0 },
    { label: '6', value: 8, weekend: true },
    { label: '7', value: 3 },
  ]

  test('一天一根发丝线：线数 = 点数 = data.length（含 value=0 的天）', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} />)
    await mountedRoot(container, '[aria-label="条码日历 · 共 7 天"]')
    expect(container.querySelectorAll('[data-barcode-line]').length).toBe(7)
    expect(container.querySelectorAll('[data-barcode-dot]').length).toBe(7)
    expect(container.querySelectorAll('[data-barcode-day]').length).toBe(7)
  })

  test('签名纪律：只给 TOP-3 标数（默认 topLabeled=3），其余沉默；并列取先出现', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} />)
    await mountedRoot(container, '[aria-label="条码日历 · 共 7 天"]')
    const labels = Array.from(container.querySelectorAll<HTMLElement>('span.font-mono'))
      .map((el) => el.textContent ?? '')
      .filter((t) => t !== '')
    expect(labels.length).toBe(3)
    // 值最高的前 3 天：20 / 10 / 8（其余 5、3、0 不标）
    expect(new Set(labels)).toEqual(new Set(['20人', '10人', '8人']))
  })

  test('topLabeled=1：只标最高一天', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} topLabeled={1} />)
    const labels = Array.from(container.querySelectorAll<HTMLElement>('span.font-mono'))
      .map((el) => el.textContent ?? '')
      .filter((t) => t !== '')
    expect(labels).toEqual(['20人'])
  })

  test('weekend 空心判定：data-hollow + 描边 var(--fg-2) + 底色填充；工作日实心 var(--fg)', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} />)
    const dots = container.querySelectorAll<HTMLElement>('[data-barcode-dot]')
    expect(dots[0].getAttribute('data-hollow')).toBe('true')
    expect(dots[0].getAttribute('style')).toContain('var(--fg-2)') // 描边色
    expect(dots[0].getAttribute('style')).toContain('background: var(--card)')
    expect(dots[1].getAttribute('data-hollow')).toBeNull()
    expect(dots[1].getAttribute('style')).toContain('background: var(--fg)')
  })

  test('X 轴只标首 / 中 / 尾 3 个锚点', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} />)
    const anchors = container.querySelectorAll<HTMLElement>('[data-barcode-anchor]')
    expect(anchors.length).toBe(3)
    expect(anchors[0].textContent).toBe('1')
    expect(anchors[1].textContent).toBe('4')
    expect(anchors[2].textContent).toBe('7')
  })

  test('value=0 的天照画：1px 发丝线仍在，点落在基线上', async () => {
    const { container } = render(<BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} />)
    const lines = container.querySelectorAll<HTMLElement>('[data-barcode-line]')
    expect(lines[1].getAttribute('style')).toContain('height: 1px')
    expect(lines[4].getAttribute('style')).toContain('height: 1px')
    // 满值天线最高：value/max × 可用高，不断轴不溢出
    expect(lines[3].getAttribute('style')).not.toContain('height: 1px')
  })

  test('线高与数值严格成正比（max 守卫取全量最大值）', async () => {
    const { container } = render(
      <BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} height={160} />
    )
    const lines = container.querySelectorAll<HTMLElement>('[data-barcode-line]')
    // lineArea = 160 - 16 - 6 - 3 = 135；value=10/max=20 → round(67.5)=68
    expect(lines[0].getAttribute('style')).toContain('height: 68px')
    // 乱序 fixture：「其他」在末尾且最大时不溢出
    const merged = [
      { label: 'a', value: 10 },
      { label: 'b', value: 100 },
    ]
    const { container: c2 } = render(<BarcodeCalendar data={merged} formatValue={(n) => `${n}人`} />)
    const lines2 = c2.querySelectorAll<HTMLElement>('[data-barcode-line]')
    expect(lines2[1].getAttribute('style')).toContain('height: 135px')
    expect(lines2[0].getAttribute('style')).toContain('height: 14px')
  })

  test('caption 印在图下；aria-label 描述天数', () => {
    render(
      <BarcodeCalendar data={calData} formatValue={(n) => `${n}人`} caption="一根线 = 一天" />
    )
    expect(screen.getByText('一根线 = 一天')).toBeTruthy()
    expect(screen.getByLabelText('条码日历 · 共 7 天')).toBeTruthy()
  })
})

describe('DotCascade（编辑风点阵级联）', () => {
  test('组件内按 value 升序重排：首列 value 最小（视觉级联攀升）', async () => {
    const { container } = render(
      <DotCascade
        data={[
          { name: '乙', value: 50 },
          { name: '甲', value: 10 },
          { name: '丙', value: 30 },
        ]}
        formatValue={(n) => String(n)}
        dotUnit={10}
      />
    )
    await mountedRoot(container, '[role="img"]')
    const cols = container.querySelectorAll<HTMLElement>('[data-cascade-col]')
    expect(cols.length).toBe(3)
    const valueOf = (col: HTMLElement) => col.querySelector('.font-mono')?.textContent
    expect(valueOf(cols[0])).toBe('10')
    expect(valueOf(cols[1])).toBe('30')
    expect(valueOf(cols[2])).toBe('50')
  })

  test('点数 = round(value / dotUnit)：列顶实心大点 + 其下串点', async () => {
    const { container } = render(
      <DotCascade
        data={[
          { name: '甲', value: 100 },
          { name: '乙', value: 50 },
          { name: '丙', value: 0 },
        ]}
        formatValue={(n) => String(n)}
        dotUnit={10}
      />
    )
    await mountedRoot(container, '[role="img"]')
    const cols = container.querySelectorAll<HTMLElement>('[data-cascade-col]')
    expect(cols[2].querySelectorAll('[data-cascade-dot]').length).toBe(10) // round(100/10)
    expect(cols[1].querySelectorAll('[data-cascade-dot]').length).toBe(5) // round(50/10)
    expect(cols[0].querySelectorAll('[data-cascade-dot]').length).toBe(0) // 0 值列
    // 列顶大点实心 var(--fg)，串点 var(--fg-2)
    const cap = cols[2].querySelector<HTMLElement>('[data-cascade-dot="9"]')
    expect(cap?.getAttribute('style')).toContain('width: 10px')
    expect(cap?.getAttribute('style')).toContain('background: var(--fg)')
    const sub = cols[2].querySelector<HTMLElement>('[data-cascade-dot="0"]')
    expect(sub?.getAttribute('style')).toContain('background: var(--fg-2)')
  })

  test('0 值列：只有名称与「0」，无点', async () => {
    const { container } = render(
      <DotCascade
        data={[
          { name: '甲', value: 100 },
          { name: '丙', value: 0 },
        ]}
        formatValue={(n) => String(n)}
        dotUnit={10}
      />
    )
    const cols = container.querySelectorAll<HTMLElement>('[data-cascade-col]')
    expect(cols[0].querySelectorAll('[data-cascade-dot]').length).toBe(0)
    expect(cols[0].querySelector('.font-mono')?.textContent).toBe('0')
    expect(cols[0].textContent).toContain('丙')
  })

  test('单位注记印在图内：含「一点 = 」', () => {
    const { container } = render(
      <DotCascade data={[{ name: '甲', value: 100 }]} formatValue={(n) => String(n)} dotUnit={10} />
    )
    expect(container.textContent).toContain('一点 = ¥10')
  })

  test('乱序 fixture 不溢出：自动单位取全量最大值，任何列点数 ≤ maxDots', async () => {
    const merged = [
      { name: '人工费', value: 100 },
      { name: '材料费', value: 90 },
      { name: '机械费', value: 80 },
      { name: '设计费', value: 70 },
      { name: '管理费', value: 60 },
      { name: '税费', value: 50 },
      { name: '其他', value: 600 },
    ]
    const { container } = render(<DotCascade data={merged} formatValue={(n) => String(n)} maxDots={24} />)
    await mountedRoot(container, '[role="img"]')
    const cols = container.querySelectorAll<HTMLElement>('[data-cascade-col]')
    cols.forEach((col) => {
      expect(col.querySelectorAll('[data-cascade-dot]').length).toBeLessThanOrEqual(24)
    })
    // pickCascadeUnit(600, 24) = 50 → 升序后首列 = 50（round(50/50) = 1），末列 = 600（round(600/50) = 12）
    expect(cols[0].querySelectorAll('[data-cascade-dot]').length).toBe(1)
    expect(cols[6].querySelectorAll('[data-cascade-dot]').length).toBe(12)
  })

  test('dark 反色：墨色取 var(--bg)', async () => {
    const { container } = render(
      <DotCascade data={[{ name: '甲', value: 100 }]} formatValue={(n) => String(n)} dotUnit={10} tone="dark" />
    )
    await mountedRoot(container, '[role="img"]')
    const cap = container.querySelector<HTMLElement>('[data-cascade-dot="9"]')
    expect(cap?.getAttribute('style')).toContain('background: var(--bg)')
  })

  test('pickCascadeUnit 纯函数：确定性 + 边界行为', () => {
    expect(pickCascadeUnit(0)).toBe(1)
    expect(pickCascadeUnit(0)).toBe(pickCascadeUnit(0))
    expect(pickCascadeUnit(600, 24)).toBe(50) // 10→60 20→30 均超上限，50→12 首个落入 [8,24]
    expect(pickCascadeUnit(1150, 24)).toBe(50) // 10→115 20→58 均超上限，50→23
  })

  test('formatCascadeUnitNote：unit≥10000 显示「¥X万」（万元向上取整口径），否则直出元', () => {
    expect(formatCascadeUnitNote(5000)).toBe('一点 = ¥5000')
    expect(formatCascadeUnitNote(50000)).toBe('一点 = ¥5万')
    expect(formatCascadeUnitNote(15000)).toBe('一点 = ¥2万')
  })
})

describe('SquareHundred（编辑风 100 点方阵）', () => {
  test('恒 100 点：Σ=100 时无剩余点，各段点数 = round(value)，段色按传入 color', async () => {
    const { container } = render(
      <SquareHundred
        data={[
          { name: '已收齐', value: 60, color: 'var(--success)' },
          { name: '部分收付', value: 30, color: 'var(--warning)' },
          { name: '已开具', value: 10 },
        ]}
      />
    )
    await mountedFade(container)
    const dots = container.querySelectorAll('[data-square-dot]')
    expect(dots.length).toBe(100)
    expect(container.querySelectorAll('[data-seg="0"]').length).toBe(60)
    expect(container.querySelectorAll('[data-seg="1"]').length).toBe(30)
    expect(container.querySelectorAll('[data-seg="2"]').length).toBe(10)
    expect(container.querySelectorAll('[data-seg="other"]').length).toBe(0)
    const first = container.querySelector<HTMLElement>('[data-square-dot]')
    expect(first?.getAttribute('style')).toContain('background: var(--success)')
  })

  test('Σ < 100：剩余点 var(--border) 填充 + 图例尾行「其他 · N%」', async () => {
    const { container } = render(
      <SquareHundred
        data={[
          { name: 'A', value: 40, color: 'var(--success)' },
          { name: 'B', value: 30, color: 'var(--danger)' },
        ]}
      />
    )
    await mountedFade(container)
    expect(container.querySelectorAll('[data-square-dot]').length).toBe(100)
    expect(container.querySelectorAll('[data-seg="0"]').length).toBe(40)
    expect(container.querySelectorAll('[data-seg="1"]').length).toBe(30)
    const others = container.querySelectorAll<HTMLElement>('[data-seg="other"]')
    expect(others.length).toBe(30)
    others.forEach((d) => expect(d.getAttribute('style')).toContain('background: var(--border)'))
    expect(screen.getByText('其他')).toBeTruthy()
    // 「其他」尾行 30% + B 段 30%，共两处大百分比文本
    expect(screen.getAllByText('30%').length).toBe(2)
  })

  test('Σ > 100：末段截断至 100 并底注「占比四舍五入」，总点数仍恒 100', async () => {
    const { container } = render(
      <SquareHundred
        data={[
          { name: 'A', value: 60, color: 'var(--success)' },
          { name: 'B', value: 30, color: 'var(--danger)' },
          { name: 'C', value: 25 },
        ]}
      />
    )
    await mountedFade(container)
    expect(container.querySelectorAll('[data-square-dot]').length).toBe(100)
    expect(container.querySelectorAll('[data-seg="0"]').length).toBe(60)
    expect(container.querySelectorAll('[data-seg="1"]').length).toBe(30)
    expect(container.querySelectorAll('[data-seg="2"]').length).toBe(10) // 截断：round(25)=25 → 只剩 10 个坑位
    expect(screen.getByText('占比四舍五入')).toBeTruthy()
  })

  test('图例：名称 text-caption + 特大百分比 text-numeric-xl（默认 `${n}%`）', async () => {
    const { container } = render(
      <SquareHundred data={[{ name: '已收齐', value: 60, color: 'var(--success)' }, { name: '其他', value: 40 }]} />
    )
    await mountedFade(container)
    expect(screen.getByText('已收齐')).toBeTruthy()
    const bigs = container.querySelectorAll<HTMLElement>('.text-numeric-xl')
    expect(bigs.length).toBe(2)
    expect(bigs[0].textContent).toBe('60%')
    expect(bigs[0].getAttribute('style')).toContain('color: var(--fg)')
    expect(bigs[1].textContent).toBe('40%')
  })

  test('aria-label 固定为「共 100 点，每点 1%」；formatValue 注入生效', async () => {
    const { container } = render(
      <SquareHundred data={[{ name: 'A', value: 100, color: 'var(--success)' }]} formatValue={(n) => `${n}个点`} />
    )
    await mountedFade(container)
    expect(screen.getByLabelText('共 100 点，每点 1%')).toBeTruthy()
    expect(screen.getByText('100个点')).toBeTruthy()
  })
})
