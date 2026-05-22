// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

describe('useCostLedgerBatches', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
  })

  it('挂载时自动加载批次列表', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: '第一批次', projectId: 10 },
        { id: 2, name: '第二批次', projectId: 10 },
      ],
    })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.batches).toHaveLength(2)
    expect(ea.getCostLedgerBatches).toHaveBeenCalledWith(10)
  })

  it('API 不可用时安全退出（loading 保持 true 因为初始化未完成）', async () => {
    // 删除方法模拟 API 不存在
    delete ea.getCostLedgerBatches

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    // hook 的 load 函数检查 api?.getCostLedgerBatches 不存在时提前 return
    // 不调用 setLoading(false)，loading 初始值为 true
    // 给一个短暂的等待确认没有异常
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(result.current.batches).toHaveLength(0)
  })

  it('createBatch 成功添加到列表', async () => {
    const newBatch = { id: 3, name: '新批次', projectId: 10 }
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '第一批次', projectId: 10 }],
    })
    ea.createCostLedgerBatch = vi.fn().mockResolvedValue({
      success: true,
      data: newBatch,
    })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: any
    await act(async () => {
      created = await result.current.createBatch('新批次')
    })

    expect(created).toEqual(newBatch)
    expect(result.current.batches).toHaveLength(2)
    expect(ea.createCostLedgerBatch).toHaveBeenCalledWith(10, '新批次')
  })

  it('createBatch 失败返回 null', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    })
    ea.createCostLedgerBatch = vi.fn().mockResolvedValue({
      success: false,
      error: '创建失败',
    })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let created: any
    await act(async () => {
      created = await result.current.createBatch('失败批次')
    })

    expect(created).toBeNull()
  })

  it('deleteBatch 成功从列表移除', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: '第一批次', projectId: 10 },
        { id: 2, name: '第二批次', projectId: 10 },
      ],
    })
    ea.deleteCostLedgerBatch = vi.fn().mockResolvedValue({ success: true })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let deleted: any
    await act(async () => {
      deleted = await result.current.deleteBatch(1)
    })

    expect(deleted).toBe(true)
    expect(result.current.batches).toHaveLength(1)
    expect(result.current.batches[0].id).toBe(2)
  })

  it('deleteBatch 失败返回 false', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '第一批次', projectId: 10 }],
    })
    ea.deleteCostLedgerBatch = vi.fn().mockResolvedValue({ success: false })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let deleted: any
    await act(async () => {
      deleted = await result.current.deleteBatch(1)
    })

    expect(deleted).toBe(false)
    expect(result.current.batches).toHaveLength(1)
  })

  it('copyBatch 成功添加副本到列表', async () => {
    const copiedBatch = { id: 3, name: '副本', projectId: 10 }
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '原始批次', projectId: 10 }],
    })
    ea.copyCostLedgerBatch = vi.fn().mockResolvedValue({
      success: true,
      data: copiedBatch,
    })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let copied: any
    await act(async () => {
      copied = await result.current.copyBatch(1, '副本')
    })

    expect(copied).toEqual(copiedBatch)
    expect(result.current.batches).toHaveLength(2)
    expect(ea.copyCostLedgerBatch).toHaveBeenCalledWith(10, 1, '副本')
  })

  it('renameBatch 成功更新列表中的名称', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: '旧名称', projectId: 10 }],
    })
    ea.renameCostLedgerBatch = vi.fn().mockResolvedValue({ success: true })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let renamed: any
    await act(async () => {
      renamed = await result.current.renameBatch(1, '新名称')
    })

    expect(renamed).toBe(true)
    expect(result.current.batches[0].name).toBe('新名称')
    expect(ea.renameCostLedgerBatch).toHaveBeenCalledWith(10, 1, '新名称')
  })

  it('reload 可手动重新加载', async () => {
    ea.getCostLedgerBatches = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    })

    const { useCostLedgerBatches } = await import('../../hooks/useCostLedgerBatches')
    const { result } = renderHook(() => useCostLedgerBatches(10))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.reload()
    })

    expect(ea.getCostLedgerBatches).toHaveBeenCalledTimes(2)
  })
})
