// @ts-nocheck
/**
 * useInvoices Hook 测试
 * 测试发票管理 CRUD + 状态更新 + 筛选
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockInvoices = [
  { id: 1, name: '发票1', type: 'invoice_in', status: 'issued', projectId: 10, invoiceNo: 'INV001', sellerName: '供应商A', buyerName: '我方', amount: 10000, issueDate: '2024-01-15' },
  { id: 2, name: '发票2', type: 'invoice_out', status: 'paid', projectId: 20, invoiceNo: 'INV002', sellerName: '我方', buyerName: '客户B', amount: 20000, issueDate: '2024-02-15' },
  { id: 3, name: '发票3', type: 'invoice_in', status: 'issued', projectId: 10, invoiceNo: 'INV003', sellerName: '供应商C', buyerName: '我方', amount: 5000, issueDate: '2024-03-15' },
]

describe('useInvoices', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data: mockInvoices })
    ea.createInvoice = vi.fn().mockResolvedValue({ success: true, data: { id: 4 } })
    ea.updateInvoice = vi.fn().mockResolvedValue({ success: true })
    ea.deleteInvoice = vi.fn().mockResolvedValue({ success: true })
    ea.updateInvoiceStatus = vi.fn().mockResolvedValue({ success: true })
  })

  it('挂载时自动加载', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(3)
  })

  it('按 type 筛选', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices({ type: 'invoice_in' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(2)
  })

  it('按 status 筛选', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices({ status: 'paid' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(1)
  })

  it('按 projectId 筛选', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices({ projectId: 10 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(2)
  })

  it('按 searchTerm 筛选', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices({ searchTerm: 'INV001' }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].invoiceNo).toBe('INV001')
  })

  it('创建发票成功', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新发票', type: 'invoice_in' })
      expect(res.success).toBe(true)
    })
  })

  it('创建发票失败', async () => {
    ea.createInvoice = vi.fn().mockResolvedValue({ success: false, error: '创建失败' })
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.create({ name: '新发票' })
      expect(res.success).toBe(false)
    })
  })

  it('更新发票成功并同步 selectedItem', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockInvoices[0]) })
    const updated = { ...mockInvoices[0], name: '发票1更新' }
    await act(async () => {
      const res = await result.current.update(updated)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem?.name).toBe('发票1更新')
  })

  it('删除发票成功', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setSelectedItem(mockInvoices[0]) })
    await act(async () => {
      const res = await result.current.delete(1)
      expect(res.success).toBe(true)
    })
    expect(result.current.selectedItem).toBeNull()
  })

  it('updateStatus 成功', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.updateStatus(1, 'paid')
      expect(res.success).toBe(true)
    })
    expect(ea.updateInvoiceStatus).toHaveBeenCalledWith(1, 'paid')
  })

  it('updateStatus 失败', async () => {
    ea.updateInvoiceStatus = vi.fn().mockResolvedValue({ success: false, error: '状态更新失败' })
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const res = await result.current.updateStatus(1, 'paid')
      expect(res.success).toBe(false)
    })
  })

  it('loadData 带 type 参数', async () => {
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.loadData('invoice_in') })
    expect(ea.getInvoices).toHaveBeenCalledWith(undefined, 'invoice_in')
  })

  it('clearError 和 refresh', async () => {
    ea.getInvoices = vi.fn().mockResolvedValue({ success: false, error: 'err' })
    const { useInvoices } = await import('@/hooks/useInvoices')
    const { result } = renderHook(() => useInvoices())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
  })
})
