// @ts-nocheck
/**
 * usePartners Hook 测试
 * 测试合作单位管理 CRUD
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockPartners = [
  { id: 1, name: '供应商A', type: 'supplier', contactPerson: '张经理', phone: '13800000001' },
  { id: 2, name: '分包商B', type: 'subcontractor', contactPerson: '李经理', phone: '13800000002' },
]

describe('usePartners', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getPartners = vi.fn().mockResolvedValue({ success: true, data: mockPartners })
    ea.createPartner = vi.fn().mockResolvedValue({ success: true, data: { id: 3 } })
    ea.updatePartner = vi.fn().mockResolvedValue({ success: true })
    ea.deletePartner = vi.fn().mockResolvedValue({ success: true })
  })

  it('挂载时自动加载', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(2)
  })

  it('加载失败设置 error', async () => {
    ea.getPartners = vi.fn().mockResolvedValue({ success: false, error: '加载失败' })
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('加载失败')
  })

  it('创建合作单位成功', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新伙伴' })
      expect(res.success).toBe(true)
      expect(res.data?.id).toBe(3)
    })
  })

  it('创建合作单位失败', async () => {
    ea.createPartner = vi.fn().mockResolvedValue({ success: false, error: '创建失败' })
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新伙伴' })
      expect(res.success).toBe(false)
    })
    expect(result.current.error).toBe('创建失败')
  })

  it('更新合作单位成功并同步 selectedItem', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockPartners[0]) })
    const updated = { ...mockPartners[0], name: '供应商A更新' }
    await act(async () => {
      const res = await result.current.update(updated)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem?.name).toBe('供应商A更新')
  })

  it('删除合作单位成功并清除 selectedItem', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockPartners[0]) })
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem).toBeNull()
  })

  it('setSelectedItem', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockPartners[1]) })
    expect(result.current.selectedItem?.name).toBe('分包商B')
    act(() => { result.current.setSelectedItem(null) })
    expect(result.current.selectedItem).toBeNull()
  })

  it('clearError', async () => {
    ea.getPartners = vi.fn().mockResolvedValue({ success: false, error: 'err' })
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
  })

  it('refresh', async () => {
    const { usePartners } = await import('@/hooks/usePartners')
    const { result } = renderHook(() => usePartners())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const before = ea.getPartners.mock.calls.length
    await act(async () => { await result.current.refresh() })
    expect(ea.getPartners.mock.calls.length).toBeGreaterThan(before)
  })
})
