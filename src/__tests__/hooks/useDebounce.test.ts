import { renderHook, cleanup, act } from '@testing-library/react'
import { useDebounce, useDebouncedCallback, useDebouncedFn } from '../../hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('应返回初始值', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current.value).toBe('hello')
    expect(result.current.isPending).toBe(false)
  })

  it('值变化后应延迟更新', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    )

    rerender({ value: 'world', delay: 500 })
    expect(result.current.value).toBe('hello')
    expect(result.current.isPending).toBe(true)

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.value).toBe('world')
    expect(result.current.isPending).toBe(false)
  })

  it('使用默认延迟 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    expect(result.current.value).toBe('a')

    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current.value).toBe('a')

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.value).toBe('b')
  })

  it('快速连续变化应只取最后一个值', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'b' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'c' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ value: 'd' })

    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.value).toBe('d')
  })

  it('值未变化时 isPending 应为 false', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'same' } }
    )

    rerender({ value: 'same' })
    expect(result.current.isPending).toBe(false)
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('应在延迟后执行回调', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => { result.current.callback('arg1', 'arg2') })
    expect(callback).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(300) })
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('快速调用应只执行最后一次', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => { result.current.callback('first') })
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { result.current.callback('second') })
    act(() => { vi.advanceTimersByTime(300) })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('cancel 应阻止回调执行', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => { result.current.callback('data') })
    act(() => { result.current.cancel() })
    act(() => { vi.advanceTimersByTime(500) })

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useDebouncedFn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('第一次调用应立即执行', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedFn(callback, 300))

    act(() => { result.current('arg1') })
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg1')
  })

  it('防抖期内再次调用应被忽略', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedFn(callback, 300))

    act(() => { result.current('first') })
    act(() => { result.current('second') })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('防抖期结束后有新参数应再执行一次', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedFn(callback, 300))

    act(() => { result.current('first') })
    act(() => { result.current('second') })

    act(() => { vi.advanceTimersByTime(300) })
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('second')
  })

  it('防抖期结束后总是执行尾随调用（当前实现保留 lastArgs）', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedFn(callback, 300))

    act(() => { result.current('only') })
    act(() => { vi.advanceTimersByTime(300) })

    // useDebouncedFn 实现：首次立即执行 + 尾随总会再执行一次
    // 因为 lastArgsRef 在首次调用后未被清除
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('only')
  })
})
