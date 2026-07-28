/**
 * BankReceiptMatchConfirm 表格列定义 + 置信度辅助函数
 *
 * 提取自 BankReceiptMatchConfirm.tsx，用于减少主文件行数
 */
import { type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/Badge/Badge'
import type { BankReceiptMatch } from '@/types'

type BankReceiptMatchWithIndex = BankReceiptMatch & { _index: number }

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return 'text-success-600 bg-success-50'
  if (confidence >= 60) return 'text-warning-600 bg-warning-50'
  return 'text-danger-600 bg-danger-50'
}

function getStatusBadge(status: string) {
  const variantMap: Record<string, 'success' | 'danger' | 'warning' | 'gray'> = {
    matched: 'success',
    unmatched: 'danger',
    ambiguous: 'warning',
    archived: 'gray',
  }
  const labels: Record<string, string> = {
    matched: '已匹配',
    unmatched: '未匹配',
    ambiguous: '待确认',
    archived: '已归档',
  }
  return (
    <Badge variant={variantMap[status] ?? 'gray'} size="sm" rounded="full">
      {labels[status] || status}
    </Badge>
  )
}

export function getMatchColumns(
  workers: { id: number; name: string }[],
  wageRecords: { id: number; memberName?: string; actualWage: number; yearMonth: string }[],
  handleWorkerChange: (index: number, workerId: number | null, workerName: string | null) => void,
  handleWageChange: (index: number, wageId: number | null) => void,
): Column<BankReceiptMatchWithIndex>[] {
  return [
    { key: 'receiptPath', title: '回单信息', render: (item) => (
      <div>
        <p className="font-medium">{item.parsedDate || '日期未知'}</p>
        <p className="text-xs text-[color:var(--muted)]">{item.receiptPath.split('/').pop()}</p>
      </div>
    )},
    { key: 'parsedName', title: '解析姓名', render: (item) => (
      <span className={item.parsedName ? 'text-[color:var(--fg)]' : 'text-[color:var(--muted)]'}>
        {item.parsedName || '未识别'}
      </span>
    )},
    { key: 'parsedAmount', title: '解析金额', render: (item) => (
      <span className="font-medium text-[color:var(--fg)]">¥{item.parsedAmount.toFixed(2)}</span>
    )},
    { key: 'matchedWorkerId', title: '匹配工人', render: (item) => (
      <select
        value={item.matchedWorkerId || ''}
        onChange={(e) => {
          const selectedId = e.target.value ? parseInt(e.target.value) : null
          const selectedWorker = workers.find(w => w.id === selectedId)
          handleWorkerChange(item._index, selectedId, selectedWorker?.name || null)
        }}
        className="block w-full px-3 py-2 border border-[color:var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
        disabled={item.status === 'archived'}
      >
        <option value="">-- 未匹配 --</option>
        {workers.map(worker => (
          <option key={worker.id} value={worker.id}>
            {worker.name}
          </option>
        ))}
      </select>
    )},
    { key: 'matchedWageId', title: '匹配工资记录', render: (item) => (
      <select
        value={item.matchedWageId || ''}
        onChange={(e) => {
          const selectedId = e.target.value ? parseInt(e.target.value) : null
          handleWageChange(item._index, selectedId)
        }}
        className="block w-full px-3 py-2 border border-[color:var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
        disabled={item.status === 'archived' || !item.matchedWorkerId}
      >
        <option value="">-- 未匹配 --</option>
        {wageRecords
          .filter(w => !item.matchedWorkerId || w.memberName === item.matchedWorkerName)
          .map(w => (
            <option key={w.id} value={w.id}>
              {w.yearMonth} - ¥{w.actualWage.toFixed(2)}
            </option>
          ))}
      </select>
    )},
    { key: 'confidence', title: '置信度', render: (item) => (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(item.confidence)}`}>
        {item.confidence}%
      </span>
    )},
    { key: 'status', title: '状态', render: (item) => getStatusBadge(item.status) },
  ]
}
