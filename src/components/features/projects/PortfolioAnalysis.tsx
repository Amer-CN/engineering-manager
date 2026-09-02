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
  planning: 'bg-[color:var(--muted)]',
  in_progress: 'bg-success-500',
  completed: 'bg-[color:var(--muted)]',
  archived: 'bg-warning-500',
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
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">项目状态分布</h3>
        <div className="space-y-3">
          {Object.entries(statusCounts).map(([key, count]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[color:var(--muted)]">{statusLabels[key]}</span>
                <span className="text-xs font-medium text-[color:var(--fg-2)]">{count} 个</span>
              </div>
              <div className="h-2.5 bg-[color:var(--panel-2)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-transform duration-700 ${statusColors[key]}`}
                  style={{ transformOrigin: 'left', width: '100%', transform: `scaleX(${count / total})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 近期里程碑 */}
      <div className="lg:col-span-2 bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">近期里程碑</h3>
        {milestones.length > 0 ? (
          <div className="space-y-2">
            {milestones.map((p, i) => {
              const isCompleted = p.status === 'completed'
              const isArchived = p.status === 'archived'
              const color = isCompleted ? 'bg-[color:var(--muted)]' : isArchived ? 'bg-warning-500' : 'bg-success-500'
              const bgColor = isCompleted ? 'bg-[color:var(--panel-2)] border-[color:var(--border)]' : isArchived ? 'bg-warning-50 border-warning-100' : 'bg-success-50 border-success-100'
              return (
                <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg border ${bgColor}`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[color:var(--fg-2)] truncate">{p.name}</p>
                  </div>
                  <span className="text-caption text-[color:var(--muted)] flex-shrink-0">{p.endDate}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[color:var(--muted)] text-center py-6">暂无里程碑数据</p>
        )}
      </div>
    </div>
  )
}
