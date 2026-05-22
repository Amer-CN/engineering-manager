/**
 * 工资管理 - 批量回单解析视图
 *
 * 包含 Batch 和 Batch Confirm 两个视图
 * 从 WageManagement.tsx 提取，避免文件过长
 */
import { useState } from 'react'
import type { BatchParseResult } from '@/types'
import BankReceiptBatch from './BankReceiptBatch'
import BankReceiptMatchConfirm from './BankReceiptMatchConfirm'

interface WageBatchViewsProps {
  selectedProject: { id: number; name: string } | null
  selectedMonth: string
  allWageRecords: any[]
  onViewChange: (view: 'dashboard' | 'cycle') => void
}

export function useWageBatchViews({
  selectedProject,
  selectedMonth,
  allWageRecords,
  onViewChange,
}: WageBatchViewsProps) {
  const [batchResult, setBatchResult] = useState<BatchParseResult | null>(null)
  const [view, setView] = useState<'batch' | 'batch-confirm'>('batch')

  const handleBatchParseComplete = (result: BatchParseResult) => {
    setBatchResult(result)
    setView('batch-confirm')
  }

  const handleBatchCancel = () => {
    setBatchResult(null)
    setView('batch')
    onViewChange('cycle')
  }

  const handleBatchBack = () => {
    setBatchResult(null)
    setView('batch')
  }

  const handleBatchConfirm = async (confirmedMatches: any[]) => {
    // 这里应该调用 IPC 更新工资记录
    console.log('Confirming matches:', confirmedMatches)
    // 确认后返回 cycle 视图
    setBatchResult(null)
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

    if (view === 'batch-confirm' && batchResult) {
      return (
        <BankReceiptMatchConfirm
          parseResult={batchResult}
          workers={[]}  // TODO: 传递实际的工人列表
          wageRecords={allWageRecords}
          projectId={selectedProject?.id}
          yearMonth={selectedMonth}
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
