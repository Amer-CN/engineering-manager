import { renderHook, act, cleanup } from '@testing-library/react'
import { useAsync, useAsyncSimple } from '../../hooks/useAsync'

// mock handleError
vi.mock('../../types', () => ({
  handleError: (err: unknown) => ({
    getUserMessage: () => err instanceof Error ? err.message : '未知错误',
  }),
  Result: undefined,
}))

describe('useAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('初始状态应为未加载', () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true, data: 'result' })
    const { result } = renderHook(() => useAsync(asyncFn))

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('execute 成功应设置 data', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true, data: 'hello' })
    const { result } = renderHook(() => useAsync(asyncFn))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('hello')
    expect(result.current.error).toBeNull()
  })

  it('execute 失败应设置 error', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: false, error: 'Not found' })
    const { result } = renderHook(() => useAsync(asyncFn))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Not found')
    expect(result.current.data).toBeNull()
  })

  it('execute 抛异常应设置 error', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useAsync(asyncFn))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.loading).toBe(false)
  })

  it('reset 应清除所有状态', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true, data: 'result' })
    const { result } = renderHook(() => useAsync(asyncFn))

    await act(async () => { await result.current.execute() })
    expect(result.current.data).toBe('result')

    act(() => { result.current.reset() })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('应传递参数给异步函数', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true, data: 'ok' })
    const { result } = renderHook(() => useAsync(asyncFn))

    await act(async () => { await result.current.execute('arg1', 42) })

    expect(asyncFn).toHaveBeenCalledWith('arg1', 42)
  })
})

describe('useAsyncSimple', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('execute 成功应设置 data', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: true, data: 42 })
    const { result } = renderHook(() => useAsyncSimple(asyncFn))

    await act(async () => { await result.current.execute() })

    expect(result.current.data).toBe(42)
    expect(result.current.loading).toBe(false)
  })

  it('execute 失败应设置 error', async () => {
    const asyncFn = vi.fn().mockResolvedValue({ success: false, error: 'Bad request' })
    const { result } = renderHook(() => useAsyncSimple(asyncFn))

    await act(async () => { await result.current.execute() })

    expect(result.current.error).toBe('Bad request')
  })
})
