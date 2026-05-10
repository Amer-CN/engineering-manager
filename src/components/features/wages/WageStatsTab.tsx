import React from 'react'
import type { WageStats } from '@/types'
import { Icon } from '../../ui/Icon'

interface WageStatsTabProps {
  wageStats: WageStats | null
}

export default function WageStatsTab({ wageStats }: WageStatsTabProps) {
  return (
    <div>
      {!wageStats || wageStats.count === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          <Icon name="BarChart3" size={48} className="mx-auto mb-4" />
          <p>暂无统计数据</p>
          <p className="text-sm mt-1">生成工资记录后将在此显示统计</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-blue-600">¥{wageStats.totalWage.toFixed(0)}</div>
              <div className="text-sm text-slate-500 mt-1">工资总额</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-indigo-600">¥{wageStats.staffWage.toFixed(0)}</div>
              <div className="text-sm text-slate-500 mt-1">管理人员工资</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-orange-600">¥{wageStats.workerWage.toFixed(0)}</div>
              <div className="text-sm text-slate-500 mt-1">工人工资</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-green-600">{wageStats.count}</div>
              <div className="text-sm text-slate-500 mt-1">记录条数</div>
            </div>
          </div>

          {wageStats.projectBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-medium text-slate-700 mb-4">项目工资分布</h3>
              <div className="space-y-3">
                {wageStats.projectBreakdown.map(p => (
                  <div key={p.projectId} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-24 truncate">{p.projectName}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.max(p.percentage, 2)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-20 text-right">¥{p.total.toFixed(0)}</span>
                    <span className="text-xs text-slate-400 w-12 text-right">{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
