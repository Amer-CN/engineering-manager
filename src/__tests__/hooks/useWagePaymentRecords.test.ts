import { renderHook, act, waitFor } from '@testing-library/react'
import { useWagePaymentRecords } from '@/hooks/useWagePaymentRecords'

describe('useWagePaymentRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getWagePaymentRecords = vi.fn().mockResolvedValue({ success: true, data: [] })
    ;(window.electronAPI as any).getWageOverdueStats = vi.fn().mockResolvedValue({ success: true, data: null })
    ;(window.electronAPI as any).getWageOverdueList = vi.fn().mockResolvedValue({ success: true, data: [] })
  })

  test('初始 loading 应为 false', async () => {
    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  test('初始 records 应为空数组', async () => {
    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.records).toEqual([])
  })

  test('初始 overdueStats 应为 null', async () => {
    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.overdueStats).toBeNull()
  })

  test('applyFilters 应更新筛选条件并加载数据', async () => {
    ;(window.electronAPI as any).getWagePaymentRecords.mockResolvedValue({
      success: true,
      data: [{ projectName: '项目A', yearMonth: '2026-01' }],
    })

    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.applyFilters({ projectId: 1 })
    })

    await waitFor(() => {
      expect((window.electronAPI as any).getWagePaymentRecords).toHaveBeenCalledWith({ projectId: 1 })
    })
  })

  test('loadOverdueList 应加载欠薪列表', async () => {
    ;(window.electronAPI as any).getWageOverdueList.mockResolvedValue({
      success: true,
      data: [{ projectName: '项目A', overdueDays: 30 }],
    })

    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

    await act(async () => {
      await result.current.loadOverdueList()
    })

    expect(result.current.overdueList).toEqual([{ projectName: '项目A', overdueDays: 30 }])
  })

  test('getWagePaymentRecords 失败时不应崩溃', async () => {
    ;(window.electronAPI as any).getWagePaymentRecords.mockRejectedValue(new Error('网络错误'))

    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.records).toEqual([])
  })

  test('filters 初始应为空对象', async () => {
    const { result } = renderHook(() => useWagePaymentRecords())
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })
    expect(result.current.filters).toEqual({})
  })
})
