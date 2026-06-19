import React from 'react'
import { Icon } from '../../ui/Icon'

interface PortfolioAnalysisProps {
  projects: Array<{
    status: string
    startDate?: string
    endDate?: string
    name: string
  }>
}

const statusLabels: Record<string, string> = {
  planning: '筹备中',
  in_progress: '进行中',
  completed: '已完成',
  archived: '已归档',
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500',
  in_progress: 'bg-emerald-500',
  completed: 'bg-slate-400',
  archived: 'bg-amber-500',
}

export function PortfolioAnalysis({ projects }: PortfolioAnalysisProps) {
  // 状态分布
  const statusCounts = {
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    planning: projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
  }
  const total = projects.length || 1

  // 近期里程碑（有结束日期的项目，按日期排序）
  const milestones = projects
    .filter(p => p.endDate)
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
    .slice(0, 4)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      {/* 状态分布 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">项目状态分布</h3>
        <div className="space-y-3">
          {Object.entries(statusCounts).map(([key, count]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{statusLabels[key]}</span>
                <span className="text-xs font-medium text-slate-700">{count} 个</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${statusColors[key]}`}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 近期里程碑 */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">近期里程碑</h3>
        {milestones.length > 0 ? (
          <div className="space-y-2">
            {milestones.map((p, i) => {
              const isCompleted = p.status === 'completed'
              const isArchived = p.status === 'archived'
              const color = isCompleted ? 'bg-slate-400' : isArchived ? 'bg-amber-500' : 'bg-emerald-500'
              const bgColor = isCompleted ? 'bg-slate-50 border-slate-100' : isArchived ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
              return (
                <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg border ${bgColor}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  </div>
                  <span className="text-caption text-slate-400 flex-shrink-0">{p.endDate}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">暂无里程碑数据</p>
        )}
      </div>
    </div>
  )
}
