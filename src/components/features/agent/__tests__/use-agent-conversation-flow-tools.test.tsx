/**
 * use-agent-conversation-flow-tools.test.tsx — flow 的 inFlightTools 状态翻转测试（Beautiful UI 第二批）
 *
 * mock sendAgentMessageStream 捕获回调，驱动：
 *  (a) onTool 入列（running，同轮同名多次调用 id 去重）；
 *  (b) onContent 到达 → 工具行保持 running（不再走「🔧 占位」清空）；
 *  (c) onDone 按 toolCalls.success 定终态（数量不齐时多余条目标 done）；
 *  (d) onError 全部标 failed；
 *  (e) 新建会话重置 inFlightTools。
 */

import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RefObject } from 'react'
import { useAgentConversationFlow } from '../useAgentConversationFlow'
import type { AgentStreamCallbacks } from '@/services/agent-client'

afterEach(cleanup)

// vi.hoisted：避免 vi.mock 工厂提升引发的「初始化前访问」错误
const { sendStream } = vi.hoisted(() => ({
  sendStream: vi.fn((_req: unknown, _cb: unknown, _signal?: AbortSignal) => Promise.resolve()),
}))

vi.mock('@/services/agent-client', () => ({
  sendAgentMessageStream: (req: unknown, cb: unknown, signal?: AbortSignal) => sendStream(req, cb, signal),
  sendAgentMessage: vi.fn(async () => ({ success: false, conversationId: 0, error: 'not used in tests' })),
  getAgentConversationDetail: vi.fn(async () => null),
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

/** 发送并取回流式回调（mock 流立即结束） */
async function send(result: ReturnType<typeof setup>['result']): Promise<AgentStreamCallbacks> {
  await act(async () => {
    await result.current.handleSend('你好')
  })
  expect(sendStream).toHaveBeenCalledTimes(1)
  return sendStream.mock.calls[0][1] as AgentStreamCallbacks
}

beforeEach(() => {
  vi.clearAllMocks()
  sendStream.mockImplementation(() => Promise.resolve())
})

describe('useAgentConversationFlow · inFlightTools', () => {
  it('onTool 入列：running 状态；同轮同名工具多次调用 id 唯一', async () => {
    const { result } = setup()
    const cb = await send(result)

    act(() => {
      cb.onTool?.('getProjects')
      cb.onTool?.('getProjects')
      cb.onTool?.('getInvoices')
    })
    expect(result.current.inFlightTools.length).toBe(3)
    expect(result.current.inFlightTools[0]).toMatchObject({ name: 'getProjects', status: 'running' })
    expect(new Set(result.current.inFlightTools.map((t) => t.id)).size).toBe(3)
  })

  it('首个 onContent 到达：工具行保持 running（状态化，不清理）', async () => {
    const { result } = setup()
    const cb = await send(result)

    act(() => cb.onTool?.('getProjects'))
    act(() => cb.onContent?.('第一段'))
    expect(result.current.inFlightTools).toEqual([
      expect.objectContaining({ name: 'getProjects', status: 'running' }),
    ])
    // 正文不再混入「🔧 正在查询」占位
    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.content).toBe('第一段')
  })

  it('onDone 按 toolCalls.success 定终态：success→done / !success→failed', async () => {
    const { result } = setup()
    const cb = await send(result)

    act(() => {
      cb.onTool?.('getProjects')
      cb.onTool?.('getInvoices')
    })
    act(() => {
      cb.onDone?.({
        conversationId: 1,
        message: '查询完成',
        toolCalls: [
          { toolName: 'getProjects', toolCallId: '1', success: true },
          { toolName: 'getInvoices', toolCallId: '2', success: false, error: 'boom' },
        ],
      })
    })
    expect(result.current.inFlightTools.map((t) => t.status)).toEqual(['done', 'failed'])
  })

  it('onDone：toolCalls 数量少于在途条目时按序消费，多余条目标 done', async () => {
    const { result } = setup()
    const cb = await send(result)

    act(() => {
      cb.onTool?.('getProjects')
      cb.onTool?.('getInvoices')
    })
    // 只有 1 个结果 → 第 1 条按 success 定态，第 2 条（多余）标 done
    act(() => {
      cb.onDone?.({
        conversationId: 1,
        message: '',
        toolCalls: [{ toolName: 'getProjects', toolCallId: '1', success: false }],
      })
    })
    expect(result.current.inFlightTools.map((t) => t.status)).toEqual(['failed', 'done'])
  })

  it('onError：全部标 failed', async () => {
    const { result } = setup()
    const cb = await send(result)

    act(() => {
      cb.onTool?.('getProjects')
      cb.onTool?.('runSafeQuery')
    })
    act(() => cb.onError?.('网络错误'))
    expect(result.current.inFlightTools.length).toBe(2)
    expect(result.current.inFlightTools.every((t) => t.status === 'failed')).toBe(true)
  })

  it('新建会话：inFlightTools 重置为空', async () => {
    const { result } = setup()
    const cb = await send(result)
    act(() => cb.onTool?.('getProjects'))
    expect(result.current.inFlightTools.length).toBe(1)

    act(() => result.current.handleNewConversation())
    expect(result.current.inFlightTools).toEqual([])
  })
})
