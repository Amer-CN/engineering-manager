/**
 * 银行回单批量解析 - 自定义 Hook（J-1 复活为活体）
 *
 * 管理批量解析和确认的状态和逻辑：
 * - 解析完成（handleBatchParseComplete）后自动构造 ReceiptMatchInput[]（每回单成功明细一条）
 *   并调 matchBankReceiptItems 拿候选（纯读打分，wages:read 全角色有，无需额外门控）
 * - 确认（handleBatchConfirm）只发用户确认的配对（ConfirmMatchPair[]），toast 如实报
 *   saved/skipped（skippedItems 列出 id，不许吞）；成功后刷新工资数据
 * - 权限：confirm 是写操作，handler 内部 can('wages:update') 守卫（G2 模式同型）
 */
import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from './usePermission'
import type { BatchParseResult, ReceiptMatchInput, MatchReceiptResult, ConfirmMatchPair } from '@/types'

interface UseBankReceiptBatchProps {
  selectedProjectId?: number
  selectedMonth?: string
  loadWages: () => Promise<void>
  loadAllRecords: () => Promise<void>
}

interface UseBankReceiptBatchReturn {
  batchResult: BatchParseResult | null
  setBatchResult: (result: BatchParseResult | null) => void
  matchResults: MatchReceiptResult[] | null
  matching: boolean
  confirming: boolean
  handleBatchParseComplete: (result: BatchParseResult) => void
  handleBatchCancel: () => void
  handleBatchBack: () => void
  handleBatchConfirm: (pairs: ConfirmMatchPair[]) => Promise<boolean>
}

export function useBankReceiptBatch({
  selectedProjectId,
  selectedMonth,
  loadWages,
  loadAllRecords,
}: UseBankReceiptBatchProps): UseBankReceiptBatchReturn {
  const showToast = useToastStore(state => state.showToast)
  const { can } = usePermission()

  const [batchResult, setBatchResult] = useState<BatchParseResult | null>(null)
  const [matchResults, setMatchResults] = useState<MatchReceiptResult[] | null>(null)
  const [matching, setMatching] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleBatchParseComplete = useCallback((result: BatchParseResult) => {
    setBatchResult(result)
    setMatchResults(null)
    if (!selectedProjectId) {
      showToast('缺少项目信息，无法匹配回单', 'warning')
      return
    }
    // 解析出的回单列表 → match：每张回单的成功明细（金额>0）展开为一条 ReceiptMatchInput，
    // 与单回单流（useBankReceipt）同规则过滤，交给后端打分拿候选
    const receipts: ReceiptMatchInput[] = []
    for (const receipt of result.results) {
      for (const item of receipt.items) {
        if (!/(成功|Success)/i.test(item.status) || item.amount <= 0) continue
        receipts.push({
          amount: item.amount,
          date: receipt.date || undefined,
          counterparty: item.name,
          receiptPath: receipt.receiptPath,
        })
      }
    }
    if (receipts.length === 0) {
      showToast('没有可匹配的回单明细', 'warning')
      return
    }
    setMatching(true)
    ;(async () => {
      try {
        const res = await (await getAPI()).matchBankReceiptItems(selectedProjectId, selectedMonth, receipts)
        if (res.success && res.data) {
          setMatchResults(res.data.matches)
          const candidateCount = res.data.matches.reduce(
            (sum: number, m: MatchReceiptResult) => sum + m.candidates.length,
            0
          )
          showToast(
            `匹配完成：${res.data.matches.length} 张回单，共 ${candidateCount} 个候选`,
            candidateCount > 0 ? 'success' : 'warning'
          )
        } else {
          showToast(res.error || '回单匹配失败', 'error')
        }
      } catch (error: any) {
        showToast(error?.message || '回单匹配失败', 'error')
      } finally {
        setMatching(false)
      }
    })()
  }, [selectedProjectId, selectedMonth, showToast])

  const handleBatchCancel = useCallback(() => {
    setBatchResult(null)
    setMatchResults(null)
  }, [])

  const handleBatchBack = useCallback(() => {
    setMatchResults(null)
  }, [])

  const handleBatchConfirm = useCallback(async (pairs: ConfirmMatchPair[]): Promise<boolean> => {
    // G2 B2: 确认写付款列 → wages:update（handler 守卫，渲染守卫在组件）
    if (!can('wages:update')) {
      showToast('您没有登记发放的权限', 'error')
      return false
    }
    if (pairs.length === 0) {
      showToast('没有可确认的配对', 'warning')
      return false
    }
    setConfirming(true)
    try {
      const result = await (await getAPI()).batchConfirmMatches(pairs)
      if (result.success && result.data) {
        const { saved, skipped, skippedItems } = result.data
        const skippedIds = skippedItems.length > 0
          ? `（跳过未落库 id: ${skippedItems.map((i: { id: number }) => i.id).join(', ')}）`
          : ''
        showToast(`已确认 ${saved} 条配对${skipped > 0 ? `，跳过 ${skipped} 条${skippedIds}` : ''}`, skipped > 0 ? 'warning' : 'success')
        setBatchResult(null)
        setMatchResults(null)
        // 刷新工资数据
        await loadWages()
        await loadAllRecords()
        return true
      }
      showToast(result.error || '确认失败', 'error')
      return false
    } catch (error: any) {
      showToast(error?.message || '确认失败', 'error')
      return false
    } finally {
      setConfirming(false)
    }
  }, [can, loadWages, loadAllRecords, showToast])

  return {
    batchResult,
    setBatchResult,
    matchResults,
    matching,
    confirming,
    handleBatchParseComplete,
    handleBatchCancel,
    handleBatchBack,
    handleBatchConfirm,
  }
}
