// ContractKanban.tsx — S13 合同看板三列 Kanban（Stitch Bedrock）
// 列映射：签署中(draft/pending) / 执行中(active) / 近期完成(expired/terminated/archived)
// 拖拽换列 → updateContract 更新 status（HTML5 DnD，无新依赖）

import { useMemo, useState } from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '../../../utils/format'
import { getStatusLabel, type Contract } from './contractConfig'

interface ContractKanbanProps {
  contracts: Contract[]
  /** 拖拽落列后更新状态；resolve 后由父级 loadData 刷新 */
  onStatusChange: (contract: Contract, newStatus: string) => Promise<void>
  onCardClick?: (contract: Contract) => void
  /** 无 contracts:edit 权限时禁用拖拽 */
  canEdit?: boolean
}

interface KanbanColumn {
  key: string
  title: string
  /** 列头色点（语义色 token） */
  dotColor: string
  /** 命中该列的 status 值 */
  statuses: string[]
  /** 拖入该列时写入的 status */
  dropStatus: string
}

const COLUMNS: KanbanColumn[] = [
  { key: 'signing', title: '签署中', dotColor: 'var(--warning)', statuses: ['draft', 'pending'], dropStatus: 'pending' },
  { key: 'active', title: '执行中', dotColor: 'var(--accent)', statuses: ['active'], dropStatus: 'active' },
  { key: 'done', title: '近期完成', dotColor: 'var(--success)', statuses: ['expired', 'terminated', 'archived'], dropStatus: 'archived' },
]

export function ContractKanban({ contracts, onStatusChange, onCardClick, canEdit = true }: ContractKanbanProps) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map: Record<string, Contract[]> = {}
    for (const col of COLUMNS) map[col.key] = []
    for (const c of contracts) {
      const col = COLUMNS.find(k => k.statuses.includes(c.status || 'draft')) || COLUMNS[0]
      map[col.key].push(c)
    }
    return map
  }, [contracts])

  const handleDrop = async (col: KanbanColumn) => {
    setOverCol(null)
    if (dragId == null) return
    const contract = contracts.find(c => c.id === dragId)
    setDragId(null)
    if (!contract || col.statuses.includes(contract.status || 'draft')) return
    await onStatusChange(contract, col.dropStatus)
  }

  return (
    <div className="flex gap-4 min-h-[420px] items-stretch">
      {COLUMNS.map(col => (
        <div
          key={col.key}
          onDragOver={e => { if (canEdit) { e.preventDefault(); setOverCol(col.key) } }}
          onDragLeave={() => setOverCol(prev => (prev === col.key ? null : prev))}
          onDrop={() => handleDrop(col)}
          className={`flex-1 flex flex-col rounded-2xl border p-2 overflow-hidden transition-colors ${
            overCol === col.key ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)] bg-[color:var(--panel-2)]'
          }`}
        >
          {/* 列头：色点 + 标题 + mono 计数徽章（S13） */}
          <div className="flex items-center justify-between mb-2 px-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: col.dotColor }} />
              <span className="text-sm font-semibold text-[color:var(--fg)]">{col.title}</span>
            </div>
            <span className="text-xs font-mono tabular-nums text-[color:var(--muted)] bg-[color:var(--card)] border border-[color:var(--border)] px-2 rounded-full">
              {grouped[col.key].length}
            </span>
          </div>

          {/* 卡片列（S13：rounded-[9px] + hairline 分隔 + mono 读数） */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {grouped[col.key].map(c => (
              <div
                key={c.id}
                draggable={canEdit}
                onDragStart={() => setDragId(c.id)}
                onDragEnd={() => { setDragId(null); setOverCol(null) }}
                onClick={() => onCardClick?.(c)}
                className={`bg-[color:var(--card)] border border-[color:var(--border)] rounded-[9px] p-3 hover:shadow-sm transition-shadow ${
                  canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${dragId === c.id ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-sm font-semibold text-[color:var(--fg)] leading-tight pr-3">{c.name}</span>
                  <Icon name="GripVertical" size={14} className="text-[color:var(--border-strong)] flex-shrink-0 mt-0.5" />
                </div>
                <div className="text-caption font-bold uppercase tracking-wider text-[color:var(--muted)] font-mono mb-2">
                  {c.contractNo || '—'}
                </div>
                <div className="space-y-1 border-t border-[color:var(--border)] pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[color:var(--muted)]">金额</span>
                    <span className="font-mono tabular-nums text-[color:var(--fg)]">¥{formatMoney(c.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[color:var(--muted)]">到期</span>
                    <span className="font-mono tabular-nums text-[color:var(--fg-2)]">{c.endDate || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[color:var(--muted)]">状态</span>
                    <span className="text-[color:var(--fg-2)]">{getStatusLabel(c.status || 'draft')}</span>
                  </div>
                </div>
              </div>
            ))}
            {grouped[col.key].length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs text-[color:var(--muted)] border border-dashed border-[color:var(--border)] rounded-[9px]">
                {canEdit ? '拖拽合同到此列' : '暂无合同'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ContractKanban
