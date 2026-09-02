import type { WageStats } from '@/types'
import { Icon } from '../../ui/Icon'

interface WageStatsTabProps {
  wageStats: WageStats | null
  selectedMonth?: string
}

export default function WageStatsTab({ wageStats, selectedMonth }: WageStatsTabProps) {
  return (
    <div>
      {!wageStats || wageStats.count === 0 ? (
        <div className="text-center py-12 text-[color:var(--muted)] bg-[color:var(--card)] rounded-xl border border-[color:var(--border)]">
          <Icon name="BarChart3" size={48} className="mx-auto mb-4" />
          <p>暂无统计数据</p>
          <p className="text-sm mt-1">生成工资记录后将在此显示统计</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] p-5 text-center shadow-sm">
              <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-warning-600">¥{wageStats.totalWage.toFixed(0)}</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">{selectedMonth ? `${selectedMonth} 工资总额` : '工资总额'}</div>
            </div>
            <div className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] p-5 text-center shadow-sm">
              <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-600">{wageStats.count}</div>
              <div className="text-sm text-[color:var(--muted)] mt-1">{selectedMonth ? `${selectedMonth} 记录条数` : '记录条数'}</div>
            </div>
          </div>

          {wageStats.projectBreakdown.length > 0 && (
            <div className="bg-[color:var(--card)] rounded-xl border border-[color:var(--border)] p-5 shadow-sm">
              <h3 className="font-medium text-[color:var(--fg-2)] mb-4">项目工资分布</h3>
              <div className="space-y-3">
                {wageStats.projectBreakdown.map(p => (
                  <div key={p.projectId} className="flex items-center gap-3">
                    <span className="text-sm text-[color:var(--fg-2)] w-24 truncate">{p.projectName}</span>
                    <div className="flex-1 bg-[color:var(--panel-2)] rounded-full h-5 overflow-hidden">
                      <div className="bg-[color:var(--accent)] h-full rounded-full transition-[width]"
                        style={{ width: `${Math.max(p.percentage, 2)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-[color:var(--fg-2)] w-20 text-right font-mono tabular-nums">¥{p.total.toFixed(0)}</span>
                    <span className="text-xs text-[color:var(--muted)] w-12 text-right">{p.percentage}%</span>
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
