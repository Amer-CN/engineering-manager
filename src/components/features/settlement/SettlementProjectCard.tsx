import React from 'react'
import { Settlement as SettlementData } from '../../../types/electron'
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
      className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      {/* Project name + latest date */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">
          {data.projectName}
        </h3>
        {data.latestDate && (
          <p className="text-xs text-slate-400 mt-0.5">最近结算：{data.latestDate}</p>
        )}
      </div>

      {/* Income amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-xs text-slate-400 mb-0.5">收入结算</p>
        <p className="text-sm font-semibold text-emerald-600">
          ¥{formatMoney(data.incomeAmount)}
        </p>
      </div>

      {/* Expense amount */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-xs text-slate-400 mb-0.5">支出结算</p>
        <p className="text-sm font-semibold text-red-500">
          ¥{formatMoney(data.expenseAmount)}
        </p>
      </div>

      {/* Settlement count + pending */}
      <div className="flex-shrink-0 w-20 text-center">
        <p className="text-sm font-semibold text-slate-700">{data.totalCount} 笔</p>
        {data.pendingCount > 0 && (
          <p className="text-xs text-amber-500 mt-0.5">{data.pendingCount} 笔待办</p>
        )}
      </div>

      {/* Arrow */}
      <Icon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </div>
  )
}

export default SettlementProjectCard
