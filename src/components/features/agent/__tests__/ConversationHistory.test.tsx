/**
 * ConversationHistory.test.tsx — 对话历史测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──
const mockGetAgentConversations = vi.hoisted(() => vi.fn())
const mockDeleteAgentConversation = vi.hoisted(() => vi.fn())
vi.mock('@/services/agent-client', () => ({
  getAgentConversations: mockGetAgentConversations,
  deleteAgentConversation: mockDeleteAgentConversation,
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

const mockConversations: AgentConversation[] = [
  { id: 1, title: '今天的对话', lastMessage: '最新消息', messageCount: 3, createdAt: '2026-07-02T10:00:00Z', updatedAt: '2026-07-02T10:30:00Z' },
  { id: 2, title: '昨天的对话', lastMessage: '昨天消息', messageCount: 2, createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-07-01T10:30:00Z' },
  { id: 3, title: '更早的对话', lastMessage: '旧消息', messageCount: 1, createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-20T10:30:00Z' },
]

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('ConversationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgentConversations.mockResolvedValue(mockConversations)
    mockDeleteAgentConversation.mockResolvedValue(true)
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
})
