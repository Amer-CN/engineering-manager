import { renderHook, act, cleanup } from '@testing-library/react'

afterEach(cleanup)

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('初始状态 toast 应为 null', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('showToast 应设置 toast 信息', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('操作成功', 'success')
    })

    expect(result.current.toast).toEqual({ message: '操作成功', type: 'success' })
  })

  it('showToast 默认类型应为 info', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('提示信息')
    })

    expect(result.current.toast).toEqual({ message: '提示信息', type: 'info' })
  })

  it('showToast 应支持 error 类型', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('操作失败', 'error')
    })

    expect(result.current.toast).toEqual({ message: '操作失败', type: 'error' })
  })

  it('默认 3000ms 后 toast 应自动消失', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('即将消失')
    })

    expect(result.current.toast).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.toast).toBeNull()
  })

  it('自定义 duration 应在指定时间后消失', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast(5000))

    act(() => {
      result.current.showToast('5秒后消失')
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.toast).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.toast).toBeNull()
  })

  it('连续调用 showToast 应替换为最新消息', async () => {
    const { useToast } = await import('../../hooks/useToast')
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('第一条')
    })

    act(() => {
      result.current.showToast('第二条', 'error')
    })

    expect(result.current.toast).toEqual({ message: '第二条', type: 'error' })
  })
})
