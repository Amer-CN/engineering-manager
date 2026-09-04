/**
 * agent-stream-tail.test.tsx — AgentStreamTail 组合件渲染回归测试
 *
 * 四分支：
 *  (a) showLoader=false && tools=[] → 返回 null（不渲染任何节点）；
 *  (b) showLoader=true → 渲染 PixelLoader（aria-hidden 像素网格 + 计时文本）；
 *  (c) tools 非空 → 渲染 ToolCallChips 工具行；
 *  (d) 两者同时存在时都渲染。
 */

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AgentStreamTail from '../AgentStreamTail'
import type { InFlightTool } from '../ToolCallChips'

afterEach(cleanup)

const TOOLS: InFlightTool[] = [{ id: 't1', name: 'getProjects', status: 'done' }]

describe('AgentStreamTail', () => {
  it('showLoader=false 且 tools=[] → 返回 null，不渲染任何节点', () => {
    const { container } = render(<AgentStreamTail showLoader={false} tools={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('showLoader=true → 渲染 PixelLoader（aria-hidden 像素网格 + 计时文本）', () => {
    const { container } = render(<AgentStreamTail showLoader tools={[]} />)
    // 像素网格：aria-hidden 的 3×3 span.grid，9 个像素格
    const grid = container.querySelector('span[aria-hidden].grid')
    expect(grid).not.toBeNull()
    expect(grid!.children).toHaveLength(9)
    // shimmer 标签 + 计时文本（0.0s 起步，正则避免 100ms tick 竞态）
    expect(screen.getByText('思考中')).toBeTruthy()
    expect(screen.getByText(/^(\d+m )?\d+\.\d+s$/)).toBeTruthy()
  })

  it('tools 非空 → 渲染 ToolCallChips 工具行（不渲染 loader）', () => {
    const { container } = render(<AgentStreamTail showLoader={false} tools={TOOLS} />)
    // 工具行：中文标签 + 原始名 chip + 终态 pill
    expect(screen.getByText('项目列表')).toBeTruthy()
    expect(screen.getByText('getProjects')).toBeTruthy()
    expect(screen.getByText('已完成')).toBeTruthy()
    // showLoader=false 时不出现 PixelLoader 像素网格与计时文本
    expect(container.querySelector('span[aria-hidden].grid')).toBeNull()
    expect(screen.queryByText(/^(\d+m )?\d+\.\d+s$/)).toBeNull()
  })

  it('showLoader=true 且 tools 非空 → PixelLoader 与工具行都渲染', () => {
    const { container } = render(<AgentStreamTail showLoader tools={TOOLS} />)
    expect(container.querySelector('span[aria-hidden].grid')).not.toBeNull()
    expect(screen.getByText('思考中')).toBeTruthy()
    expect(screen.getByText('项目列表')).toBeTruthy()
    expect(screen.getByText('getProjects')).toBeTruthy()
  })
})
