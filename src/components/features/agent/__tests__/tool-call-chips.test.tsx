/**
 * tool-call-chips.test.tsx — ToolCallChips 渲染与展开交互测试
 *
 *  (a) 空列表 → 整体不渲染；
 *  (b) 渲染工具行：中文工具名 + chip（原始名 mono）；
 *  (c) 点击行展开详情（aria-expanded 翻转 + 详情网格行 0fr→1fr）；
 *  (d) 三态徽章与尾部 pill（Beautiful UI 第二批状态化）：
 *      running=旋转环/进行中、done=绿✓（success）/已完成、failed=红✗（danger）/失败。
 */

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ToolCallChips from '../ToolCallChips'

afterEach(cleanup)

/** 详情行外层（grid 0fr→1fr 过渡容器） */
function detailGridOf(text: RegExp): HTMLElement {
  const line = screen.getByText(text)
  const grid = line.closest('div.grid')
  expect(grid).not.toBeNull()
  return grid as HTMLElement
}

describe('ToolCallChips', () => {
  it('空工具列表 → 不渲染任何内容', () => {
    const { container } = render(<ToolCallChips tools={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('渲染工具行：中文工具名 + chip 原始名', () => {
    render(
      <ToolCallChips
        tools={[
          { id: 't1', name: 'getProjects' },
          { id: 't2', name: 'searchKnowledgeBase' },
        ]}
      />,
    )
    // toolLabel 中文标签（richToolResult.utils 的映射）
    expect(screen.getByText('项目列表')).toBeTruthy()
    expect(screen.getByText('知识库检索')).toBeTruthy()
    // chip 文本 = 原始工具名
    expect(screen.getByText('getProjects')).toBeTruthy()
    expect(screen.getByText('searchKnowledgeBase')).toBeTruthy()
  })

  it('点击行 → 展开详情；再点收起', () => {
    render(<ToolCallChips tools={[{ id: 't1', name: 'getProjects' }]} />)
    const row = screen.getByRole('button', { name: /项目列表/ })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(detailGridOf(/正在调用/).style.gridTemplateRows).toBe('0fr')

    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(detailGridOf(/正在调用/).style.gridTemplateRows).toBe('1fr')
    expect(screen.getByText(/正在调用 getProjects/)).toBeTruthy()

    fireEvent.click(row)
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(detailGridOf(/正在调用/).style.gridTemplateRows).toBe('0fr')
  })

  // ── Beautiful UI 第二批：状态化三态 ──

  it('running 态：行首旋转环（animate-spin）+ 尾部「进行中」pill（muted 色）', () => {
    const { container } = render(
      <ToolCallChips tools={[{ id: 't1', name: 'getProjects', status: 'running' }]} />,
    )
    expect(screen.getByLabelText('进行中')).toBeTruthy()
    expect(container.querySelector('.animate-spin')).not.toBeNull()
    const pill = screen.getByText('进行中') as HTMLElement
    expect(pill.style.color).toBe('var(--muted)')
    // running 无 pop-in 终态动画
    expect(pill.style.animation).toBe('')
  })

  it('done 态：绿✓徽章（pop-in + success 色）+ 尾部「已完成」pill', () => {
    render(<ToolCallChips tools={[{ id: 't1', name: 'getProjects', status: 'done' }]} />)
    const badge = screen.getByLabelText('成功') as HTMLElement
    expect(badge.style.background).toBe('var(--success)')
    expect(badge.style.animation).toContain('pop-in')
    const pill = screen.getByText('已完成') as HTMLElement
    expect(pill.style.color).toBe('var(--success)')
    expect(pill.style.background).toBe('var(--success-soft)')
  })

  it('failed 态：红✗徽章（pop-in + danger 色）+ 尾部「失败」pill', () => {
    render(<ToolCallChips tools={[{ id: 't1', name: 'getProjects', status: 'failed' }]} />)
    const badge = screen.getByLabelText('失败') as HTMLElement
    expect(badge.style.background).toBe('var(--danger)')
    expect(badge.style.animation).toContain('pop-in')
    const pill = screen.getByText('失败') as HTMLElement
    expect(pill.style.color).toBe('var(--danger)')
    expect(pill.style.background).toBe('var(--danger-soft)')
  })

  it('status 缺省按 running 展示', () => {
    render(<ToolCallChips tools={[{ id: 't1', name: 'getProjects' }]} />)
    expect(screen.getByLabelText('进行中')).toBeTruthy()
    expect(screen.getByText('进行中')).toBeTruthy()
  })
})
