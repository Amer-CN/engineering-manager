import { renderHook, act } from '@testing-library/react'

// Mock toastStore at top level (vitest hoisting requirement)
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: any) => selector({ showToast: vi.fn() }),
}))

import { useBankReceiptBatch } from '@/hooks/useBankReceiptBatch'

describe('useBankReceiptBatch', () => {
  const mockLoadWages = vi.fn().mockResolvedValue(undefined)
  const mockLoadAllRecords = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).batchConfirmMatches = vi.fn()
  })

  test('初始 batchResult 应为 null', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedMonth: '2026-01',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    expect(result.current.batchResult).toBeNull()
  })

  test('handleBatchParseComplete 应设置结果', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedMonth: '2026-01',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    const mockResult = { matches: [], successCount: 0, failCount: 0, results: [], failedFiles: [] } as any

    act(() => {
      result.current.handleBatchParseComplete(mockResult)
    })
    expect(result.current.batchResult).toEqual(mockResult)
  })

  test('handleBatchCancel 应清除结果', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedMonth: '2026-01',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    const mockResult = { matches: [], successCount: 0, failCount: 0, results: [], failedFiles: [] } as any

    act(() => {
      result.current.handleBatchParseComplete(mockResult)
    })
    expect(result.current.batchResult).not.toBeNull()

    act(() => {
      result.current.handleBatchCancel()
    })
    expect(result.current.batchResult).toBeNull()
  })

  test('handleBatchBack 应清除结果', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedMonth: '2026-01',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    act(() => {
      result.current.handleBatchParseComplete({ matches: [], successCount: 0, failCount: 0, results: [], failedFiles: [] } as any)
    })
    act(() => {
      result.current.handleBatchBack()
    })
    expect(result.current.batchResult).toBeNull()
  })

  test('setBatchResult 应可以外部设置结果', () => {
    const { result } = renderHook(() => useBankReceiptBatch({
      selectedMonth: '2026-01',
      loadWages: mockLoadWages,
      loadAllRecords: mockLoadAllRecords,
    }))
    act(() => {
      result.current.setBatchResult({ matches: [], successCount: 5, failCount: 0, results: [], failedFiles: [] } as any)
    })
    expect(result.current.batchResult?.successCount).toBe(5)
  })
})
