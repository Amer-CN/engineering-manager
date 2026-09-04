/**
 * recovery-card.test.tsx — 错误恢复卡片测试（Beautiful UI 第二批）
 *
 *  (a) 渲染：标题 / 错误正文（去掉 ❌ 前缀）/「请求失败」信号标签；
 *  (b) 三动作：重试 / 编辑后重发（抽屉内）/ 新开话题（抽屉内）；
 *  (c) findRecoveryContext 触发判定：最后一条 assistant ❌ 消息 + 对应轮次 user 问题。
 */

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RecoveryCard, { findRecoveryContext } from '../RecoveryCard'
import type { LocalMessage } from '../types'

afterEach(cleanup)

describe('RecoveryCard', () => {
  it('渲染标题、错误正文与「请求失败」信号标签', () => {
    render(<RecoveryCard errorText="出错了：网络超时" onRetry={vi.fn()} onEdit={vi.fn()} onNewTopic={vi.fn()} />)
    expect(screen.getByText('刚才的回复出错了')).toBeTruthy()
    expect(screen.getByText('出错了：网络超时')).toBeTruthy()
    expect(screen.getByText('请求失败')).toBeTruthy()
  })

  it('「其他恢复方式」展开抽屉（aria-expanded 翻转 + 网格行 0fr→1fr），显示两个恢复动作', () => {
    render(<RecoveryCard errorText="x" onRetry={vi.fn()} onEdit={vi.fn()} onNewTopic={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: '其他恢复方式' })
    // 抽屉默认收起（网格行 0fr；内容在 DOM 但视觉隐藏）
    const drawer = screen.getByText('编辑后重发').closest('div.grid') as HTMLElement
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(drawer.style.gridTemplateRows).toBe('0fr')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(drawer.style.gridTemplateRows).toBe('1fr')
    expect(screen.getByText('编辑后重发')).toBeTruthy()
    expect(screen.getByText('新开话题')).toBeTruthy()
  })

  it('三动作回调：重试直接触发；编辑/新话题在抽屉内触发', () => {
    const onRetry = vi.fn()
    const onEdit = vi.fn()
    const onNewTopic = vi.fn()
    render(<RecoveryCard errorText="x" onRetry={onRetry} onEdit={onEdit} onNewTopic={onNewTopic} />)

    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '其他恢复方式' }))
    fireEvent.click(screen.getByText('编辑后重发'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('新开话题'))
    expect(onNewTopic).toHaveBeenCalledTimes(1)
  })
})

describe('findRecoveryContext', () => {
  it('最后一条 assistant ❌ 消息 → 返回上下文（errorText 去 ❌ 前缀、userContent 为该轮问题）', () => {
    const messages: LocalMessage[] = [
      { clientId: 'u1', role: 'user', content: '帮我查发票' },
      { clientId: 'a1', role: 'assistant', content: '' },
      { clientId: 'u2', role: 'user', content: '那项目呢' },
      { clientId: 'a2', role: 'assistant', content: '❌ 出错了：模型超时' },
    ]
    const ctx = findRecoveryContext(messages)
    expect(ctx).not.toBeNull()
    expect(ctx!.assistantClientId).toBe('a2')
    expect(ctx!.userContent).toBe('那项目呢')
    expect(ctx!.errorText).toBe('出错了：模型超时')
  })

  it('非 ❌ 正文 → null', () => {
    const messages: LocalMessage[] = [
      { clientId: 'u1', role: 'user', content: 'hi' },
      { clientId: 'a1', role: 'assistant', content: '正常回复' },
    ]
    expect(findRecoveryContext(messages)).toBeNull()
  })

  it('仍在 sending（流式未收尾）→ null', () => {
    const messages: LocalMessage[] = [
      { clientId: 'u1', role: 'user', content: 'hi' },
      { clientId: 'a1', role: 'assistant', content: '❌ 出错了', sending: true },
    ]
    expect(findRecoveryContext(messages)).toBeNull()
  })

  it('最后一条是 user 消息 → null', () => {
    const messages: LocalMessage[] = [{ clientId: 'u1', role: 'user', content: '❌ 看起来像错误' }]
    expect(findRecoveryContext(messages)).toBeNull()
  })
})
