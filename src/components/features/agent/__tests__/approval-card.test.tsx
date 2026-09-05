/**
 * approval-card.test.tsx — 行动确认卡（ApprovalCard）与 MessageBubble 挂点测试
 *
 * 覆盖：渲染（标题/正文/主按钮/信号表、body 空不渲染正文块）、
 * 交互（主按钮/其他选项抽屉 0fr↔1fr/抽屉内点选）、已决态（按钮不可再触发 + 已选择文案）、
 * 图标零问号（真实 iconMap 下卡片内不出现孤立 `?`）、MessageBubble approval 挂点。
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ApprovalCard from '../ApprovalCard'
import MessageBubble from '../MessageBubble'
import type { AgentMessage, ApprovalOption } from '@/types/agent'

// Mock framer-motion — 测试环境不需要真实动画
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// 注意：Icon 不 mock —— 「图标零问号」用例需要真实 iconMap（未注册图标会降级渲染 `?`）

const options: ApprovalOption[] = [
  {
    key: 'confirm',
    label: '确认执行',
    short: '将 3 张发票标记为已收齐',
    signal: 3,
    signalLabel: '高置信',
    tone: 'success',
    primary: true,
  },
  {
    key: 'alternate',
    label: '换种方式',
    short: '改为生成催款函草稿',
    signal: 1,
    signalLabel: '需复核',
    tone: 'warning',
  },
]

const baseProps = {
  requestId: 'req_1',
  title: '是否将这 3 张发票标记为已收齐？',
  options,
  onResolve: vi.fn(),
}

describe('ApprovalCard 渲染', () => {
  it('渲染标题/正文/主按钮/信号表', () => {
    const onResolve = vi.fn()
    render(
      <ApprovalCard
        {...baseProps}
        onResolve={onResolve}
        body={<span>涉及发票 INV-001、INV-002</span>}
      />
    )

    expect(screen.getByText('是否将这 3 张发票标记为已收齐？')).toBeTruthy()
    expect(screen.getByText('涉及发票 INV-001、INV-002')).toBeTruthy()
    expect(screen.getByRole('button', { name: '确认执行' })).toBeTruthy()
    // 主选项置信度 3/3 的 3 格竖条 meter
    expect(screen.getByRole('img', { name: '置信度 3/3' })).toBeTruthy()
    expect(screen.getByText('高置信')).toBeTruthy()
  })

  it('body 为空时正文块不渲染', () => {
    const { rerender } = render(
      <ApprovalCard {...baseProps} body={<span>详情正文</span>} />
    )
    expect(screen.getByText('详情正文')).toBeTruthy()

    rerender(<ApprovalCard {...baseProps} body={''} />)
    expect(screen.queryByText('详情正文')).toBeNull()
  })
})

describe('ApprovalCard 交互', () => {
  it('点主按钮 → onResolve 收到 (requestId, 主选项)', () => {
    const onResolve = vi.fn()
    render(<ApprovalCard {...baseProps} onResolve={onResolve} />)

    fireEvent.click(screen.getByRole('button', { name: '确认执行' }))
    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(onResolve).toHaveBeenCalledWith('req_1', options[0])
  })

  it('多选项：抽屉默认收起（grid-template-rows 0fr）→ 点「其他选项」展开（1fr）→ 点抽屉内选项 resolve', () => {
    const onResolve = vi.fn()
    const { container } = render(<ApprovalCard {...baseProps} onResolve={onResolve} />)

    // 抽屉容器是卡内唯一 .grid 元素
    const drawer = container.querySelector('.grid') as HTMLElement
    expect(drawer).toBeTruthy()
    expect(drawer.style.gridTemplateRows).toBe('0fr')

    fireEvent.click(screen.getByRole('button', { name: '其他选项' }))
    expect(drawer.style.gridTemplateRows).toBe('1fr')

    fireEvent.click(screen.getByRole('button', { name: /改为生成催款函草稿/ }))
    expect(onResolve).toHaveBeenCalledWith('req_1', options[1])
  })
})

describe('ApprovalCard 已决态', () => {
  it('resolved 传入时按钮不可再触发，显示「已选择：{label}」', () => {
    const onResolve = vi.fn()
    const { container } = render(
      <ApprovalCard
        {...baseProps}
        onResolve={onResolve}
        resolved={{ option: options[0], at: '2026-09-05T10:00:00.000Z' }}
      />
    )

    expect(screen.getByText('已选择：确认执行')).toBeTruthy()
    // 主按钮与其他选项切换均不渲染 → 无法再触发
    expect(screen.queryByRole('button', { name: '确认执行' })).toBeNull()
    expect(screen.queryByRole('button', { name: '其他选项' })).toBeNull()
    expect(onResolve).not.toHaveBeenCalled()
    // 已决态抽屉整体不渲染
    expect(container.querySelector('.grid')).toBeNull()
  })
})

describe('ApprovalCard 图标零问号', () => {
  it('真实 iconMap 下卡片内不出现孤立 `?`（Icon 降级文本）', () => {
    const { container } = render(
      <ApprovalCard {...baseProps} body={<span>详情正文</span>} />
    )

    expect(screen.queryByText('?')).toBeNull()
    expect(container.textContent).not.toContain('?')
  })
})

describe('MessageBubble 挂点', () => {
  it('带 approval 的 assistant 消息渲染出确认卡', () => {
    const msg: AgentMessage & { clientId?: string; sending?: boolean } = {
      clientId: 'test_approval_1',
      role: 'assistant',
      content: '我准备执行以下操作：',
      approval: {
        requestId: 'req_9',
        title: '是否将这 3 张发票标记为已收齐？',
        body: '涉及 INV-001、INV-002',
        options,
      },
    }

    render(<MessageBubble message={msg} isUser={false} />)

    expect(screen.getByText('是否将这 3 张发票标记为已收齐？')).toBeTruthy()
    expect(screen.getByRole('button', { name: '确认执行' })).toBeTruthy()
  })
})
