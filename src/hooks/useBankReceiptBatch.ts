/**
 * 银行回单批量解析 - 自定义 Hook
 *
 * 管理批量解析和确认的状态和逻辑
 */
import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import type { BatchParseResult, BankReceiptMatch } from '@/types'

interface UseBankReceiptBatchProps {
  selectedMonth?: string
  loadWages: () => Promise<void>
  loadAllRecords: () => Promise<void>
}

interface UseBankReceiptBatchReturn {
  batchResult: BatchParseResult | null
  setBatchResult: (result: BatchParseResult | null) => void
  handleBatchParseComplete: (result: BatchParseResult) => void
  handleBatchCancel: () => void
  handleBatchBack: () => void
  handleBatchConfirm: (confirmedMatches: BankReceiptMatch[]) => Promise<void>
}

export function useBankReceiptBatch({
  selectedMonth,
  loadWages,
  loadAllRecords,
}: UseBankReceiptBatchProps): UseBankReceiptBatchReturn {
  const showToast = useToastStore(state => state.showToast)

  const [batchResult, setBatchResult] = useState<BatchParseResult | null>(null)

  const handleBatchParseComplete = useCallback((result: BatchParseResult) => {
    setBatchResult(result)
  }, [])

  const handleBatchCancel = useCallback(() => {
    setBatchResult(null)
  }, [])

  const handleBatchBack = useCallback(() => {
    setBatchResult(null)
  }, [])

  const handleBatchConfirm = useCallback(async (confirmedMatches: BankReceiptMatch[]) => {
    try {
      const result = await window.electronAPI.batchConfirmMatches(confirmedMatches, selectedMonth)
      if (result.success) {
        showToast(`成功确认 ${result.data?.updated || 0} 条工资记录`, 'success')
        // 刷新工资数据
        await loadWages()
        await loadAllRecords()
        // 返回 cycle 视图
        setBatchResult(null)
      } else {
        showToast(result.error || '确认失败', 'error')
      }
    } catch (error: any) {
      showToast(error?.message || '确认失败', 'error')
    }
  }, [selectedMonth, showToast, loadWages, loadAllRecords])

  return {
    batchResult,
    setBatchResult,
    handleBatchParseComplete,
    handleBatchCancel,
    handleBatchBack,
    handleBatchConfirm,
  }
}
