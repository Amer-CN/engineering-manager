/**
 * ConversationHistory.test.tsx — 对话历史测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──
const mockGetAgentConversations = vi.hoisted(() => vi.fn())
const mockGetDeletedAgentConversations = vi.hoisted(() => vi.fn())
const mockDeleteAgentConversation = vi.hoisted(() => vi.fn())
const mockRenameAgentConversation = vi.hoisted(() => vi.fn())
vi.mock('@/services/agent-client', () => ({
  getAgentConversations: mockGetAgentConversations,
  getDeletedAgentConversations: mockGetDeletedAgentConversations,
  deleteAgentConversation: mockDeleteAgentConversation,
  renameAgentConversation: mockRenameAgentConversation,
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: vi.fn(() => true),
    isAdmin: vi.fn(() => false),
    hasRole: vi.fn(() => false),
  }),
}))

vi.mock('@/types/permissions', () => ({
  hasPermission: vi.fn(() => true),
  hasAllPermissions: vi.fn(() => true),
  hasAnyPermission: vi.fn(() => true),
  isAdmin: vi.fn(() => false),
  hasRole: vi.fn(() => false),
  getCurrentUser: vi.fn(() => null),
}))

import ConversationHistory from '../ConversationHistory'
import type { AgentConversation } from '@/types/agent'

// 使用相对日期，避免跨日测试失败
const _now = new Date()
const _yesterday = new Date(_now.getTime() - 86400000)
const _earlier = new Date(_now.getTime() - 10 * 86400000)

const mockConversations: AgentConversation[] = [
  { id: 1, title: '今天的对话', lastMessage: '最新消息', messageCount: 3, createdAt: _now.toISOString(), updatedAt: _now.toISOString() },
  { id: 2, title: '昨天的对话', lastMessage: '昨天消息', messageCount: 2, createdAt: _yesterday.toISOString(), updatedAt: _yesterday.toISOString() },
  { id: 3, title: '更早的对话', lastMessage: '旧消息', messageCount: 1, createdAt: _earlier.toISOString(), updatedAt: _earlier.toISOString() },
]

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ConversationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgentConversations.mockResolvedValue(mockConversations)
    // R3.4: 组件 loadConversations 用 Promise.all 同时拉取「最近删除」列表，
    // mock 缺该函数会导致加载必抛、列表恒空（6 条测试全部挂在此处）。
    mockGetDeletedAgentConversations.mockResolvedValue([])
    mockDeleteAgentConversation.mockResolvedValue(true)
    mockRenameAgentConversation.mockResolvedValue(true)
  })

  test('渲染日期分组', async () => {
    renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => expect(mockGetAgentConversations).toHaveBeenCalled())

    // 等待数据渲染
    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    expect(screen.getByText('今天')).toBeTruthy()
    expect(screen.getByText('昨天')).toBeTruthy()
    expect(screen.getByText('更早')).toBeTruthy()
  })

  test('点删除 → 弹 ConfirmDialog; 确认后调用 deleteAgentConversation 且乐观移除', async () => {
    const { container } = renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    // hover 出删除按钮 — 用 querySelector 找到 hover 删除按钮
    const deleteButtons = container.querySelectorAll('button[title="删除对话"]')
    expect(deleteButtons.length).toBeGreaterThan(0)

    fireEvent.click(deleteButtons[0])

    // 弹出确认框
    await waitFor(() => {
      expect(screen.getByText('删除对话')).toBeTruthy()
    })

    // 点确认
    const confirmBtn = screen.getByText('删除')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockDeleteAgentConversation).toHaveBeenCalledWith(1)
    })
  })

  test('deleteAgentConversation reject → 列表回滚', async () => {
    mockDeleteAgentConversation.mockRejectedValue(new Error('network'))

    const { container } = renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    const deleteButtons = container.querySelectorAll('button[title="删除对话"]')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByText('删除对话')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('删除'))

    // 等待回滚
    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })
  })

  test('点重命名按钮 → 出现输入框; Enter 保存 → 调用 renameAgentConversation', async () => {
    const { container } = renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    // 找到重命名按钮
    const renameButtons = container.querySelectorAll('button[title="重命名对话"]')
    expect(renameButtons.length).toBeGreaterThan(0)

    fireEvent.click(renameButtons[0])

    // 出现输入框，值为原标题
    const input = await screen.findByDisplayValue('今天的对话')
    expect(input).toBeTruthy()

    // 修改标题
    fireEvent.change(input, { target: { value: '新标题测试' } })

    // 按 Enter 保存
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockRenameAgentConversation).toHaveBeenCalledWith(1, '新标题测试')
    })
  })

  test('Esc 取消重命名 → 不调用 renameAgentConversation', async () => {
    const { container } = renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    const renameButtons = container.querySelectorAll('button[title="重命名对话"]')
    fireEvent.click(renameButtons[0])

    const input = await screen.findByDisplayValue('今天的对话')
    fireEvent.change(input, { target: { value: '不该保存的' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    // 重命名输入框消失（搜索框仍存在，不能用 querySelector）
    await waitFor(() => {
      expect(screen.queryByDisplayValue('不该保存的')).toBeNull()
    })

    expect(mockRenameAgentConversation).not.toHaveBeenCalled()
  })

  test('重命名失败 → toast.error 且标题回滚', async () => {
    mockRenameAgentConversation.mockResolvedValue(false)

    const { container } = renderWithProviders(
      <ConversationHistory
        inline
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })

    const renameButtons = container.querySelectorAll('button[title="重命名对话"]')
    fireEvent.click(renameButtons[0])

    const input = await screen.findByDisplayValue('今天的对话')
    fireEvent.change(input, { target: { value: '失败标题' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // 回滚后原标题还在
    await waitFor(() => {
      expect(screen.getByText('今天的对话')).toBeTruthy()
    })
  })
})
