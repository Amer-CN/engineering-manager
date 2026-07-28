import { Icon } from '../../ui/Icon'

interface TimelineProject {
  name: string
  startDate: string
  endDate: string
  status: string
  budget: number
}

interface ProjectTimelineProps {
  projects: TimelineProject[]
}

const statusColors: Record<string, { bar: string; dot: string; label: string }> = {
  planning: { bar: 'bg-[color:var(--muted)]', dot: 'bg-[color:var(--muted)]', label: '筹备中' },
  in_progress: { bar: 'bg-[color:var(--success)]', dot: 'bg-[color:var(--success)]', label: '进行中' },
  completed: { bar: 'bg-[color:var(--accent)]', dot: 'bg-[color:var(--accent)]', label: '已完成' },
  archived: { bar: 'bg-[color:var(--muted)]', dot: 'bg-[color:var(--muted)]', label: '已归档' },
}

export function ProjectTimeline({ projects }: ProjectTimelineProps) {
  if (projects.length === 0) return null

  // 解析所有日期，确定时间范围
  const dates = projects.flatMap(p => {
    const s = p.startDate ? new Date(p.startDate) : null
    const e = p.endDate ? new Date(p.endDate) : null
    return [s, e].filter((d): d is Date => d !== null && !isNaN(d.getTime()))
  })
  if (dates.length === 0) return null

  const minTime = Math.min(...dates.map(d => d.getTime()))
  const maxTime = Math.max(...dates.map(d => d.getTime()))
  const totalSpan = Math.max(1, maxTime - minTime)

  // 生成月份刻度
  const months: { label: string; ratio: number }[] = []
  const startYear = new Date(minTime).getFullYear()
  const startMonth = new Date(minTime).getMonth()
  const endYear = new Date(maxTime).getFullYear()
  const endMonth = new Date(maxTime).getMonth()
  for (let y = startYear; y <= endYear; y++) {
    const mStart = y === startYear ? startMonth : 0
    const mEnd = y === endYear ? endMonth : 11
    for (let m = mStart; m <= mEnd; m++) {
      const d = new Date(y, m, 1)
      const ratio = (d.getTime() - minTime) / totalSpan
      const label = `${y}-${String(m + 1).padStart(2, '0')}`
      if (!months.find(x => x.label === label)) {
        months.push({ label, ratio: Math.max(0, Math.min(1, ratio)) })
      }
    }
  }

  // 按开始日期排序，最多8个
  const sorted = [...projects]
    .filter(p => p.startDate && p.endDate)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 8)

  if (sorted.length === 0) return null

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm overflow-hidden mb-6">
      {/* 卡片头部 */}
      <div className="px-5 py-4 border-b border-[color:var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[color:var(--fg-2)] flex items-center gap-2">
          <Icon name="Calendar" size={14} className="text-[color:var(--muted)]" />
          项目时间线
        </h3>
        <div className="flex items-center gap-3 text-caption text-[color:var(--muted)]">
          {Object.entries(statusColors).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${val.dot}`} />
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* 时间线主体 */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {/* 月份刻度行 */}
          <div className="flex border-b border-[color:var(--border)]">
            <div className="w-[160px] flex-shrink-0 px-5 py-2 bg-[color:var(--panel-2)] border-r border-[color:var(--border)]">
              <span className="text-caption text-[color:var(--muted)] font-medium">项目名称</span>
            </div>
            <div className="flex-1 relative h-8 bg-[color:var(--panel-2)]">
              {months.map((m, i) => (
                <span key={i} className="absolute text-caption text-[color:var(--muted)] top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${m.ratio * 100}%` }}>
                  {m.label}
                </span>
              ))}
              {/* 垂直网格线 */}
              <div className="absolute inset-0 flex pointer-events-none">
                {months.map((m, i) => (
                  i > 0 && <div key={i} className="border-l border-[color:var(--border)]" style={{ position: 'absolute', left: `${m.ratio * 100}%`, top: 0, bottom: 0 }} />
                ))}
              </div>
            </div>
          </div>

          {/* 项目行 */}
          {sorted.map((p, i) => {
            const start = new Date(p.startDate)
            const end = new Date(p.endDate)
            const startRatio = (start.getTime() - minTime) / totalSpan
            const endRatio = (end.getTime() - minTime) / totalSpan
            const left = Math.max(0, startRatio * 100)
            const width = Math.max(2, (endRatio - startRatio) * 100)
            const colors = statusColors[p.status] || statusColors.planning

            return (
              <div key={i} className={`flex border-b border-[color:var(--border)] hover:bg-[color:var(--panel-2)]/50 transition-colors ${i === sorted.length - 1 ? 'border-b-0' : ''}`}>
                <div className="w-[160px] flex-shrink-0 px-5 py-3 border-r border-[color:var(--border)] flex flex-col justify-center">
                  <span className="text-xs font-medium text-[color:var(--fg-2)] truncate">{p.name}</span>
                  <span className="text-caption text-[color:var(--muted)]">{p.budget > 0 ? `¥${(p.budget / 10000).toFixed(1)}万` : ''}</span>
                </div>
                <div className="flex-1 relative h-12">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-full ${colors.bar} opacity-90`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${p.startDate} 至 ${p.endDate}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
