/**
 * status-chips.test.tsx — DataTable 状态筛选芯片测试（Beautiful UI A2，真实过滤版）
 *
 *  - 无状态列 / 值域 <2 → 不渲染芯片
 *  - 有状态列 → 渲染 全部+各值芯片，计数固定正确（用全量 rows）
 *  - 点击筛选 → 未匹配行直接不渲染（真实过滤，DOM 增删而非收起）
 *  - 筛选值全部落在首屏 8 条之后 → 表格仍显示匹配行（切片来自筛选后集合）
 *  - 展开按钮文案用筛选后计数；筛选后 ≤8 条时隐藏
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

/** tbody 数据行 */
const bodyRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('tbody tr')) as HTMLElement[]

describe('状态筛选芯片（A2，真实过滤）', () => {
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

  it('点击筛选 → 未匹配行直接不渲染（真实过滤），芯片 aria-pressed 翻转', () => {
    const { container } = render(<DataTable rows={rows} />)
    expect(bodyRows(container).length).toBe(3)

    fireEvent.click(screen.getByRole('button', { name: /部分收款/ }))
    const chip = screen.getByRole('button', { name: /部分收款/ })
    expect(chip.getAttribute('aria-pressed')).toBe('true')

    // 只渲染匹配行：仅 B发票
    const shown = bodyRows(container)
    expect(shown.length).toBe(1)
    expect(shown[0].textContent).toContain('B发票')
    expect(screen.queryByText('A发票')).toBeNull()
    expect(screen.queryByText('C发票')).toBeNull()

    // 表尾计数用筛选后集合
    expect(screen.getByText('共 1 条')).toBeTruthy()
  })

  it('筛选值全部落在首屏 8 条之后 → 仍显示匹配行（切片来自筛选后集合）', () => {
    // 12 行：部分收款值只出现在第 9-11 条（索引 8+），默认只显示前 8 条
    const many: Record<string, unknown>[] = Array.from({ length: 12 }, (_, i) => ({
      name: `发票${i + 1}`,
      status: i >= 8 ? 'partially_paid' : 'issued',
      amount: (i + 1) * 10,
    }))
    const { container } = render(<DataTable rows={many} />)
    expect(bodyRows(container).length).toBe(8)
    // 首屏 8 行全为 issued，不含部分收款（芯片本身含该文案，只断言行）
    expect(bodyRows(container).every((r) => !r.textContent?.includes('部分收款'))).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /部分收款/ }))
    const shown = bodyRows(container)
    expect(shown.length).toBe(4) // 4 条匹配行全部可见
    shown.forEach((r) => expect(r.textContent).toContain('部分收款'))
    expect(screen.getByText('共 4 条')).toBeTruthy()
    // 展开按钮文案用筛选后计数；筛选后 4 条 ≤ 8 → 按钮隐藏
    expect(screen.queryByRole('button', { name: /展开全部/ })).toBeNull()
  })

  it('展开按钮文案用筛选后计数（筛选态与表尾一致）；筛选后 ≤8 条隐藏', () => {
    // issued 3 条 + partially_paid 9 条 = 12 条（> 8，按钮可见）
    const many: Record<string, unknown>[] = [
      ...Array.from({ length: 3 }, (_, i) => ({ name: `I${i}`, status: 'issued', amount: i })),
      ...Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, status: 'partially_paid', amount: 100 + i })),
    ]
    render(<DataTable rows={many} />)
    // 全部态：文案用全量 12
    expect(screen.getByRole('button', { name: '展开全部（共 12 条）' })).toBeTruthy()
    expect(screen.getByText('共 12 条')).toBeTruthy()

    // 筛选部分收款：9 条 > 8 → 按钮可见且文案用筛选后计数
    fireEvent.click(screen.getByRole('button', { name: /^部分收款/ }))
    expect(screen.getByRole('button', { name: '展开全部（共 9 条）' })).toBeTruthy()
    expect(screen.getByText('共 9 条')).toBeTruthy()

    // 筛选已开具：3 条 ≤ 8 → 按钮隐藏
    fireEvent.click(screen.getByRole('button', { name: /^全部/ }))
    fireEvent.click(screen.getByRole('button', { name: /^已开具/ }))
    expect(screen.queryByRole('button', { name: /展开全部/ })).toBeNull()
    expect(screen.getByText('共 3 条')).toBeTruthy()
  })

  it('点回「全部」→ 行全部恢复可见', () => {
    const { container } = render(<DataTable rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: /已开具/ }))
    expect(bodyRows(container).length).toBe(2) // A/C
    fireEvent.click(screen.getByRole('button', { name: /全部/ }))
    expect(bodyRows(container).length).toBe(3)
  })
})
