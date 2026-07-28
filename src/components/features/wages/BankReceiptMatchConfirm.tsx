/**
 * 银行回单批量解析 - 匹配结果确认组件
 *
 * 功能：
 * 1. 表格展示：回单信息 | 匹配工人 | 匹配工资记录 | 匹配置信度
 * 2. 支持手动调整（下拉选择正确工人/工资记录）
 * 3. 批量确认（一键确认所有高置信度匹配）
 */
import { useState, useMemo, useCallback } from 'react'
import { DataTable } from '@/components/DataTable'
import { useToastStore } from '@/store/toastStore'
import type { BatchParseResult, BankReceiptMatch } from '@/types'
import { getMatchColumns } from './BankReceiptMatchColumns'
import { MatchConfirmStatsBar } from './MatchConfirmStatsBar'

interface BankReceiptMatchConfirmProps {
  parseResult: BatchParseResult
  workers: { id: number; name: string }[]
  wageRecords: { id: number; memberName?: string; actualWage: number; yearMonth: string }[]
  projectId?: number
  yearMonth?: string
  onConfirm: (confirmedMatches: BankReceiptMatch[]) => void
  onBack: () => void
  onCancel: () => void
}

export default function BankReceiptMatchConfirm({
  parseResult,
  workers,
  wageRecords,
  onConfirm,
  onBack,
  onCancel,
}: BankReceiptMatchConfirmProps) {
  const showToast = useToastStore(state => state.showToast)

  const [matches, setMatches] = useState<BankReceiptMatch[]>(parseResult.matches)
  const [confirming, setConfirming] = useState(false)

  const stats = useMemo(() => {
    const total = matches.length
    const matched = matches.filter(m => m.status === 'matched').length
    const unmatched = matches.filter(m => m.status === 'unmatched').length
    const ambiguous = matches.filter(m => m.status === 'ambiguous').length
    const archived = matches.filter(m => m.status === 'archived').length
    const highConfidence = matches.filter(m => m.confidence >= 80 && m.status !== 'archived').length

    return { total, matched, unmatched, ambiguous, archived, highConfidence }
  }, [matches])

  const handleWorkerChange = useCallback((index: number, workerId: number | null, workerName: string | null) => {
    setMatches(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        matchedWorkerId: workerId,
        matchedWorkerName: workerName,
        status: workerId ? 'ambiguous' : 'unmatched',
        confidence: workerId ? 60 : 0,
      }
      return next
    })
  }, [])

  const handleWageChange = useCallback((index: number, wageId: number | null) => {
    setMatches(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        matchedWageId: wageId,
        status: wageId ? 'ambiguous' : 'unmatched',
        confidence: wageId ? Math.min(next[index].confidence, 70) : 0,
      }
      return next
    })
  }, [])

  const handleBatchConfirm = useCallback(async () => {
    const highConfMatches = matches.filter(m => m.confidence >= 80 && m.status !== 'archived' && m.matchedWageId)

    if (highConfMatches.length === 0) {
      showToast('没有可自动确认的高置信度匹配', 'warning')
      return
    }

    setConfirming(true)
    try {
      await onConfirm(highConfMatches)
      showToast(`已确认 ${highConfMatches.length} 条高置信度匹配`, 'success')
    } catch (error: any) {
      showToast(error.message || '确认失败', 'error')
    } finally {
      setConfirming(false)
    }
  }, [matches, onConfirm, showToast])

  const handleConfirmAll = useCallback(async () => {
    const validMatches = matches.filter(m => m.matchedWageId && m.status !== 'archived')

    if (validMatches.length === 0) {
      showToast('没有可确认的匹配', 'warning')
      return
    }

    setConfirming(true)
    try {
      await onConfirm(validMatches)
      showToast(`已确认 ${validMatches.length} 条匹配`, 'success')
    } catch (error: any) {
      showToast(error.message || '确认失败', 'error')
    } finally {
      setConfirming(false)
    }
  }, [matches, onConfirm, showToast])

  const columns = getMatchColumns(workers, wageRecords, handleWorkerChange, handleWageChange)
  const dataWithIndex = matches.map((m, i) => ({ ...m, _index: i }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">匹配结果确认</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-[color:var(--fg-2)] bg-[color:var(--card)] border border-[color:var(--border)] rounded-md hover:bg-[color:var(--panel-2)]"
        >
          返回重新上传
        </button>
      </div>

      <MatchConfirmStatsBar
        stats={stats}
        confirming={confirming}
        onBatchConfirm={handleBatchConfirm}
        onConfirmAll={handleConfirmAll}
      />

      <DataTable
        data={dataWithIndex}
        columns={columns}
        rowKey={(item) => `${item._index}`}
        pagination={false}
        showContainer={true}
        stickyHeader={true}
        emptyText="暂无匹配结果"
      />

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-[color:var(--fg-2)] bg-[color:var(--card)] border border-[color:var(--border)] rounded-md hover:bg-[color:var(--panel-2)]"
        >
          取消
        </button>
        <button
          onClick={handleConfirmAll}
          disabled={confirming}
          className="px-6 py-2 text-sm font-medium text-[color:var(--on-accent)] bg-[color:var(--accent)] rounded-md hover:opacity-90 disabled:bg-[color:var(--muted)]"
        >
          {confirming ? '确认中...' : '确认并提交'}
        </button>
      </div>
    </div>
  )
}
