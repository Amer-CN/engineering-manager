/**
 * status-chips.test.tsx — DataTable 状态筛选芯片测试（Beautiful UI A2）
 *
 *  - 无状态列 / 值域 <2 → 不渲染芯片
 *  - 有状态列 → 渲染 全部+各值芯片，计数固定正确
 *  - 点击筛选 → 行收起（DOM 保留，grid-template-rows 0fr + opacity 0）
 *  - 点回「全部」→ 行全部恢复
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable } from '../DataTable'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

const rows = [
  { name: 'A发票', status: 'issued', amount: 100 },
  { name: 'B发票', status: 'partially_paid', amount: 200 },
  { name: 'C发票', status: 'issued', amount: 50 },
]

/** 行包裹层（带 grid-template-rows 收起样式的 div） */
const rowWrappers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('div[style*="grid-template-rows"]')) as HTMLElement[]

describe('状态筛选芯片（A2）', () => {
  it('无状态列 → 不渲染芯片', () => {
    render(<DataTable rows={[{ name: 'A', amount: 1 }, { name: 'B', amount: 2 }]} />)
    expect(screen.queryByText('全部')).toBeNull()
  })

  it('状态列值域 <2 种 → 不渲染芯片', () => {
    render(<DataTable rows={[
      { name: 'A', status: 'issued', amount: 1 },
      { name: 'B', status: 'issued', amount: 2 },
    ]} />)
    expect(screen.queryByText('全部')).toBeNull()
  })

  it('有状态列 → 渲染 全部+各值芯片，计数固定（不随筛选变）', () => {
    render(<DataTable rows={rows} />)
    const allChip = screen.getByRole('button', { name: /全部/ })
    const issuedChip = screen.getByRole('button', { name: /已开具/ })
    const paidChip = screen.getByRole('button', { name: /部分收款/ })
    expect(allChip.textContent).toContain('3')
    expect(issuedChip.textContent).toContain('2')
    expect(paidChip.textContent).toContain('1')
    expect(allChip.getAttribute('aria-pressed')).toBe('true')

    // 筛选后计数不变
    fireEvent.click(paidChip)
    expect(screen.getByRole('button', { name: /已开具/ }).textContent).toContain('2')
  })

  it('点击筛选 → 未选中行收起（DOM 存在但 0fr/opacity 0），芯片 aria-pressed 翻转', () => {
    const { container } = render(<DataTable rows={rows} />)
    const wrappers = rowWrappers(container)
    expect(wrappers.length).toBe(3)
    wrappers.forEach((w) => expect(w.style.gridTemplateRows).toBe('1fr'))

    fireEvent.click(screen.getByRole('button', { name: /部分收款/ }))
    const chip = screen.getByRole('button', { name: /部分收款/ })
    expect(chip.getAttribute('aria-pressed')).toBe('true')

    // 仍渲染 3 行 DOM；只有 B发票 可见
    expect(rowWrappers(container).length).toBe(3)
    const states = rowWrappers(container).map((w) => ({
      rows: w.style.gridTemplateRows,
      opacity: w.style.opacity,
      text: w.textContent,
    }))
    expect(states.find((s) => s.text?.includes('B发票'))?.rows).toBe('1fr')
    expect(states.find((s) => s.text?.includes('A发票'))?.rows).toBe('0fr')
    expect(states.find((s) => s.text?.includes('A发票'))?.opacity).toBe('0')
    expect(states.find((s) => s.text?.includes('C发票'))?.opacity).toBe('0')
  })

  it('点回「全部」→ 行全部恢复可见', () => {
    const { container } = render(<DataTable rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: /已开具/ }))
    expect(rowWrappers(container).filter((w) => w.style.gridTemplateRows === '0fr').length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /全部/ }))
    rowWrappers(container).forEach((w) => expect(w.style.gridTemplateRows).toBe('1fr'))
  })
})
