/**
 * at-source-menu.test.tsx — AgentComposer 的 @ 数据来源菜单测试（Beautiful UI 第二批）
 *
 *  (a) 输入 @ → 菜单弹出（全部数据域条目）；
 *  (b) 词头过滤：@发 → 只剩「发票」；
 *  (c) 键盘：↑↓ 移动高亮（aria-selected）、Enter 选中并插入「@key 」、Esc 关闭；
 *  (d) 鼠标点击条目插入；
 *  (e) detectAtToken / insertAtSource 纯函数边界。
 */

import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import AgentComposer from '../AgentComposer'
import { detectAtToken, insertAtSource } from '../AtSourceMenu'

afterEach(cleanup)

// stt-client：不可用（听写按钮隐藏，不干扰本测试）
vi.mock('@/services/stt-client', () => ({
  getSttStatus: vi.fn(async () => ({ success: false, error: 'unavailable' })),
  uploadSttAudio: vi.fn(),
  createSttJob: vi.fn(),
  getSttJob: vi.fn(),
  getSttJobs: vi.fn(),
  ingestSttJob: vi.fn(),
  cancelSttJob: vi.fn(),
  retrySttJob: vi.fn(),
  deleteSttJob: vi.fn(),
}))
// agent-client：Composer 顶层 import recognizeReceiptText
vi.mock('@/services/agent-client', () => ({
  recognizeReceiptText: vi.fn(),
}))
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

/** 受控草稿 Harness：真实 setState 驱动 value，并记录每次 onChange 结果 */
function Harness({ onDraft }: { onDraft: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <AgentComposer
      value={value}
      onChange={(v) => {
        onDraft(v)
        setValue(v)
      }}
      onSend={vi.fn()}
    />
  )
}

function setup() {
  const drafts: string[] = []
  const utils = render(<Harness onDraft={(v) => drafts.push(v)} />)
  const textarea = utils.getByRole('textbox') as HTMLTextAreaElement
  const type = (text: string) => fireEvent.change(textarea, { target: { value: text } })
  return { ...utils, textarea, drafts, type }
}

describe('@ 数据来源菜单（AgentComposer 集成）', () => {
  it('输入 @ → 菜单弹出，展示全部数据域条目', () => {
    const { type } = setup()
    type('@')
    expect(screen.getByText('数据来源')).toBeTruthy()
    expect(screen.getByText('@发票')).toBeTruthy()
    expect(screen.getByText('@项目')).toBeTruthy()
    expect(screen.getByText('@结算')).toBeTruthy()
    expect(screen.getByText('@成本台账')).toBeTruthy()
    expect(screen.getByText('@人员')).toBeTruthy()
    expect(screen.getByText('@合同')).toBeTruthy()
    expect(screen.getByText('@知识库')).toBeTruthy()
  })

  it('词头过滤：@发 → 只剩「发票」条目', () => {
    const { type } = setup()
    type('@发')
    expect(screen.getByText('@发票')).toBeTruthy()
    expect(screen.queryByText('@项目')).toBeNull()
    expect(screen.queryByText('@结算')).toBeNull()
  })

  it('Enter 选中当前高亮条目 → 插入「@key 」', () => {
    const { type, textarea, drafts } = setup()
    type('@')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(drafts[drafts.length - 1]).toBe('@发票 ')
  })

  it('↓ 移动高亮后 Enter → 选中新条目（aria-selected 跟随）', () => {
    const { type, textarea, drafts } = setup()
    type('@')
    const options = screen.getAllByRole('option')
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(textarea, { key: 'ArrowDown' })
    expect(options[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(drafts[drafts.length - 1]).toBe('@项目 ')
  })

  it('↑ 循环到末尾条目', () => {
    const { type, textarea, drafts } = setup()
    type('@')
    fireEvent.keyDown(textarea, { key: 'ArrowUp' })
    const options = screen.getAllByRole('option')
    expect(options[options.length - 1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(drafts[drafts.length - 1]).toBe('@知识库 ')
  })

  it('Esc 关闭菜单；词头继续变化时重新打开', () => {
    const { type, textarea } = setup()
    type('@')
    expect(screen.getByText('数据来源')).toBeTruthy()
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(screen.queryByText('数据来源')).toBeNull()
    // 词头变化 → 解除屏蔽重新弹出
    type('@项')
    expect(screen.getByText('数据来源')).toBeTruthy()
  })

  it('鼠标点击条目 → 插入「@key 」并关闭菜单', () => {
    const { type, drafts } = setup()
    type('@成本')
    fireEvent.click(screen.getByText('@成本台账'))
    expect(drafts[drafts.length - 1]).toBe('@成本台账 ')
    expect(screen.queryByText('数据来源')).toBeNull()
  })

  it('无 @ 词头时菜单不弹出（普通文本 / 斜杠命令不受影响）', () => {
    const { type } = setup()
    type('帮我查一下发票')
    expect(screen.queryByText('数据来源')).toBeNull()
    type('/')
    expect(screen.queryByText('数据来源')).toBeNull()
    expect(screen.getByText('快捷命令')).toBeTruthy()
  })
})

describe('detectAtToken / insertAtSource 纯函数', () => {
  it('检测：@ 在行首 / 空白后命中；句中 @ 与无 @ 不命中', () => {
    expect(detectAtToken('@')).toEqual({ query: '', tokenStart: 0 })
    expect(detectAtToken('查 @发')).toEqual({ query: '发', tokenStart: 2 })
    expect(detectAtToken('邮箱a@b.com')).toBeNull() // 句中 @ 不触发
    expect(detectAtToken('普通文本')).toBeNull()
    expect(detectAtToken('@查 一下')).toBeNull() // @ 后有空格断开 → 不在词尾，不触发
  })

  it('插入：@token 替换为「@key 」', () => {
    expect(insertAtSource('帮我 @发', 3, '发票')).toBe('帮我 @发票 ')
    expect(insertAtSource('@', 0, '项目')).toBe('@项目 ')
  })
})
