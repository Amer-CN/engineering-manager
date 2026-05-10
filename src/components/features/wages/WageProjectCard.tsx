import React from 'react'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

export interface WageProjectData {
  projectId: number
  projectName: string
  totalWages: number
  recordCount: number
  latestMonth: string
  currentMonthWages: number
  currentMonthCount: number
}

interface WageProjectCardProps {
  data: WageProjectData
  selectedMonth: string
  onClick: (projectId: number) => void
}

export function WageProjectCard({ data, selectedMonth, onClick }: WageProjectCardProps) {
  return (
    <div
      onClick={() => onClick(data.projectId)}
      className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      {/* Project name */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 transition-colors truncate">
          {data.projectName}
        </h3>
        {data.latestMonth && (
          <p className="text-xs text-slate-400 mt-0.5">最近工资：{data.latestMonth}</p>
        )}
      </div>

      {/* Current month wages */}
      <div className="text-right flex-shrink-0 w-32">
        <p className="text-xs text-slate-400 mb-0.5">{selectedMonth}</p>
        <p className="text-sm font-semibold text-slate-700">
          ¥{formatMoney(data.currentMonthWages)}
        </p>
      </div>

      {/* Total wages */}
      <div className="text-right flex-shrink-0 w-28">
        <p className="text-xs text-slate-400 mb-0.5">累计</p>
        <p className="text-sm font-semibold text-slate-700">
          ¥{formatMoney(data.totalWages)}
        </p>
      </div>

      {/* Record count */}
      <div className="flex-shrink-0 w-14 text-center">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
          {data.recordCount}条
        </span>
      </div>

      {/* Arrow */}
      <Icon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </div>
  )
}
