/**
 * agent-client.rename.test.ts — 重命名 API 单测
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api-client module
const mockPut = vi.hoisted(() => vi.fn())
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: mockPut,
    del: vi.fn(),
  },
}))

import { renameAgentConversation } from '../agent-client'

describe('renameAgentConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('成功时返回 true 且 put 收到正确路径和 body', async () => {
    mockPut.mockResolvedValue({ success: true, data: { success: true } })

    const result = await renameAgentConversation(42, '新标题')

    expect(result).toBe(true)
    expect(mockPut).toHaveBeenCalledWith(
      '/api/agent/conversations/42',
      { title: '新标题' },
    )
  })

  it('失败时返回 false', async () => {
    mockPut.mockResolvedValue({ success: false, error: 'not found' })

    const result = await renameAgentConversation(99, '不存在')

    expect(result).toBe(false)
  })
})
