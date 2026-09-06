/**
 * approval-resolve.test.tsx — MessageBubble 确认卡 resolve 对接测试
 *
 * 覆盖 handleApprovalResolve 从 console.info 换成真实回传后的行为（本任务对接点）：
 *  1. 点主按钮 → resolveAgentApproval 以 (conversationId, ApprovalResolution) 回传
 *  2. 回传失败 → 回滚本地已决态（按钮恢复可交互）+ 走既有 toast 错误提示
 *  3. 消息缺少 conversationId → 不发请求，同样回滚 + 提示
 *  4. 回传成功 → 保持已决态
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MessageBubble from '../MessageBubble'
import type { AgentMessage, ApprovalOption } from '@/types/agent'
import { resolveAgentApproval } from '@/services/agent-client'
import { useToastStore } from '@/store/toastStore'

// Mock framer-motion — 测试环境不需要真实动画
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock agent-client：只拦 resolveAgentApproval，验证回传参数（鉴权由 api-client 层负责，不在组件测试范围）
vi.mock('@/services/agent-client', () => ({
  resolveAgentApproval: vi.fn(),
}))

const mockedResolve = vi.mocked(resolveAgentApproval)

const options: ApprovalOption[] = [
  {
    key: 'confirm',
    label: '确认执行',
    short: '将 1 张发票标记为已收齐',
    signal: 3,
    signalLabel: '写操作 · 需确认',
    tone: 'success',
    primary: true,
  },
  {
    key: 'cancel',
    label: '取消',
    short: '本轮不执行任何修改',
    signal: 0,
  },
]

function renderApprovalMessage(conversationId?: number) {
  const msg = {
    clientId: 'msg_approval_resolve',
    role: 'assistant',
    content: '操作待确认',
    approval: {
      requestId: 'approval_9_1',
      title: '是否将这 1 张发票标记为已收齐？',
      body: 'INV-001',
      options,
    },
    ...(conversationId != null ? { conversationId } : {}),
  } as AgentMessage & { clientId?: string; conversationId?: number }
  return render(<MessageBubble message={msg} isUser={false} />)
}

beforeEach(() => {
  mockedResolve.mockReset()
  useToastStore.setState({ toasts: [] })
})

describe('MessageBubble 确认卡 resolve 对接', () => {
  it('点主按钮 → resolveAgentApproval 以 (conversationId, ApprovalResolution) 回传', async () => {
    mockedResolve.mockResolvedValue({ success: true, alreadyResolved: false })
    renderApprovalMessage(9)

    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() => {
      expect(mockedResolve).toHaveBeenCalledTimes(1)
    })
    expect(mockedResolve).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ requestId: 'approval_9_1', optionKey: 'confirm' }),
    )
  })

  it('回传失败 → 回滚本地已决态（按钮恢复）+ toast 错误提示', async () => {
    mockedResolve.mockResolvedValue({ success: false, error: '权限不足' })
    renderApprovalMessage(9)

    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))
    await waitFor(() => {
      // 已决态被回滚：主按钮恢复可交互
      expect(screen.getByRole('button', { name: '确认执行' })).toBeTruthy()
    })
    expect(screen.queryByText('已选择：确认执行')).toBeNull()
    // 既有错误提示通道（toast store）
    expect(useToastStore.getState().toasts.some((t) => t.message === '确认失败：权限不足')).toBe(true)
  })

  it('消息缺少 conversationId → 不发请求，回滚并提示', async () => {
    renderApprovalMessage(undefined)

    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('缺少会话信息'))).toBe(true)
    })
    expect(mockedResolve).not.toHaveBeenCalled()
    // 已决态回滚
    expect(screen.getByRole('button', { name: '确认执行' })).toBeTruthy()
    expect(screen.queryByText('已选择：确认执行')).toBeNull()
  })

  it('回传成功 → 保持已决态', async () => {
    mockedResolve.mockResolvedValue({ success: true, alreadyResolved: false })
    renderApprovalMessage(9)

    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() => {
      expect(screen.getByText('已选择：确认执行')).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: '确认执行' })).toBeNull()
  })
})
