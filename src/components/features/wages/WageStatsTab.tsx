import type { WageStats } from '@/types'
import { Icon } from '../../ui/Icon'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'
import { formatMoney } from '@/utils/format'

interface WageStatsTabProps {
  wageStats: WageStats | null
  selectedMonth?: string
}

export default function WageStatsTab({ wageStats, selectedMonth }: WageStatsTabProps) {
  // 条尾并入占比注记：percentage 为后端权威字段，按 total 映射还原
  // （占比是 total 的函数，同额同占比，映射无歧义）；原 2% 最小宽保底随 CSS 条移除
  const pctByTotal = new Map<number, number>(
    wageStats ? wageStats.projectBreakdown.map((p) => [p.total, p.percentage] as [number, number]) : [],
  )

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
              {/* 编辑风横向条形：项目工资额降序（冠军=工资最高项目，默认墨阶）；
                  占比注记并入条尾文本（原右侧百分比列信息保留） */}
              <EditorialBars
                data={[...wageStats.projectBreakdown]
                  .sort((a, b) => b.total - a.total)
                  .map((p) => ({ name: p.projectName, value: p.total }))}
                formatValue={(v) => `¥${formatMoney(v)} · ${pctByTotal.get(v) ?? 0}%`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
