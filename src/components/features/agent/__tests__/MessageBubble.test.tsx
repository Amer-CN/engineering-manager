/**
 * MessageBubble.test.tsx — 气泡组件视觉 bug 回归测试
 *
 * 覆盖两个场景：
 *  (a) 空的「发送中」助手占位不渲染（防与「思考中」重叠）
 *  (b) 已完成但无内容 → 渲染兜底文案（防空气泡）
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MessageBubble from '../MessageBubble'
import type { LocalMessage } from '../types'

// Mock framer-motion — 测试环境不需要真实动画
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock Icon — 渲染一个占位 span
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

// Mock MessageActions — 不需要测操作条
vi.mock('../MessageActions', () => ({
  default: () => null,
}))

describe('MessageBubble', () => {
  it('空的「发送中」助手占位 → 不渲染（返回 null）', () => {
    const msg: LocalMessage = {
      clientId: 'test_1',
      role: 'assistant',
      content: '',
      sending: true,
    }

    const { container } = render(
      <MessageBubble message={msg} isUser={false} />,
    )

    // 不应该渲染任何头像或气泡
    expect(container.innerHTML).toBe('')
  })

  it('已完成但无内容且无 toolCalls → 渲染兜底文案', () => {
    const msg: LocalMessage = {
      clientId: 'test_2',
      role: 'assistant',
      content: '',
      sending: false,
    }

    render(<MessageBubble message={msg} isUser={false} />)

    expect(screen.getByText('本次没有返回内容，请重试或换个问法。')).toBeTruthy()
  })

  it('有正文的助手消息 → 正常渲染内容，不显示兜底文案', () => {
    const msg: LocalMessage = {
      clientId: 'test_3',
      role: 'assistant',
      content: '你好，我是助手',
      sending: false,
    }

    render(<MessageBubble message={msg} isUser={false} />)

    expect(screen.getByText('你好，我是助手')).toBeTruthy()
    expect(screen.queryByText('本次没有返回内容，请重试或换个问法。')).toBeNull()
  })

  it('发送中但有正文（流式已开始）→ 渲染内容，不返回 null', () => {
    const msg: LocalMessage = {
      clientId: 'test_4',
      role: 'assistant',
      content: '正在回复',
      sending: true,
    }

    render(<MessageBubble message={msg} isUser={false} />)

    expect(screen.getByText('正在回复')).toBeTruthy()
  })
})
