/**
 * selection-ai-bar.test.tsx — 选中文字 AI 操作条测试（Beautiful UI B1）
 *
 * 策略：mock selection API（stub window.getSelection + 派发 mouseup/selectionchange），
 * 走真实 useTextSelection hook + MarkdownRenderer 挂载链路；mock writing-client（不打真接口）
 * 与 toastStore。覆盖：浮条出现；改进→writingAssist(polish) + prefill 通道（sessionStorage
 * 'agent:prefill' + window 'agent:prefill' 事件）；解释→直接写「请解释：…」且不调接口；
 * 权限失败 toast + 按钮置灰；自定义输入→custom 指令；关闭→清选区且浮条隐藏。
 */

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MarkdownRenderer from '../MarkdownRenderer'
import { writingAssist } from '@/services/writing-client'

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }))

vi.mock('@/services/writing-client', () => ({
  writingAssist: vi.fn(),
}))
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: (s: { showToast: typeof showToastMock }) => unknown) =>
    selector({ showToast: showToastMock }),
}))

const assistMock = vi.mocked(writingAssist)

const LONG_TEXT = '这是一段用于测试选中行为的比较长的中文文本内容'
const SEL_SPAN_TEXT = '锚点'

/** 在 MarkdownRenderer 容器内伪造一个有效选区（锚点落在容器内的节点上）。
 *  range 对象只建一次并共享——getRangeAt 每次返回同一引用，锚点可外部注入。 */
const stubSelection = (text: string, collapsed = false) => {
  const range = {
    anchorNode: null as Node | null,
    focusNode: null as Node | null,
    getClientRects: () => [{ bottom: 120, top: 100, left: 10, right: 110, width: 100, height: 20 }],
    getBoundingClientRect: () => ({ bottom: 120, top: 100, left: 10, right: 110, width: 100, height: 20 }),
  }
  const sel = {
    isCollapsed: collapsed,
    rangeCount: collapsed ? 0 : 1,
    toString: () => text,
    removeAllRanges: vi.fn(),
    getRangeAt: () => range,
  }
  return { sel: sel as unknown as Selection, range }
}

/** 挂载带锚点节点的 MarkdownRenderer 并让选区生效 */
const mountAndSelect = (text: string) => {
  const utils = render(
    <MarkdownRenderer content={`${LONG_TEXT}。其中包含${SEL_SPAN_TEXT}节点。`} />,
  )
  // 容器内的 p 节点即选区锚点（container.contains 校验用）
  const p = utils.container.querySelector('p')
  const { sel, range } = stubSelection(text)
  range.anchorNode = p
  range.focusNode = p
  act(() => {
    vi.spyOn(window, 'getSelection').mockReturnValue(sel)
    document.dispatchEvent(new Event('mouseup'))
  })
  return { ...utils, sel }
}

beforeEach(() => {
  assistMock.mockReset()
  showToastMock.mockClear()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('选中文字 AI 操作条（B1）', () => {
  it('选中 >20 字符 → 浮条出现（解释/改进/缩短/自定义输入/发送/关闭）', () => {
    mountAndSelect(LONG_TEXT)
    expect(screen.getByRole('button', { name: '解释' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '改进' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '缩短' })).toBeTruthy()
    expect(screen.getByLabelText('自定义效果描述')).toBeTruthy()
    expect(screen.getByRole('button', { name: '发送' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '关闭' })).toBeTruthy()
  })

  it('点击「改进」→ writingAssist(polish)，成功后 prefill 通道收到文本', async () => {
    assistMock.mockResolvedValue({ success: true, data: { text: '改写后的更通顺文本' } })
    const { container } = mountAndSelect(LONG_TEXT)

    const events: Event[] = []
    const listener = (e: Event) => events.push(e)
    window.addEventListener('agent:prefill', listener)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    window.removeEventListener('agent:prefill', listener)

    expect(assistMock).toHaveBeenCalledWith({ instruction: 'polish', selectedText: LONG_TEXT })
    expect(sessionStorage.getItem('agent:prefill')).toBe('改写后的更通顺文本')
    expect(events.length).toBe(1)
    // 浮条内联变化 → 已复制到输入框
    expect(screen.getByText('已复制到输入框')).toBeTruthy()
    expect(container.querySelector('div.fixed')).toBeTruthy()
  })

  it('点击「解释」→ 不调接口，把「请解释：{原文}」写入 prefill', async () => {
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '解释' }))
    await act(async () => {})
    expect(assistMock).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('agent:prefill')).toBe(`请解释：${LONG_TEXT}`)
    expect(screen.getByText('已复制到输入框')).toBeTruthy()
  })

  it('自定义输入 + 发送 → writingAssist(custom + customInstruction)', async () => {
    assistMock.mockResolvedValue({ success: true, data: { text: '更正式的版本' } })
    mountAndSelect(LONG_TEXT)
    const input = screen.getByLabelText('自定义效果描述') as HTMLInputElement
    fireEvent.change(input, { target: { value: '更正式一点' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await act(async () => {})
    expect(assistMock).toHaveBeenCalledWith({
      instruction: 'custom',
      selectedText: LONG_TEXT,
      customInstruction: '更正式一点',
    })
    expect(sessionStorage.getItem('agent:prefill')).toBe('更正式的版本')
  })

  it('权限失败（success:false）→ toast「当前账号无此权限」且按钮置灰，浮条不隐藏', async () => {
    assistMock.mockResolvedValue({ success: false, error: 'forbidden' })
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('当前账号无此权限', 'error')
    expect((screen.getByRole('button', { name: '解释' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '改进' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '缩短' }) as HTMLButtonElement).disabled).toBe(true)
    // 浮条仍在
    expect(screen.getByRole('button', { name: '关闭' })).toBeTruthy()
  })

  it('writingAssist 抛异常 → toast「当前账号无此权限」', async () => {
    assistMock.mockRejectedValue(new Error('403'))
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '缩短' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('当前账号无此权限', 'error')
  })

  it('点击「关闭」→ 清除选区；选区塌陷后浮条隐藏', () => {
    const { sel } = mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect((sel as unknown as { removeAllRanges: () => void }).removeAllRanges).toHaveBeenCalled()
    // 选区塌陷 → selectionchange → 浮条隐藏
    act(() => {
      vi.spyOn(window, 'getSelection').mockReturnValue(
        stubSelection('', true).sel,
      )
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(screen.queryByRole('button', { name: '解释' })).toBeNull()
  })

  it('短选区（≤20 字符）→ 浮条不出现', () => {
    render(<MarkdownRenderer content={`${LONG_TEXT}。其中包含${SEL_SPAN_TEXT}节点。`} />)
    const p = screen.getByText(new RegExp(SEL_SPAN_TEXT)).closest('p')
    const { sel, range } = stubSelection('很短')
    range.anchorNode = p
    range.focusNode = p
    act(() => {
      vi.spyOn(window, 'getSelection').mockReturnValue(sel)
      document.dispatchEvent(new Event('mouseup'))
    })
    expect(screen.queryByRole('button', { name: '解释' })).toBeNull()
  })
})
