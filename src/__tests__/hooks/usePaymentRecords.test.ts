import { renderHook, act } from '@testing-library/react'

describe('usePaymentRecords', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
  })

  const mockRecords = [
    { id: 1, amount: 5000, type: 'invoice_in', recordDate: '2024-01-15' },
    { id: 2, amount: 3000, type: 'invoice_out', recordDate: '2024-02-01' },
  ]

  it('初始状态：空数组、不加载', async () => {
    // usePaymentRecords 不会自动加载（无 useEffect）
    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    expect(result.current.data).toHaveLength(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.selectedItem).toBeNull()
  })

  it('loadData 成功加载工资发放记录', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: mockRecords,
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.data).toHaveLength(2)
    expect(ea.getWagePaymentRecords).toHaveBeenCalledWith({ status: undefined })
  })

  it('loadData 传递 type 参数', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: [mockRecords[0]],
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.loadData('overdue')
    })

    expect(ea.getWagePaymentRecords).toHaveBeenCalledWith({ status: 'overdue' })
  })

  it('loadData 失败设置 error', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.error).toBe('加载失败')
  })

  it('loadData 异常设置 error', async () => {
    ea.getWagePaymentRecords = vi.fn().mockRejectedValue(new Error('网络异常'))

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.loadData()
    })

    expect(result.current.error).toBeTruthy()
  })

  it('create 成功后刷新列表', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: mockRecords,
    })
    ea.createPaymentRecord = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 3 },
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      const res = await result.current.create({ amount: 1000 })
      expect(res.success).toBe(true)
      expect((res as any).data!.id).toBe(3)
    })

    expect(ea.createPaymentRecord).toHaveBeenCalled()
    expect(ea.getWagePaymentRecords).toHaveBeenCalled()
  })

  it('create 失败返回错误', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({ success: true, data: [] })
    ea.createPaymentRecord = vi.fn().mockResolvedValue({
      success: false,
      error: '创建失败',
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      const res = await result.current.create({ amount: 1000 })
      expect(res.success).toBe(false)
    })
  })

  it('update 成功后刷新列表', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: mockRecords,
    })
    ea.updatePaymentRecord = vi.fn().mockResolvedValue({ success: true })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      const res = await result.current.update({ ...mockRecords[0], amount: 6000 } as any)
      expect(res.success).toBe(true)
    })

    expect(ea.updatePaymentRecord).toHaveBeenCalled()
  })

  it('delete 成功后刷新列表', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: mockRecords,
    })
    ea.deletePaymentRecord = vi.fn().mockResolvedValue({ success: true })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })

    expect(ea.deletePaymentRecord).toHaveBeenCalledWith(1)
  })

  it('setSelectedItem 设置选中项', async () => {
    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    act(() => {
      result.current.setSelectedItem(mockRecords[0] as any)
    })

    expect(result.current.selectedItem).toEqual(mockRecords[0])
  })

  it('clearError 清除错误', async () => {
    // 用 mockResolvedValue(success:false) 触发 error 分支
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.loadData()
    })
    expect(result.current.error).toBe('加载失败')

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })

  it('refresh 调用 loadData', async () => {
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    })

    const { usePaymentRecords } = await import('../../hooks/usePaymentRecords')
    const { result } = renderHook(() => usePaymentRecords())

    await act(async () => {
      await result.current.refresh()
    })

    expect(ea.getWagePaymentRecords).toHaveBeenCalledTimes(1)
  })
})
