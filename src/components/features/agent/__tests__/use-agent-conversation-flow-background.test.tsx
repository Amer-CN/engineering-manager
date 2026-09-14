/**
 * use-agent-conversation-flow-background.test.tsx — 会话切换不中断生成（后台续跑）测试
 *
 * mock sendAgentMessageStream 捕获回调与 signal（流 Promise 手动结算），驱动：
 *  (a) 切换会话不 abort：后台 onContent 继续累积进记录，切回时重挂半截回复；
 *  (b) handleConversationsDeleted 掐掉被删会话的后台流；
 *  (c) 卸载（离开页面）停止全部在途流；
 *  (d) 当前视图在途时重复发送被拒。
 */

import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefObject } from 'react'
import { useAgentConversationFlow } from '../useAgentConversationFlow'
import type { AgentStreamCallbacks } from '@/services/agent-client'
import type { AgentConversation } from '@/types/agent'

afterEach(cleanup)

// vi.hoisted：避免 vi.mock 工厂提升引发的「初始化前访问」错误
const { sendStream } = vi.hoisted(() => ({
  sendStream: vi.fn((_req: unknown, _cb: unknown, _signal?: AbortSignal) => Promise.resolve()),
}))

vi.mock('@/services/agent-client', () => ({
  sendAgentMessageStream: (req: unknown, cb: unknown, signal?: AbortSignal) => sendStream(req, cb, signal),
  sendAgentMessage: vi.fn(async () => ({ success: false, conversationId: 0, error: 'not used in tests' })),
  // 服务端历史：预置一条历史 user 消息（服务端在调 LLM 前即落库本轮 user 消息）
  getAgentConversationDetail: vi.fn(async (id: number) => ({
    id,
    messages: [{ role: 'user', content: `历史消息-${id}` }],
  })),
}))

function setup() {
  return renderHook(() =>
    useAgentConversationFlow({
      inputValue: '',
      setInputValue: vi.fn(),
      inputRef: { current: null } as RefObject<HTMLTextAreaElement>,
    }),
  )
}

function conv(id: number): AgentConversation {
  const now = new Date().toISOString()
  return { id, title: `会话${id}`, lastMessage: '', messageCount: 0, createdAt: now, updatedAt: now }
}

/** 手动结算的流 Promise 队列：在途流保持 pending，测试收尾时 resolve 让 finally 跑完 */
let resolvers: Array<() => void> = []

/** 发起发送（不 await 流结束），取回本轮回调与 abort signal */
function fireSend(result: ReturnType<typeof setup>['result']) {
  let sendPromise: Promise<void> | undefined
  act(() => {
    sendPromise = result.current.handleSend('你好')
  })
  expect(sendStream).toHaveBeenCalledTimes(1)
  const [req, cb, signal] = sendStream.mock.calls[sendStream.mock.calls.length - 1] as
    [unknown, AgentStreamCallbacks, AbortSignal]
  return { req, cb, signal, settle: () => act(async () => { resolvers.shift()?.(); await sendPromise }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  resolvers = []
  sendStream.mockImplementation(() => new Promise<void>((resolve) => { resolvers.push(resolve) }))
})

describe('useAgentConversationFlow · 后台续跑', () => {
  it('切换会话不 abort：后台继续累积，切回重挂半截回复，完成后落定', async () => {
    const { result } = setup()
    const { cb, signal, settle } = fireSend(result)

    // 新会话首轮：服务端分配会话 7，首段正文到达
    act(() => {
      cb.onConversationId?.(7)
      cb.onContent?.('段1')
    })
    expect(signal.aborted).toBe(false)
    expect(result.current.conversationId).toBe(7)

    // 切到会话 8：流不 abort，旧内容不写入新视图
    await act(async () => {
      await result.current.handleSelectConversation(conv(8))
    })
    expect(signal.aborted).toBe(false)
    expect(result.current.messages.every(m => (m.content ?? '').includes('段1'))).toBe(false)
    expect(result.current.loading).toBe(false)

    // 后台继续生成（不抛错，不污染当前视图）
    act(() => cb.onContent?.('段2'))

    // 切回会话 7：历史 + 半截回复占位重挂（历史里已有 user 消息，不得重复补）
    await act(async () => {
      await result.current.handleSelectConversation(conv(7))
    })
    expect(result.current.messages.length).toBe(2)
    const placeholder = result.current.messages[1]
    expect(placeholder).toMatchObject({ role: 'assistant', content: '段1段2', sending: true })
    expect(result.current.loading).toBe(true)

    // 完成信号：占位落定
    act(() => {
      cb.onDone?.({ conversationId: 7, toolCalls: [] })
    })
    expect(result.current.messages[1].sending).toBe(false)
    await settle()
    expect(result.current.loading).toBe(false)
  })

  it('handleConversationsDeleted 掐掉被删会话的后台流，当前视图不受影响', async () => {
    const { result } = setup()
    const { cb, signal, settle } = fireSend(result)

    act(() => cb.onConversationId?.(7))
    await act(async () => {
      await result.current.handleSelectConversation(conv(8))
    })

    // 会话 7 被删：它名下的后台流被掐
    act(() => {
      result.current.handleConversationsDeleted([7])
    })
    expect(signal.aborted).toBe(true)
    // 当前视图（会话 8）无在途流 → 复位
    expect(result.current.loading).toBe(false)
    await settle()
  })

  it('卸载（离开页面）停止全部在途流', async () => {
    const { result, unmount } = setup()
    const { signal, settle } = fireSend(result)

    unmount()
    expect(signal.aborted).toBe(true)
    await settle()
  })

  it('当前视图在途时重复发送被拒', async () => {
    const { result } = setup()
    const { settle } = fireSend(result)

    act(() => {
      void result.current.handleSend('第二条')
    })
    expect(sendStream).toHaveBeenCalledTimes(1)
    expect(result.current.messages.length).toBe(2) // 仍只有一条 user + 一条占位
    await settle()
  })
})
