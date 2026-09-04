/**
 * selection-ai-bar.test.tsx — 选中文字 AI 操作条测试（Beautiful UI B1）
 *
 * 策略：mock selection API（stub window.getSelection + 派发 mouseup/selectionchange），
 * 走真实 useTextSelection hook + MarkdownRenderer 挂载链路；mock writing-client（不打真接口）
 * 与 toastStore。覆盖：浮条出现；改进→writingAssist(polish) + prefill 追加通道
 * （CustomEvent('agent:prefill') 携 { text, append: true }，不写 sessionStorage）；
 * 解释→直接写「请解释：…」且不调接口；403/权限失败 → toast + 接口类按钮置灰（解释不禁用）；
 * 其他失败 → toast 后端文案、不置灰；滚动 → 浮条隐藏、mouseup 恢复；mousedown 在输入框上
 * 不禁默认（jsdom 不模拟 mousedown 聚焦，聚焦被吞的直接原因是 preventDefault，此处断言其
 * 未被调用）、浮条其他位置禁默认（保选区）；关闭→清选区且浮条隐藏。
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

  it('点击「改进」→ writingAssist(polish)，prefill 通道收到 { text, append: true }（不写 sessionStorage）', async () => {
    assistMock.mockResolvedValue({ success: true, data: { text: '改写后的更通顺文本' } })
    const { container } = mountAndSelect(LONG_TEXT)

    const details: unknown[] = []
    const listener = (e: Event) => details.push((e as CustomEvent).detail)
    window.addEventListener('agent:prefill', listener)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    window.removeEventListener('agent:prefill', listener)

    expect(assistMock).toHaveBeenCalledWith({ instruction: 'polish', selectedText: LONG_TEXT })
    expect(details).toEqual([{ text: '改写后的更通顺文本', append: true }])
    // 追加模式走事件对象 detail，sessionStorage 不落值（避免重挂载时旧文覆盖草稿）
    expect(sessionStorage.getItem('agent:prefill')).toBeNull()
    // 浮条内联变化 → 已复制到输入框
    expect(screen.getByText('已复制到输入框')).toBeTruthy()
    expect(container.querySelector('div.fixed')).toBeTruthy()
  })

  it('点击「解释」→ 不调接口，prefill 通道收到「请解释：{原文}」（append: true）', async () => {
    mountAndSelect(LONG_TEXT)
    const details: unknown[] = []
    const listener = (e: Event) => details.push((e as CustomEvent).detail)
    window.addEventListener('agent:prefill', listener)
    fireEvent.click(screen.getByRole('button', { name: '解释' }))
    await act(async () => {})
    window.removeEventListener('agent:prefill', listener)
    expect(assistMock).not.toHaveBeenCalled()
    expect(details).toEqual([{ text: `请解释：${LONG_TEXT}`, append: true }])
    expect(screen.getByText('已复制到输入框')).toBeTruthy()
  })

  it('自定义输入 + 发送 → writingAssist(custom + customInstruction)', async () => {
    assistMock.mockResolvedValue({ success: true, data: { text: '更正式的版本' } })
    mountAndSelect(LONG_TEXT)
    const details: unknown[] = []
    const listener = (e: Event) => details.push((e as CustomEvent).detail)
    window.addEventListener('agent:prefill', listener)
    const input = screen.getByLabelText('自定义效果描述') as HTMLInputElement
    fireEvent.change(input, { target: { value: '更正式一点' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await act(async () => {})
    window.removeEventListener('agent:prefill', listener)
    expect(assistMock).toHaveBeenCalledWith({
      instruction: 'custom',
      selectedText: LONG_TEXT,
      customInstruction: '更正式一点',
    })
    expect(details).toEqual([{ text: '更正式的版本', append: true }])
  })

  it('权限失败（403/无权限）→ toast「当前账号无此权限」+ 接口按钮置灰，解释按钮仍可用', async () => {
    assistMock.mockResolvedValue({ success: false, error: '无权限：需要 writing:create' })
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('当前账号无此权限', 'error')
    expect((screen.getByRole('button', { name: '解释' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: '改进' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '缩短' }) as HTMLButtonElement).disabled).toBe(true)
    // 浮条仍在
    expect(screen.getByRole('button', { name: '关闭' })).toBeTruthy()
  })

  it('权限失败（forbidden 兜底文案）→ 同样进 denied', async () => {
    assistMock.mockResolvedValue({ success: false, error: 'forbidden' })
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('当前账号无此权限', 'error')
    expect((screen.getByRole('button', { name: '改进' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('其他失败（success:false + 后端文案）→ toast 显示后端 error，不置灰', async () => {
    assistMock.mockResolvedValue({ success: false, error: 'AI 改写失败' })
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '改进' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('AI 改写失败', 'error')
    expect((screen.getByRole('button', { name: '解释' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: '改进' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: '缩短' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('其他失败（success:false 无文案）→ toast「AI 处理失败」，不置灰', async () => {
    assistMock.mockResolvedValue({ success: false })
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '缩短' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('AI 处理失败', 'error')
    expect((screen.getByRole('button', { name: '缩短' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('writingAssist 抛异常（网络层）→ toast「AI 处理失败」，不进 denied', async () => {
    assistMock.mockRejectedValue(new Error('网络断开'))
    mountAndSelect(LONG_TEXT)
    fireEvent.click(screen.getByRole('button', { name: '缩短' }))
    await act(async () => {})
    expect(showToastMock).toHaveBeenCalledWith('AI 处理失败', 'error')
    expect((screen.getByRole('button', { name: '缩短' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('滚动 → 浮条隐藏（opacity 0 + pointer-events none）；mouseup 再触发 → 恢复显示', () => {
    const { container } = mountAndSelect(LONG_TEXT)
    const bar = container.querySelector('div.fixed') as HTMLElement
    expect(bar.style.opacity).toBe('1')

    act(() => { window.dispatchEvent(new Event('scroll')) })
    expect(bar.style.opacity).toBe('0')
    expect(bar.style.pointerEvents).toBe('none')

    act(() => { document.dispatchEvent(new Event('mouseup')) })
    expect(bar.style.opacity).toBe('1')
    expect(bar.style.pointerEvents).toBe('')
  })

  it('mousedown：输入框上不禁默认（可聚焦），浮条其他位置禁默认（保选区）', () => {
    const { container } = mountAndSelect(LONG_TEXT)
    const bar = container.querySelector('div.fixed') as HTMLElement
    const input = screen.getByLabelText('自定义效果描述')

    // 输入框：preventDefault 不被调用（真实浏览器中 mousedown 默认行为即聚焦）
    const evtOnInput = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    const spyInput = vi.spyOn(evtOnInput, 'preventDefault')
    act(() => { input.dispatchEvent(evtOnInput) })
    expect(spyInput).not.toHaveBeenCalled()

    // 浮条其余位置：照旧禁默认（保文字选区）
    const evtOnBar = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    const spyBar = vi.spyOn(evtOnBar, 'preventDefault')
    act(() => { bar.dispatchEvent(evtOnBar) })
    expect(spyBar).toHaveBeenCalledTimes(1)
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
