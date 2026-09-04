/**
 * data-table-sort.test.tsx — DataTable 排序 / 表尾合计 / statusTone 测试（Beautiful UI A1）
 *
 *  - 表头点击：升/降循环（中文 localeCompare('zh')、金额列数值比较）
 *  - 表尾统计行：共 N 条 · 金额合计 ¥X
 *  - statusTone 映射：issued→success、cancelled→danger、pending→warning、进行类→info、未知→null
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable } from '../DataTable'
import { statusTone } from '../richToolResult.utils'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

const rows = [
  { id: 1, name: '甲项目', status: 'in_progress', amount: 300 },
  { id: 2, name: '乙项目', status: 'issued', amount: 100 },
  { id: 3, name: '丙项目', status: 'cancelled', amount: 200 },
]

/** 断言 a 在文档中位于 b 之前 */
const before = (a: HTMLElement, b: HTMLElement) => {
  expect(a).toBeTruthy()
  expect(b).toBeTruthy()
  expect(!!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
}

describe('DataTable 排序（A1）', () => {
  it('金额列点击升序→数值比较；再点降序翻转', () => {
    const { container } = render(<DataTable rows={rows} />)
    const ordered = () => [
      screen.getByText('甲项目'), screen.getByText('乙项目'), screen.getByText('丙项目'),
    ]
    fireEvent.click(screen.getByRole('button', { name: /金额/ }))
    const [jia1, yi1, bing1] = ordered()
    before(yi1, bing1)
    before(bing1, jia1)
    // 再点一次 → 降序翻转
    fireEvent.click(screen.getByRole('button', { name: /金额/ }))
    const [jia2, yi2, bing2] = ordered()
    before(jia2, bing2)
    before(bing2, yi2)
    // 箭头图标存在且降序时旋转 180°
    const arrow = container.querySelector('[data-testid="icon"]')?.parentElement as HTMLElement
    expect(arrow.style.transform).toBe('rotate(180deg)')
  })

  it('中文名称列按 localeCompare("zh") 拼音排序', () => {
    const zhRows = [
      { name: '上海', amount: 1 },
      { name: '北京', amount: 2 },
      { name: '广州', amount: 3 },
    ]
    render(<DataTable rows={zhRows} />)
    fireEvent.click(screen.getByRole('button', { name: /名称/ }))
    const bj = screen.getByText('北京')
    const gz = screen.getByText('广州')
    const sh = screen.getByText('上海')
    // 拼音序 bei < guang < shang
    before(bj, gz)
    before(gz, sh)
  })

  it('表尾统计行：共 N 条 · 金额合计（数值求和 + 千分位）', () => {
    render(<DataTable rows={rows} />)
    expect(screen.getByText(/共 3 条/)).toBeTruthy()
    expect(screen.getByText(/金额合计 ¥600\.00/)).toBeTruthy()
  })

  it('非金额列或含非数字行 → 不渲染合计', () => {
    render(<DataTable rows={[{ name: 'A', amount: 'x' }, { name: 'B', amount: 1 }]} />)
    expect(screen.getByText(/共 2 条/)).toBeTruthy()
    expect(screen.queryByText(/金额合计/)).toBeNull()
  })

  it('原生 table 结构：thead/tbody 由同一 table 承载（列宽浏览器自动同步）', () => {
    const { container } = render(<DataTable rows={rows} />)
    const table = container.querySelector('table')
    expect(table).not.toBeNull()
    expect(container.querySelectorAll('thead th').length).toBe(4) // id/name/status/amount
    expect(container.querySelectorAll('tbody tr').length).toBe(3)
  })

  it('首列粘性：th/td 均为 sticky + var(--card) 底色 + box-shadow 内嵌列线', () => {
    const { container } = render(<DataTable rows={rows} />)
    const firstTh = container.querySelector('thead th') as HTMLElement
    const firstTd = container.querySelector('tbody td') as HTMLElement
    for (const cell of [firstTh, firstTd]) {
      expect(cell.style.position).toBe('sticky')
      expect(cell.style.left).toBe('0px')
      expect(cell.style.background).toContain('var(--card)')
      expect(cell.style.boxShadow).toContain('inset -1px')
    }
    expect(firstTh.style.zIndex).toBe('1')
  })
})

describe('statusTone 映射（A1，A2 依赖）', () => {
  it('成功类 → success', () => {
    expect(statusTone('issued')).toBe('success')
    expect(statusTone('received')).toBe('success')
    expect(statusTone('completed')).toBe('success')
  })
  it('风险类 → danger / warning', () => {
    expect(statusTone('cancelled')).toBe('danger')
    expect(statusTone('red_flushed')).toBe('danger')
    expect(statusTone('pending')).toBe('warning')
    expect(statusTone('partially_paid')).toBe('warning')
  })
  it('进行类 → info', () => {
    expect(statusTone('active')).toBe('info')
    expect(statusTone('in_progress')).toBe('info')
    expect(statusTone('planning')).toBe('info')
    expect(statusTone('draft')).toBe('info')
  })
  it('未知 → null（不着色）', () => {
    expect(statusTone('whatever_value')).toBeNull()
    expect(statusTone('')).toBeNull()
    expect(statusTone(123)).toBeNull()
    expect(statusTone(null)).toBeNull()
  })
})
