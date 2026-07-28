
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

export interface SettlementProjectSummary {
  projectId: number
  projectName: string
  totalCount: number
  pendingCount: number
  completedCount: number
  archivedCount: number
  totalAmount: number
  incomeAmount: number
  expenseAmount: number
  latestDate: string
}

interface SettlementProjectCardProps {
  data: SettlementProjectSummary
  onClick: (projectId: number) => void
}

export function SettlementProjectCard({ data, onClick }: SettlementProjectCardProps) {
  return (
    <div
      onClick={() => onClick(data.projectId)}
      className="flex items-center gap-6 rounded-xl px-5 py-4 transition-all duration-200 cursor-pointer group hover:shadow-lift hover:-translate-y-0.5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {/* Project name + latest date */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
          {data.projectName}
        </h3>
        {data.latestDate && (
          <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--muted)' }}>最近结算：{data.latestDate}</p>
        )}
      </div>

      {/* Income amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>收入结算</p>
        <p className="text-sm font-semibold font-mono tabular-nums" style={{ color: 'var(--fg)' }}>
          ¥{formatMoney(data.incomeAmount)}
        </p>
      </div>

      {/* Expense amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>支出结算</p>
        <p className="text-sm font-semibold font-mono tabular-nums" style={{ color: 'var(--fg)' }}>
          ¥{formatMoney(data.expenseAmount)}
        </p>
      </div>

      {/* Settlement count + pending */}
      <div className="flex-shrink-0 w-20 text-center">
        <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fg-2)' }}>{data.totalCount} 笔</p>
        {data.pendingCount > 0 && (
          <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--warning)' }}>{data.pendingCount} 笔待办</p>
        )}
      </div>

      {/* Arrow */}
      <Icon name="ChevronRight" size={16} className="flex-shrink-0 text-[color:var(--border-strong)] group-hover:text-[color:var(--muted)] transition-colors" />
    </div>
  )
}

export default SettlementProjectCard
