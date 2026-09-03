import { describe, test, expect } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorialDonut, computeDonutSegments } from '@/components/ui/charts/EditorialDonut'

const data = [
  { name: '材料费', value: 30, color: '#3b82f6' },
  { name: '劳务费', value: 20, color: '#10b981' },
  { name: '机械费', value: 10, color: '#f59e0b' },
]

// 从弧段 path 的首个 M/A 端点反解绘制角度（0° 在 12 点方向、顺时针，与组件 polar 一致）
function angleOfPoint(x: number, y: number): number {
  return (Math.atan2(y - 50, x - 50) * 180) / Math.PI + 90
}

function drawnSweep(d: string): number {
  const m = d.match(/^M ([-\d.]+) ([-\d.]+) A [\d.]+ [\d.]+ \d \d 1 ([-\d.]+) ([-\d.]+)/)
  if (!m) throw new Error(`无法从 path 反解角度: ${d}`)
  const a = angleOfPoint(parseFloat(m[1]), parseFloat(m[2]))
  const b = angleOfPoint(parseFloat(m[3]), parseFloat(m[4]))
  return (b - a + 360) % 360
}

describe('EditorialDonut（编辑风多段圆环）', () => {
  test('渲染图例与中心合计（真实数值）', () => {
    render(<EditorialDonut data={data} formatValue={(n) => String(n)} />)
    expect(screen.getByText('材料费')).toBeTruthy()
    expect(screen.getByText('劳务费')).toBeTruthy()
    expect(screen.getByText('机械费')).toBeTruthy()
    expect(screen.getByText('合计')).toBeTruthy()
    expect(screen.getByText('60')).toBeTruthy()
  })

  test('弧长与数值严格成正比：名义角度 = value/total*360', () => {
    const segs = computeDonutSegments(data)
    const total = 60
    expect(segs.length).toBe(3)
    segs.forEach((s) => {
      const expected = (s.value / total) * 360
      expect(s.endDeg - s.startDeg).toBeCloseTo(expected, 6)
    })
    // 名义角度连续拼接，覆盖 0→360
    expect(segs[0].startDeg).toBeCloseTo(0, 6)
    expect(segs[segs.length - 1].endDeg).toBeCloseTo(360, 6)
  })

  test('hover 弧段出现 tooltip（名称/数值/占比）', () => {
    const { container } = render(<EditorialDonut data={data} formatValue={(n) => String(n)} />)
    const paths = container.querySelectorAll('path[data-segment]')
    expect(paths.length).toBe(3)
    fireEvent.mouseEnter(paths[0], { clientX: 10, clientY: 10 })
    // 占比 30/60 = 50.0%（仅 tooltip 中出现）
    expect(screen.getByText('50.0%')).toBeTruthy()
    // tooltip 与图例中都有数值 30
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(2)
  })

  test('鼠标移出后 tooltip 消失', () => {
    const { container } = render(<EditorialDonut data={data} formatValue={(n) => String(n)} />)
    const paths = container.querySelectorAll('path[data-segment]')
    fireEvent.mouseEnter(paths[0], { clientX: 10, clientY: 10 })
    expect(screen.getByText('50.0%')).toBeTruthy()
    fireEvent.mouseLeave(container.querySelector('svg') as Element)
    expect(screen.queryByText('50.0%')).toBeNull()
  })

  test('零值段不参与计算；空数据渲染占位环', () => {
    const withZero = [...data, { name: '零值', value: 0, color: '#94a3b8' }]
    expect(computeDonutSegments(withZero).length).toBe(3)

    const { container } = render(<EditorialDonut data={[]} />)
    expect(container.querySelectorAll('path[data-segment]').length).toBe(0)
    expect(screen.getByText('合计')).toBeTruthy()
    expect(container.querySelector('svg path')).toBeTruthy()
  })

  test('单段数据渲染完整 360° 圆环', () => {
    const single = [{ name: '唯一', value: 5, color: '#3b82f6' }]
    const segs = computeDonutSegments(single)
    expect(segs.length).toBe(1)
    expect(segs[0].endDeg - segs[0].startDeg).toBeCloseTo(360, 6)
    const { container } = render(<EditorialDonut data={single} />)
    const d = container.querySelector('path[data-segment]')?.getAttribute('d') ?? ''
    expect(d).toContain('A')
  })

  test('绘制弧长随数值单调不减（从 path 反解绘制角度回归）', () => {
    // 名义角 1° / 1.4° 跨在发丝缝阈值 1.2° 两侧，用于抓绘制分支不连续（旧缺陷：1.4° 段反而画出更小弧）
    const dataMono = [
      { name: '小', value: 1, color: '#3b82f6' },
      { name: '中', value: 1.4, color: '#10b981' },
      { name: '大', value: 357.6, color: '#f59e0b' },
    ]
    const { container } = render(<EditorialDonut data={dataMono} formatValue={(n) => String(n)} />)
    const ds = Array.from(container.querySelectorAll('path[data-segment]')).map((p) => p.getAttribute('d') ?? '')
    const sweeps = ds.map(drawnSweep)
    for (let i = 1; i < sweeps.length; i++) {
      // 容差 0.05° 覆盖 path 坐标 toFixed(2) 的反解噪声
      expect(sweeps[i]).toBeGreaterThanOrEqual(sweeps[i - 1] - 0.05)
    }
  })
})
