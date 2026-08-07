import { renderHook, act } from '@testing-library/react'
import { setCurrentUser } from '@/types/permissions'

// Mock toastStore at top level (vitest hoisting requirement)
const mockShowToast = vi.fn()
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: any) => selector({ showToast: mockShowToast }),
}))

import { useBankReceiptBatch } from '@/hooks/useBankReceiptBatch'

describe('useBankReceiptBatch', () => {
  const mockLoadWages = vi.fn().mockResolvedValue(undefined)
  const mockLoadAllRecords = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    mockShowToast.mockClear()
    // J-1: 确认是写操作（wages:update），默认给权限；无权限场景单独测
    setCurrentUser({
      userId: '1', username: 'admin', roleId: 'admin', roleName: '管理员',
      permissions: ['wages:update'],
    })
    ;(window.electronAPI as any).matchBankReceiptItems = vi.fn().mockResolvedValue({
      success: true,
      data: { matches: [{ receiptPath: 'r1.jpg', date: '2026-07-15', amount: 5000, candidates: [{ wageId: 101, workerName: '张三', amount: 5000, yearMonth: '2026-07', score: 6, reasons: ['金额分相等', '姓名互相包含', '日期与工资月份同月或相邻'] }] }] },
    })
    ;(window.electronAPI as any).batchConfirmMatches = vi.fn().mockResolvedValue({
      success: true,
      data: { saved: 1, skipped: 0, skippedItems: [] },
    })
  })

  afterEach(() => {
    setCurrentUser(null)
  })

  test('初始 batchResult 应为 null', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    expect(result.current.batchResult).toBeNull()
  })

  test('handleBatchParseComplete 应设置结果', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    const mockResult = { matches: [], successCount: 1, failCount: 0, results: [], failedFiles: [] } as any

    act(() => {
      result.current.handleBatchParseComplete(mockResult)
    })
    expect(result.current.batchResult).toEqual(mockResult)
  })

  test('match 以解析回单为入参被调（成功明细展开为 ReceiptMatchInput）', async () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    const mockResult = {
      successCount: 1, failCount: 0, results: [
        { date: '2026-07-15', totalAmount: 5000, successAmount: 5000, failCount: 0, receiptPath: 'r1.jpg',
          items: [
            { name: '张三', amount: 5000, status: '成功', account: '6222' },
            { name: '李四', amount: 3000, status: '失败' },
            { name: '王五', amount: 0, status: '成功' }, // 金额 0 不进 match
          ] },
      ], matches: [], failedFiles: [],
    } as any

    await act(async () => {
      result.current.handleBatchParseComplete(mockResult)
    })
    // 等待内部 async match 完成
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })

    const matchMock = (window.electronAPI as any).matchBankReceiptItems
    expect(matchMock).toHaveBeenCalledOnce()
    const [projectId, yearMonth, receipts] = matchMock.mock.calls[0]
    expect(projectId).toBe(1)
    expect(yearMonth).toBe('2026-07')
    // 只有成功且金额>0 的明细进 match：张三 5000 一条
    expect(receipts).toEqual([
      { amount: 5000, date: '2026-07-15', counterparty: '张三', receiptPath: 'r1.jpg' },
    ])
    expect(result.current.matchResults).toHaveLength(1)
    expect(result.current.matchResults![0].candidates).toHaveLength(1)
    expect(result.current.matchResults![0].candidates[0].reasons).toContain('姓名互相包含')
  })

  test('confirm 只发用户确认的配对（skipped 不出现在请求里）', async () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))

    let ok = false
    await act(async () => {
      ok = await result.current.handleBatchConfirm([
        { wageId: 101, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: 'r1.jpg' },
      ])
    })

    expect(ok).toBe(true)
    const confirmMock = (window.electronAPI as any).batchConfirmMatches
    expect(confirmMock).toHaveBeenCalledOnce()
    // 只发已确认配对，无额外数据
    expect(confirmMock.mock.calls[0][0]).toEqual([
      { wageId: 101, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: 'r1.jpg' },
    ])
    // toast 如实报 saved
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('已确认 1 条配对'),
      'success'
    )
    // 成功后刷新数据
    expect(mockLoadWages).toHaveBeenCalledOnce()
    expect(mockLoadAllRecords).toHaveBeenCalledOnce()
  })

  test('skipped 出现在提示里（skippedItems 列出 id，不许吞）', async () => {
    ;(window.electronAPI as any).batchConfirmMatches = vi.fn().mockResolvedValue({
      success: true,
      data: { saved: 1, skipped: 2, skippedItems: [{ id: 202 }, { id: 203 }] },
    })
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))

    await act(async () => {
      await result.current.handleBatchConfirm([
        { wageId: 101, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: 'r1.jpg' },
      ])
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('跳过 2 条'),
      'warning'
    )
    const msg = mockShowToast.mock.calls[0][0] as string
    expect(msg).toContain('202')
    expect(msg).toContain('203')
  })

  test('无 wages:update 权限时 confirm 被 handler 守卫拦截（不发请求）', async () => {
    setCurrentUser({
      userId: '2', username: 'viewer', roleId: 'viewer', roleName: '只读',
      permissions: ['wages:read'],
    })
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))

    let ok = true
    await act(async () => {
      ok = await result.current.handleBatchConfirm([
        { wageId: 101, paidAmount: 5000, paidDate: '2026-07-15', bankReceiptPath: 'r1.jpg' },
      ])
    })

    expect(ok).toBe(false)
    expect((window.electronAPI as any).batchConfirmMatches).not.toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith('您没有登记发放的权限', 'error')
  })

  test('handleBatchCancel / handleBatchBack 应清除状态', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedProjectId: 1,
      selectedMonth: '2026-07',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    const mockResult = { matches: [], successCount: 0, failCount: 0, results: [], failedFiles: [] } as any

    act(() => {
      result.current.handleBatchParseComplete(mockResult)
      result.current.handleBatchCancel()
    })
    expect(result.current.batchResult).toBeNull()
  })
})
