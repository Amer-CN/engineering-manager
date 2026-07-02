/**
 * SuggestionChips.test.tsx — 推荐问题 pills 测试
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'
import type { SuggestionCardConfig } from '@/types/agent'

import SuggestionChips from '../SuggestionChips'

const allSuggestions: SuggestionCardConfig[] = [
  { icon: 'FolderKanban', title: '项目概况', prompt: '帮我总结项目状态', requiredPermission: 'projects:read', color: 'blue' },
  { icon: 'Receipt', title: '发票待办', prompt: '有哪些发票需要付款', requiredPermission: 'invoices:read', color: 'amber' },
  { icon: 'ClipboardList', title: '结算进度', prompt: '结算情况如何', requiredPermission: 'settlement:read', color: 'emerald' },
  { icon: 'Users', title: '团队成员', prompt: '有多少员工', requiredPermission: 'hr:read', color: 'violet' },
]

describe('SuggestionChips', () => {
  test('渲染所有传入的建议', () => {
    render(React.createElement(SuggestionChips, {
      suggestions: allSuggestions,
      onSelect: vi.fn(),
    }))

    expect(screen.getByText('项目概况')).toBeTruthy()
    expect(screen.getByText('发票待办')).toBeTruthy()
    expect(screen.getByText('结算进度')).toBeTruthy()
    expect(screen.getByText('团队成员')).toBeTruthy()
  })

  test('点击触发 onSelect 并传入 prompt', () => {
    const onSelect = vi.fn()
    render(React.createElement(SuggestionChips, {
      suggestions: allSuggestions,
      onSelect,
    }))

    fireEvent.click(screen.getByText('项目概况'))
    expect(onSelect).toHaveBeenCalledWith('帮我总结项目状态')
  })

  test('空列表不渲染', () => {
    const { container } = render(React.createElement(SuggestionChips, {
      suggestions: [],
      onSelect: vi.fn(),
    }))
    expect(container.firstChild).toBeNull()
  })

  test('disabled 时点击不触发', () => {
    const onSelect = vi.fn()
    render(React.createElement(SuggestionChips, {
      suggestions: allSuggestions,
      onSelect,
      disabled: true,
    }))

    const btn = screen.getByText('项目概况').closest('button')
    expect(btn?.disabled).toBe(true)
    fireEvent.click(btn!)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
