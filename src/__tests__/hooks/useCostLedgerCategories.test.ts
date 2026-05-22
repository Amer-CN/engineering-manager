// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

describe('useCostLedgerCategories', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
  })

  const mockCategories = [
    { code: 'labor', label: '人工费', direction: 'expense', color: '#ef4444' },
    { code: 'material', label: '材料费', direction: 'expense', color: '#3b82f6' },
    { code: 'income', label: '收入', direction: 'income', color: '#22c55e' },
  ]

  it('挂载时自动加载分类列表', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })

  it('API 不可用时安全退出（loading 保持 true 因为初始化未完成）', async () => {
    delete ea.getCostLedgerCategories

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    // hook 的 load 函数检查 api?.getCostLedgerCategories 不存在时提前 return
    // 不调用 setLoading(false)，loading 初始值为 true
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(result.current.categories).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('加载失败设置 error', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: false,
      error: '加载分类失败',
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('加载分类失败')
  })

  it('加载异常设置 error message', async () => {
    ea.getCostLedgerCategories = vi.fn().mockRejectedValue(new Error('网络异常'))

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('网络异常')
  })

  it('expenseCategories 只返回 direction=expense 的分类', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.expenseCategories).toHaveLength(2)
    expect(result.current.expenseCategories.every(c => c.direction === 'expense')).toBe(true)
  })

  it('incomeCategories 只返回 direction=income 的分类', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.incomeCategories).toHaveLength(1)
    expect(result.current.incomeCategories[0].code).toBe('income')
  })

  it('getLabel 根据 code 返回 label', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.getLabel('labor')).toBe('人工费')
    expect(result.current.getLabel('material')).toBe('材料费')
  })

  it('getLabel 找不到 code 时返回 code 本身', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.getLabel('unknown')).toBe('unknown')
  })

  it('getColor 根据 code 返回 color', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.getColor('labor')).toBe('#ef4444')
  })

  it('getColor 找不到 code 时返回默认灰色', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.getColor('nonexistent')).toBe('#9ca3af')
  })

  it('getByDirection 按方向筛选', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const expenses = result.current.getByDirection('expense')
    expect(expenses).toHaveLength(2)
    const incomes = result.current.getByDirection('income')
    expect(incomes).toHaveLength(1)
  })

  it('refresh 可手动重新加载', async () => {
    ea.getCostLedgerCategories = vi.fn().mockResolvedValue({
      success: true,
      data: mockCategories,
    })

    const { useCostLedgerCategories } = await import('../../hooks/useCostLedgerCategories')
    const { result } = renderHook(() => useCostLedgerCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.refresh()

    expect(ea.getCostLedgerCategories).toHaveBeenCalledTimes(2)
  })
})
