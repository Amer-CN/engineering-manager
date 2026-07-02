/**
 * agent-client.stream.test.ts — 流式聊天 SSE 解析单测
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendAgentMessageStream } from '../agent-client'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
}

describe('sendAgentMessageStream', () => {
  beforeEach(() => {
    localStorage.setItem('jwt_token', 'test-token')
  })

  it('分发 conversation_id / content / done 并累积文本', async () => {
    const body = sseStream([
      'data: {"type":"conversation_id","conversationId":42}\n\n',
      'data: {"type":"content","text":"你好"}\n\n',
      'data: {"type":"content","text":"，世界"}\n\n',
      'data: {"type":"done","conversationId":42,"toolCalls":[]}\n\n',
    ])
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body }) as any

    const onConversationId = vi.fn()
    const onDone = vi.fn()
    let acc = ''
    await sendAgentMessageStream(
      { message: 'hi' },
      { onConversationId, onContent: (t) => (acc += t), onDone },
    )

    expect(onConversationId).toHaveBeenCalledWith(42)
    expect(acc).toBe('你好，世界')
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 42 }),
    )
  })

  it('跨 chunk 半包的事件能被正确拼接解析', async () => {
    const body = sseStream([
      'data: {"type":"content","te', // 半包
      'xt":"拼接成功"}\n\n',
      'data: {"type":"done","conversationId":1}\n\n',
    ])
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body }) as any

    let acc = ''
    await sendAgentMessageStream({ message: 'hi' }, { onContent: (t) => (acc += t) })
    expect(acc).toBe('拼接成功')
  })

  it('响应非 ok 时抛错以便调用方回退', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, body: null }) as any
    await expect(sendAgentMessageStream({ message: 'hi' }, {})).rejects.toThrow()
  })
})
