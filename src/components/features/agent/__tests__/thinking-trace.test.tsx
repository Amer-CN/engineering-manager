/**
 * thinking-trace.test.tsx — ThinkingTrace 状态与展开交互测试
 *
 *  (a) working 态：标题 shimmer「思考中」，自动展开（aria-expanded=true）；
 *  (b) 完成态：标题「已思考」，默认收起，点击可展开/收起（网格行 0fr→1fr）；
 *  (c) 思考正文按行渲染。
 */

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ThinkingTrace from '../ThinkingTrace'

afterEach(cleanup)

/** 正文行外层的展开容器（grid 0fr→1fr 过渡容器） */
function traceGridOf(text: string): HTMLElement {
  const grid = screen.getByText(text).closest('div.grid')
  expect(grid).not.toBeNull()
  return grid as HTMLElement
}

describe('ThinkingTrace', () => {
  it('working 态 → 标题显示「思考中」且自动展开', () => {
    render(<ThinkingTrace reasoning={'第一段推理\n第二段推理'} working />)
    expect(screen.getByText('思考中')).toBeTruthy()
    expect(screen.queryByText('已思考')).toBeNull()
    const header = screen.getByRole('button', { name: /思考中/ })
    expect(header.getAttribute('aria-expanded')).toBe('true')
  })

  it('完成态 → 标题「已思考」，点击展开/收起', () => {
    render(<ThinkingTrace reasoning="推理行 A" working={false} />)
    expect(screen.getByText('已思考')).toBeTruthy()
    expect(screen.queryByText('思考中')).toBeNull()
    const header = screen.getByRole('button', { name: /已思考/ })

    // 默认收起（网格行 0fr）
    expect(header.getAttribute('aria-expanded')).toBe('false')
    expect(traceGridOf('推理行 A').style.gridTemplateRows).toBe('0fr')

    // 点击展开
    fireEvent.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('true')
    expect(traceGridOf('推理行 A').style.gridTemplateRows).toBe('1fr')

    // 再点收起
    fireEvent.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('false')
    expect(traceGridOf('推理行 A').style.gridTemplateRows).toBe('0fr')
  })

  it('思考正文按换行拆分为逐行展示', () => {
    render(<ThinkingTrace reasoning={'第一行\n\n第二行'} working={false} />)
    expect(screen.getByText('第一行')).toBeTruthy()
    expect(screen.getByText('第二行')).toBeTruthy()
  })

  it('正文容器带 max-h-64 + overflow-y-auto（超长 reasoning 不撑高消息）', () => {
    render(<ThinkingTrace reasoning="推理行 A" working={false} />)
    const container = screen.getByText('推理行 A').parentElement as HTMLElement
    expect(container.className).toContain('max-h-64')
    expect(container.className).toContain('overflow-y-auto')
  })
})
