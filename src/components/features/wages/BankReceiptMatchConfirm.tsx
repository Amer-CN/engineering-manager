/**
 * 银行回单批量解析 - 匹配结果确认组件
 *
 * 功能：
 * 1. 表格展示：回单信息 | 匹配工人 | 匹配工资记录 | 匹配置信度
 * 2. 支持手动调整（下拉选择正确工人/工资记录）
 * 3. 批量确认（一键确认所有高置信度匹配）
 */
import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useToastStore } from '@/store/toastStore'
import type { BatchParseResult, BankReceiptMatch } from '@/types'

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

  // ── 本地状态：可编辑的匹配列表 ──
  const [matches, setMatches] = useState<BankReceiptMatch[]>(parseResult.matches)
  const [confirming, setConfirming] = useState(false)

  // ══════════════════════════════════════════════════════
  // 计算统计信息
  // ══════════════════════════════════════════════════════

  const stats = useMemo(() => {
    const total = matches.length
    const matched = matches.filter(m => m.status === 'matched').length
    const unmatched = matches.filter(m => m.status === 'unmatched').length
    const ambiguous = matches.filter(m => m.status === 'ambiguous').length
    const archived = matches.filter(m => m.status === 'archived').length
    const highConfidence = matches.filter(m => m.confidence >= 80 && m.status !== 'archived').length

    return { total, matched, unmatched, ambiguous, archived, highConfidence }
  }, [matches])

  // ══════════════════════════════════════════════════════
  // 手动调整匹配
  // ══════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════
  // 批量确认高置信度匹配
  // ══════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════
  // 确认所有已调整的匹配
  // ══════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════
  // 获取置信度颜色
  // ══════════════════════════════════════════════════════

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      matched: 'bg-green-100 text-green-800',
      unmatched: 'bg-red-100 text-red-800',
      ambiguous: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    const labels: Record<string, string> = {
      matched: '已匹配',
      unmatched: '未匹配',
      ambiguous: '待确认',
      archived: '已归档',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    )
  }

  // ══════════════════════════════════════════════════════
  // 渲染
  // ══════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* 标题与统计 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">匹配结果确认</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          返回重新上传
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">总计</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">已匹配</p>
          <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">待确认</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.ambiguous}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">未匹配</p>
          <p className="text-2xl font-bold text-red-600">{stats.unmatched}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">已归档</p>
          <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          高置信度匹配（≥80%）：<span className="font-bold text-green-600">{stats.highConfidence}</span> 条
        </div>
        <div className="space-x-4">
          <button
            onClick={handleBatchConfirm}
            disabled={confirming || stats.highConfidence === 0}
            className={`
              px-6 py-2 text-sm font-medium text-white rounded-md
              ${stats.highConfidence === 0 || confirming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
              }
            `}
          >
            {confirming ? '确认中...' : `一键确认高置信度（${stats.highConfidence}）`}
          </button>
          <button
            onClick={handleConfirmAll}
            disabled={confirming}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {confirming ? '确认中...' : '确认所有已匹配'}
          </button>
        </div>
      </div>

      {/* 匹配结果表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  回单信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  解析姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  解析金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  匹配工人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  匹配工资记录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  置信度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matches.map((match, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  {/* 回单信息 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <p className="font-medium">{match.parsedDate || '日期未知'}</p>
                      <p className="text-xs text-gray-500">{match.receiptPath.split('/').pop()}</p>
                    </div>
                  </td>

                  {/* 解析姓名 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={match.parsedName ? 'text-gray-900' : 'text-gray-400'}>
                      {match.parsedName || '未识别'}
                    </span>
                  </td>

                  {/* 解析金额 */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="font-medium text-gray-900">
                      ¥{match.parsedAmount.toFixed(2)}
                    </span>
                  </td>

                  {/* 匹配工人（可手动调整） */}
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={match.matchedWorkerId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value ? parseInt(e.target.value) : null
                        // 这里需要从 workers 列表中找到对应的姓名
                        const selectedWorker = workers.find(w => w.id === selectedId)
                        handleWorkerChange(index, selectedId, selectedWorker?.name || null)
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={match.status === 'archived'}
                    >
                      <option value="">-- 未匹配 --</option>
                      {workers.map(worker => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 匹配工资记录（可手动调整） */}
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={match.matchedWageId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value ? parseInt(e.target.value) : null
                        handleWageChange(index, selectedId)
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={match.status === 'archived' || !match.matchedWorkerId}
                    >
                      <option value="">-- 未匹配 --</option>
                      {wageRecords
                        .filter(w => !match.matchedWorkerId || w.memberName === match.matchedWorkerName)
                        .map(w => (
                          <option key={w.id} value={w.id}>
                            {w.yearMonth} - ¥{w.actualWage.toFixed(2)}
                          </option>
                        ))}
                    </select>
                  </td>

                  {/* 置信度 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(match.confidence)}`}>
                      {match.confidence}%
                    </span>
                  </td>

                  {/* 状态 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(match.status)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleConfirmAll}
          disabled={confirming}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {confirming ? '确认中...' : '确认并提交'}
        </button>
      </div>
    </div>
  )
}
