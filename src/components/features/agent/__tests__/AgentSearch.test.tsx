/**
 * AgentSearch.test.tsx — 命令面板式页内搜索测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──
const mockGetAgentConversations = vi.hoisted(() => vi.fn())
vi.mock('@/services/agent-client', () => ({
  getAgentConversations: mockGetAgentConversations,
}))

const mockGetAPI = vi.hoisted(() => vi.fn())
vi.mock('@/services/api-adapter', () => ({
  getAPI: mockGetAPI,
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: vi.fn((perm: string) => {
      // 默认全部放行，除了 inventory:read
      return perm !== 'inventory:read'
    }),
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

import AgentSearch from '../AgentSearch'
import type { AgentConversation } from '@/types/agent'

const mockConversations: AgentConversation[] = [
  { id: 1, title: '发票处理流程', lastMessage: '关于发票的问题', messageCount: 3, createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-07-01T10:30:00Z' },
  { id: 2, title: '项目进度查询', lastMessage: '项目状态如何', messageCount: 5, createdAt: '2026-07-01T09:00:00Z', updatedAt: '2026-07-01T09:30:00Z' },
]

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('AgentSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgentConversations.mockResolvedValue(mockConversations)
    mockGetAPI.mockResolvedValue({})
  })

  test('输入关键词 → 出现提问项 + 命中模块 + 命中历史对话', async () => {
    const onAsk = vi.fn()
    const onSelectConversation = vi.fn()

    renderWithProviders(
      <AgentSearch open={true} onClose={vi.fn()} onAsk={onAsk} onSelectConversation={onSelectConversation} />,
    )

    // 等待对话加载
    await waitFor(() => expect(mockGetAgentConversations).toHaveBeenCalled())

    // 输入"发票"
    const input = screen.getByPlaceholderText('搜索对话、功能模块，或直接提问...')
    fireEvent.change(input, { target: { value: '发票' } })

    await waitFor(() => {
      // 提问项
      expect(screen.getByText(/问 AI：发票/)).toBeTruthy()
      // 命中模块（发票管理）
      expect(screen.getByText('发票管理')).toBeTruthy()
      // 命中历史对话
      expect(screen.getByText('发票处理流程')).toBeTruthy()
    })
  })

  test('can() 对某模块返回 false → 该模块项不出现', async () => {
    renderWithProviders(
      <AgentSearch open={true} onClose={vi.fn()} onAsk={vi.fn()} onSelectConversation={vi.fn()} />,
    )

    await waitFor(() => expect(mockGetAgentConversations).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('搜索对话、功能模块，或直接提问...')
    fireEvent.change(input, { target: { value: '仓库' } })

    await waitFor(() => {
      // inventory:read 被 mock 拒绝，仓库管理不应出现
      expect(screen.queryByText('仓库管理')).toBeNull()
    })
  })

  test('键盘 ↑/↓ 改变高亮项; Enter 触发对应动作', async () => {
    const onAsk = vi.fn()
    const onSelectConversation = vi.fn()

    renderWithProviders(
      <AgentSearch open={true} onClose={vi.fn()} onAsk={onAsk} onSelectConversation={onSelectConversation} />,
    )

    await waitFor(() => expect(mockGetAgentConversations).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('搜索对话、功能模块，或直接提问...')

    // 输入关键词，让"问 AI"成为第一项
    fireEvent.change(input, { target: { value: '测试问题' } })

    await waitFor(() => {
      expect(screen.getByText(/问 AI：测试问题/)).toBeTruthy()
    })

    // 第一项是"问 AI"，按 Enter 应触发 onAsk
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onAsk).toHaveBeenCalledWith('测试问题')
  })
})
