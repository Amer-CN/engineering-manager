import { renderHook, act, waitFor } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════════════
// useRegions
// ═══════════════════════════════════════════════════════════════════════════════

describe('useRegions', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
  })

  const mockRegions = [
    { id: 1, name: '四川' },
    { id: 2, name: '重庆' },
  ]

  it('挂载时自动加载地区列表', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: true,
      data: mockRegions,
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.error).toBeNull()
  })

  it('加载失败设置 error', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: false,
      error: '加载地区失败',
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('加载地区失败')
  })

  it('加载异常设置 error', async () => {
    ea.getRegions = vi.fn().mockRejectedValue(new Error('网络异常'))

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('create 成功后刷新列表', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: true,
      data: mockRegions,
    })
    ea.createRegion = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 3 },
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.create({ name: '云南' } as any)
      expect(res.success).toBe(true)
    })

    expect(ea.createRegion).toHaveBeenCalled()
    expect(ea.getRegions).toHaveBeenCalledTimes(2) // 初始 + create 后刷新
  })

  it('create 失败返回错误', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({ success: true, data: [] })
    ea.createRegion = vi.fn().mockResolvedValue({
      success: false,
      error: '创建地区失败',
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.create({ name: '云南' } as any)
      expect(res.success).toBe(false)
    })
  })

  it('delete 成功从列表移除', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: true,
      data: mockRegions,
    })
    ea.deleteRegion = vi.fn().mockResolvedValue({ success: true })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
  })

  it('delete 失败返回错误', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: true,
      data: mockRegions,
    })
    ea.deleteRegion = vi.fn().mockResolvedValue({
      success: false,
      error: '删除地区失败',
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
  })

  it('clearError 清除错误', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })

  it('refresh 手动重新加载', async () => {
    ea.getRegions = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    })

    const { useRegions } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useRegions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(ea.getRegions).toHaveBeenCalledTimes(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// useSupervisors
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSupervisors', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
  })

  const mockSupervisors = [
    { id: 1, name: '住建局' },
    { id: 2, name: '安监局' },
  ]

  it('挂载时自动加载监管单位列表', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.selectedItem).toBeNull()
  })

  it('create 成功后刷新列表', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })
    ea.createSupervisor = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 3 },
    })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.create({ name: '环保局' })
      expect(res.success).toBe(true)
    })

    expect(ea.getSupervisors).toHaveBeenCalledTimes(2)
  })

  it('update 成功后刷新列表，若更新的是选中项则同步更新', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })
    ea.updateSupervisor = vi.fn().mockResolvedValue({ success: true })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 先选中一个
    act(() => {
      result.current.setSelectedItem(mockSupervisors[0] as any)
    })

    // 更新选中的项目
    const updated = { ...mockSupervisors[0], name: '住建局V2' }
    await act(async () => {
      const res = await result.current.update(updated as any)
      expect(res.success).toBe(true)
    })

    expect(result.current.selectedItem?.name).toBe('住建局V2')
  })

  it('update 非选中项时 selectedItem 不变', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })
    ea.updateSupervisor = vi.fn().mockResolvedValue({ success: true })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 选中 id=1
    act(() => {
      result.current.setSelectedItem(mockSupervisors[0] as any)
    })

    // 更新 id=2
    const updated = { ...mockSupervisors[1], name: '安监局V2' }
    await act(async () => {
      await result.current.update(updated as any)
    })

    expect(result.current.selectedItem?.name).toBe('住建局')
  })

  it('delete 成功从列表移除，若删除的是选中项则清空', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })
    ea.deleteSupervisor = vi.fn().mockResolvedValue({ success: true })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 选中 id=1
    act(() => {
      result.current.setSelectedItem(mockSupervisors[0] as any)
    })

    // 删除 id=1
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.selectedItem).toBeNull()
  })

  it('delete 失败返回错误', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: mockSupervisors,
    })
    ea.deleteSupervisor = vi.fn().mockResolvedValue({
      success: false,
      error: '删除监管单位失败',
    })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(false)
    })
  })

  it('clearError 清除错误', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: false,
      error: '加载失败',
    })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })

  it('refresh 手动重新加载', async () => {
    ea.getSupervisors = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    })

    const { useSupervisors } = await import('../../hooks/useRegionsAndSupervisors')
    const { result } = renderHook(() => useSupervisors())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(ea.getSupervisors).toHaveBeenCalledTimes(2)
  })
})
