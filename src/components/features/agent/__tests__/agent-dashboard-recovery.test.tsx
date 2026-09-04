/**
 * agent-dashboard-recovery.test.tsx — AgentDashboard 错误恢复接线测试（Beautiful UI 第二批）
 *
 * mock useAgentConversationFlow 与重子组件，聚焦验证：
 *  (a) 最后一条 assistant 消息以 ❌ 开头 → 消息流尾部渲染 RecoveryCard；
 *  (b) 「重试」→ handleResend(该 assistant clientId)；
 *  (c) 「编辑后重发」→ 该轮 user 消息内容回填输入框（Composer mock 展示 value）；
 *  (d) 「新开话题」→ handleNewConversation；
 *  (e) 正常回复不渲染卡片。
 */

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentDashboard from '../AgentDashboard'
import type { LocalMessage } from '../types'
import type { UseAgentConversationFlowResult } from '../useAgentConversationFlow'

afterEach(cleanup)

const mockFlow = vi.fn()
vi.mock('../useAgentConversationFlow', () => ({
  useAgentConversationFlow: (...args: unknown[]) => mockFlow(...args),
}))
vi.mock('../AgentComposer', () => ({
  default: ({ value }: { value: string }) => <div data-testid="composer">{value}</div>,
}))
vi.mock('../AgentOverlays', () => ({
  default: () => null,
  HistorySidebar: () => null,
}))
vi.mock('../AgentTopBar', () => ({ default: () => null }))
vi.mock('../Mascot', () => ({ default: () => null }))
vi.mock('../ModelPicker', () => ({ default: () => null }))
vi.mock('../ContextMeter', () => ({ default: () => null }))
vi.mock('../SuggestionChips', () => ({ default: () => null }))
vi.mock('../suggestions', () => ({ getFilteredSuggestions: () => [] }))
vi.mock('../useAgentPrefill', () => ({ useAgentPrefill: () => undefined }))
vi.mock('@/services/agent-client', () => ({
  getLlmProviderConfig: vi.fn(async () => null),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { displayName: '测试用户' } }),
}))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => false }),
}))
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

function makeFlow(messages: LocalMessage[], overrides: Partial<UseAgentConversationFlowResult> = {}) {
  return {
    messages,
    conversationId: 1,
    loading: false,
    refreshTrigger: 0,
    mascotState: 'idle',
    firstDone: true,
    contextTokens: null,
    inFlightTools: [],
    handleSend: vi.fn(),
    handleSelectConversation: vi.fn(),
    handleNewConversation: vi.fn(),
    handleResend: vi.fn(),
    handleSwitchVersion: vi.fn(),
    handleForkTo: vi.fn(),
    ...overrides,
  } as UseAgentConversationFlowResult
}

const errorRound: LocalMessage[] = [
  { clientId: 'u1', role: 'user', content: '帮我查发票' },
  { clientId: 'a1', role: 'assistant', content: '' },
  { clientId: 'u2', role: 'user', content: '那项目呢' },
  { clientId: 'a2', role: 'assistant', content: '❌ 出错了：模型响应超时' },
]

beforeEach(() => {
  mockFlow.mockReset()
})

describe('AgentDashboard 错误恢复接线', () => {
  it('最后一条 assistant ❌ 消息 → 尾部渲染 RecoveryCard（标题 + 去前缀错误正文）', () => {
    mockFlow.mockReturnValue(makeFlow(errorRound))
    render(<AgentDashboard />)
    expect(screen.getByText('刚才的回复出错了')).toBeTruthy()
    expect(screen.getByText('出错了：模型响应超时')).toBeTruthy()
    expect(screen.getByText('请求失败')).toBeTruthy()
  })

  it('「重试」→ handleResend(出错的 assistant clientId)', () => {
    const handleResend = vi.fn()
    mockFlow.mockReturnValue(makeFlow(errorRound, { handleResend }))
    render(<AgentDashboard />)
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(handleResend).toHaveBeenCalledWith('a2')
  })

  it('「编辑后重发」→ 该轮 user 消息内容回填输入框', () => {
    mockFlow.mockReturnValue(makeFlow(errorRound))
    render(<AgentDashboard />)
    fireEvent.click(screen.getByRole('button', { name: '其他恢复方式' }))
    fireEvent.click(screen.getByText('编辑后重发'))
    expect(screen.getByTestId('composer').textContent).toBe('那项目呢')
  })

  it('「新开话题」→ handleNewConversation', () => {
    const handleNewConversation = vi.fn()
    mockFlow.mockReturnValue(makeFlow(errorRound, { handleNewConversation }))
    render(<AgentDashboard />)
    fireEvent.click(screen.getByRole('button', { name: '其他恢复方式' }))
    fireEvent.click(screen.getByText('新开话题'))
    expect(handleNewConversation).toHaveBeenCalledTimes(1)
  })

  it('正常回复（无 ❌ 前缀）→ 不渲染 RecoveryCard', () => {
    mockFlow.mockReturnValue(
      makeFlow([
        { clientId: 'u1', role: 'user', content: 'hi' },
        { clientId: 'a1', role: 'assistant', content: '正常回复内容' },
      ]),
    )
    render(<AgentDashboard />)
    expect(screen.queryByText('刚才的回复出错了')).toBeNull()
    expect(screen.getByText('正常回复内容')).toBeTruthy()
  })
})
