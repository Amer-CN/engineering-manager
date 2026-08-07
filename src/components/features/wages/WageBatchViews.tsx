/**
 * 工资管理 - 批量回单解析视图
 *
 * 包含 Batch 和 Batch Confirm 两个视图
 * 从 WageManagement.tsx 提取，避免文件过长
 * J-1: 接线走 useBankReceiptBatch 活体（解析 → match → 候选确认 → 落库）
 */
import { useState } from 'react'
import type { BatchParseResult, ConfirmMatchPair } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import { useBankReceiptBatch } from '@/hooks/useBankReceiptBatch'
import BankReceiptBatch from './BankReceiptBatch'
import BankReceiptMatchConfirm from './BankReceiptMatchConfirm'

interface WageBatchViewsProps {
  selectedProject: { id: number; name: string } | null
  selectedMonth: string
  loadWages: () => Promise<void>
  loadAllRecords: () => Promise<void>
  onViewChange: (view: 'dashboard' | 'cycle') => void
}

export function useWageBatchViews({
  selectedProject,
  selectedMonth,
  loadWages,
  loadAllRecords,
  onViewChange,
}: WageBatchViewsProps) {
  const { can } = usePermission()
  const [view, setView] = useState<'batch' | 'batch-confirm'>('batch')

  const batch = useBankReceiptBatch({
    selectedProjectId: selectedProject?.id,
    selectedMonth,
    loadWages,
    loadAllRecords,
  })

  const handleBatchParseComplete = (result: BatchParseResult) => {
    setView('batch-confirm')
    // 解析完成即触发 match（wages:read 纯读，无需额外门控）
    batch.handleBatchParseComplete(result)
  }

  const handleBatchCancel = () => {
    batch.handleBatchCancel()
    setView('batch')
    onViewChange('cycle')
  }

  const handleBatchBack = () => {
    batch.handleBatchBack()
    setView('batch')
  }

  const handleBatchConfirm = async (pairs: ConfirmMatchPair[]) => {
    // 真调 confirm-matches，只发用户确认了的配对；失败留在确认视图
    const ok = await batch.handleBatchConfirm(pairs)
    if (!ok) return
    setView('batch')
    onViewChange('cycle')
  }

  const renderBatchView = () => {
    if (!selectedProject) return null

    if (view === 'batch') {
      return (
        <BankReceiptBatch
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          yearMonth={selectedMonth}
          onParseComplete={handleBatchParseComplete}
          onCancel={handleBatchCancel}
        />
      )
    }

    if (view === 'batch-confirm') {
      return (
        <BankReceiptMatchConfirm
          matchResults={batch.matchResults ?? []}
          yearMonth={selectedMonth}
          canUpdate={can('wages:update')}
          confirming={batch.confirming}
          onConfirm={handleBatchConfirm}
          onBack={handleBatchBack}
          onCancel={handleBatchCancel}
        />
      )
    }

    return null
  }

  return {
    isBatchView: view === 'batch' || view === 'batch-confirm',
    renderBatchView,
    setView,
  }
}
