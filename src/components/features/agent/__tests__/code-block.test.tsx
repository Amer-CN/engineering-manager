/**
 * code-block.test.tsx — Markdown 代码块卡片测试（Beautiful UI B2）
 *
 *  - 头栏显示语言标签（fence 语言；空则「代码」）
 *  - 复制按钮：clipboard 收到纯代码文本，copied 态翻转（Check + 已复制）1.5s 后复位
 *  - 行号在 code 外层：code.textContent 等于纯代码
 *  - 未闭合围栏（流式吃到尾部）：渲染已有行 + 行号，复制按钮禁用
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MarkdownRenderer from '../MarkdownRenderer'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('代码块卡片（B2）', () => {
  it('头栏显示语言标签；code.textContent 等于纯代码（行号在 code 外）', () => {
    const { container } = render(
      <MarkdownRenderer content={'```ts\nconst a = 1\nconst b = 2\n```'} />,
    )
    expect(screen.getByText('ts')).toBeTruthy()
    const code = container.querySelector('pre code')
    expect(code?.textContent).toBe('const a = 1\nconst b = 2')
    // 行号列：2 行 → 两个行号，且不在 code 里
    const nums = container.querySelectorAll('.select-none div')
    expect(nums.length).toBe(2)
    expect(nums[0].textContent).toBe('1')
    expect(nums[1].textContent).toBe('2')
  })

  it('无语言围栏 → 显示「代码」', () => {
    render(<MarkdownRenderer content={'```\nfoo\n```'} />)
    expect(screen.getByText('代码')).toBeTruthy()
  })

  it('复制按钮：clipboard 收到纯代码，copied 态（Check+已复制）1.5s 后复位', async () => {
    vi.useFakeTimers()
    const { container } = render(
      <MarkdownRenderer content={'```ts\nconst a = 1\nconst b = 2\n```'} />,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '复制代码' }))
    })
    expect(writeText).toHaveBeenCalledWith('const a = 1\nconst b = 2')
    expect(screen.getByText('已复制')).toBeTruthy()
    expect(container.querySelector('[data-testid="icon"]')?.textContent).toBe('Check')
    // 1.5s 复位
    await act(async () => {
      vi.advanceTimersByTime(1600)
    })
    expect(screen.getByText('复制')).toBeTruthy()
    expect(container.querySelector('[data-testid="icon"]')?.textContent).toBe('Copy')
  })

  it('未闭合围栏（流式）：渲染已有行 + 行号，复制按钮禁用', () => {
    const { container } = render(
      <MarkdownRenderer content={'```py\nprint(1)\nprint(2)'} />,
    )
    expect(container.querySelector('pre code')?.textContent).toBe('print(1)\nprint(2)')
    expect(container.querySelectorAll('.select-none div').length).toBe(2)
    const btn = screen.getByRole('button', { name: '复制代码' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
