/**
 * 银行回单批量解析 - 匹配候选确认组件（J-1 重做为候选 UI）
 *
 * 功能：
 * 1. 每张回单展示 match-receipts 返回的候选列表（score + 理由文案）
 * 2. 用户每回单选一个候选或「跳过」（默认跳过，不产生配对）
 * 3. 确认按钮 can('wages:update') 渲染守卫 + handler 守卫；只发用户确认了的配对
 */
import { useState, useCallback } from 'react'
import { DataTable } from '@/components/DataTable'
import { useToastStore } from '@/store/toastStore'
import type { ConfirmMatchPair, MatchReceiptResult } from '@/types'

interface BankReceiptMatchConfirmProps {
  matchResults: MatchReceiptResult[]
  yearMonth?: string
  canUpdate: boolean
  confirming: boolean
  onConfirm: (pairs: ConfirmMatchPair[]) => void
  onBack: () => void
  onCancel: () => void
}

interface Selection {
  receiptIndex: number
  wageId: number | null
}

export default function BankReceiptMatchConfirm({
  matchResults,
  canUpdate,
  confirming,
  onConfirm,
  onBack,
  onCancel,
}: BankReceiptMatchConfirmProps) {
  const showToast = useToastStore(state => state.showToast)

  // 每回单的候选选择：wageId 为 null = 跳过
  const [selections, setSelections] = useState<Selection[]>(() =>
    matchResults.map((_, i) => ({ receiptIndex: i, wageId: null }))
  )

  const selectCandidate = useCallback((receiptIndex: number, wageId: number) => {
    setSelections(prev => prev.map(s =>
      s.receiptIndex === receiptIndex ? { ...s, wageId } : s
    ))
  }, [])

  const handleConfirm = useCallback(() => {
    // G2 B2: handler 守卫（渲染守卫已由父级控制，双保险）
    if (!canUpdate) {
      showToast('您没有登记发放的权限', 'error')
      return
    }
    const pairs: ConfirmMatchPair[] = []
    for (let i = 0; i < matchResults.length; i++) {
      const sel = selections.find(s => s.receiptIndex === i)
      const match = matchResults[i]
      if (!sel?.wageId) continue // 跳过：不发
      const candidate = match.candidates.find(c => c.wageId === sel.wageId)
      if (!candidate) continue
      pairs.push({
        wageId: candidate.wageId,
        paidAmount: match.amount ?? candidate.amount,
        paidDate: match.date || '',
        bankReceiptPath: match.receiptPath || '',
      })
    }
    onConfirm(pairs)
  }, [canUpdate, matchResults, selections, onConfirm, showToast])

  const columns = [
    {
      key: 'receipt',
      title: '回单',
      render: (item: any) => (
        <div>
          <p className="font-medium">{item.date || '日期未知'}</p>
          <p className="text-xs text-[color:var(--muted)]">{item.receiptPath?.split('/').pop() || '-'}</p>
          {item.counterparty && <p className="text-xs text-[color:var(--fg-2)]">对方: {item.counterparty}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      title: '回单金额',
      render: (item: any) => (
        <span className="font-medium text-[color:var(--fg)] font-mono tabular-nums">
          ¥{(item.amount ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'candidates',
      title: '候选匹配（按分数排序）',
      render: (item: any, rowIndex: number) => {
        if (item.candidates.length === 0) {
          return <span className="text-[color:var(--muted)] text-sm">无候选</span>
        }
        return (
          <div className="space-y-2">
            {item.candidates.map((c: any) => (
              <label
                key={c.wageId}
                className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer text-sm ${
                  selections.find(s => s.receiptIndex === rowIndex)?.wageId === c.wageId
                    ? 'border-[color:var(--accent)] bg-[color:var(--panel-2)]'
                    : 'border-[color:var(--border)] hover:bg-[color:var(--panel-2)]'
                }`}
              >
                <input
                  type="radio"
                  name={`receipt-${rowIndex}`}
                  checked={selections.find(s => s.receiptIndex === rowIndex)?.wageId === c.wageId}
                  onChange={() => selectCandidate(rowIndex, c.wageId)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[color:var(--fg)]">{c.workerName || '未命名'}</span>
                    <span className="text-xs text-[color:var(--fg-2)]">{c.yearMonth || '-'}</span>
                    <span className="text-success-600 font-mono text-xs">¥{(c.amount ?? 0).toFixed(2)}</span>
                    <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-[color:var(--panel-2)] text-[color:var(--accent)] font-medium">
                      分数 {c.score}
                    </span>
                  </div>
                  {c.reasons?.length > 0 && (
                    <p className="text-xs text-[color:var(--fg-2)] mt-0.5">{c.reasons.join('；')}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )
      },
    },
  ]

  const dataWithIndex = matchResults.map((m, i) => ({ ...m, _index: i }))
  const confirmedCount = selections.filter(s => s.wageId !== null).length

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

      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--fg-2)]">
          共 {matchResults.length} 张回单，已选 {confirmedCount} 条配对（未选 = 跳过）
        </span>
      </div>

      <DataTable
        data={dataWithIndex}
        columns={columns as any}
        rowKey={(item: any) => `${item._index}`}
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
        {canUpdate && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="px-6 py-2 text-sm font-medium text-[color:var(--on-accent)] bg-[color:var(--accent)] rounded-md hover:opacity-90 disabled:bg-[color:var(--muted)]"
          >
            {confirming ? '确认中...' : `确认并提交（${confirmedCount}）`}
          </button>
        )}
      </div>
    </div>
  )
}
