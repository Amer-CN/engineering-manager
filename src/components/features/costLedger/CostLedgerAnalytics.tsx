import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { SimpleGroupedBarChart } from '../../ui/SimpleBarChart'
import Spinner from '../../ui/Spinner'
import { formatMoney } from '@/utils/format'
import { getCategoryLabel, getCategoryColor } from './config'
import { ANALYTICS_FALLBACK_PALETTE, ANALYTICS_BAR_COLORS } from './costLedgerColors'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'


interface CostLedgerAnalyticsProps {
  projectId: number
  projectName?: string
  categories?: CostLedgerCategory[]
}

export function CostLedgerAnalytics({ projectId, projectName, categories }: CostLedgerAnalyticsProps) {
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const api = await getAPI()
      if (!api?.getCostLedger) { setLoading(false); return }
      api.getCostLedger(projectId).then((res: { success: boolean; data?: CostLedgerEntry[] }) => {
        if (res?.success) setEntries(res.data || [])
      }).catch((err: unknown) => {
        console.error('[CostLedgerAnalytics] 加载失败:', err)
      }).finally(() => {
        setLoading(false)
      })
    })()
  }, [projectId])

  const stats = useMemo(() => {
    let totalExpense = 0, totalIncome = 0
    const byCategory: Record<string, number> = {}
    const byMonth: Record<string, { expense: number; income: number }> = {}
    const byCounterparty: Record<string, number> = {}

    for (const e of entries) {
      if (!e.amount) continue
      if (e.direction === 'expense') {
        totalExpense += e.amount
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
        byCounterparty[e.counterparty] = (byCounterparty[e.counterparty] || 0) + e.amount
      } else {
        totalIncome += e.amount
      }
      // Monthly grouping
      const month = e.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { expense: 0, income: 0 }
      if (e.direction === 'expense') byMonth[month].expense += e.amount
      else byMonth[month].income += e.amount
    }

    // Category pie data
    const pieData = Object.entries(byCategory)
      .map(([cat, amt]) => ({ name: getCategoryLabel(cat, categories), value: amt, code: cat }))
      .sort((a, b) => b.value - a.value)

    // Monthly trend (sorted by month, last 12)
    const trendData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, v]) => ({ month: m.slice(5) + '月', 支出: v.expense, 收入: v.income }))

    // Top counterparties
    const topCounterparties = Object.entries(byCounterparty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    return { totalExpense, totalIncome, pieData, trendData, topCounterparties, count: entries.length }
  }, [entries])

  if (loading) {
    return <Spinner size="md" />
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[color:var(--muted)]">
        <p className="text-lg">暂无成本台账数据</p>
        <p className="mt-1 text-sm">请先在侧边栏"成本台账"中录入数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-danger-100 bg-[color:var(--danger-soft)] p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-danger-400">经营支出</div>
          <div className="mt-2 font-mono text-numeric-xl tabular-nums tracking-tight text-danger-600">{formatMoney(stats.totalExpense)}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">{stats.count} 条记录</div>
        </div>
        <div className="rounded-xl border border-success-100 bg-[color:var(--success-soft)] p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-success-400">资金收入</div>
          <div className="mt-2 font-mono text-numeric-xl tabular-nums tracking-tight text-success-600">{formatMoney(stats.totalIncome)}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">股东投资 + 融资 + 垫资回收</div>
        </div>
        <div className={`rounded-xl border p-5 ${stats.totalIncome - stats.totalExpense >= 0 ? 'bg-[color:var(--success-soft)] border-success-100' : 'bg-[color:var(--danger-soft)] border-danger-100'}`}>
          <div className="text-xs font-medium uppercase tracking-wider text-[color:var(--muted)]">净{stats.totalIncome - stats.totalExpense >= 0 ? '流入' : '流出'}</div>
          <div className={`mt-2 font-mono text-numeric-xl tabular-nums tracking-tight ${stats.totalIncome - stats.totalExpense >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatMoney(stats.totalIncome - stats.totalExpense)}
          </div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">
            {stats.totalExpense > 0 ? `收支比 ${((stats.totalIncome / stats.totalExpense) * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">支出分类占比</h3>
          {stats.pieData.length > 0 ? (
            <div className="flex items-start gap-4">
              <div style={{ width: 180, height: 180 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {stats.pieData.map((d: { code: string; name: string; value: number }, i) => (
                        <Cell key={i} fill={getCategoryColor(d.code, categories as Parameters<typeof getCategoryColor>[1]) || ANALYTICS_FALLBACK_PALETTE[i % ANALYTICS_FALLBACK_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)', color: 'var(--fg)' }} formatter={((v: number) => formatMoney(v ?? 0)) as never} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {stats.pieData.map((d: { code: string; name: string; value: number }, i) => (
                  <div key={d.code} className="flex items-start justify-between text-xs">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="h-2 w-2 shrink-0 rounded-full mt-1" style={{ backgroundColor: getCategoryColor(d.code, categories as Parameters<typeof getCategoryColor>[1]) || ANALYTICS_FALLBACK_PALETTE[i % ANALYTICS_FALLBACK_PALETTE.length] }} />
                      <span className="flex-1 min-w-0">
                        <span className="text-[color:var(--fg-2)] line-clamp-2 leading-tight">{d.name}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[color:var(--muted)] ml-2 shrink-0">{formatMoney(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--muted)]">无支出数据</p>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">月度收支趋势</h3>
          {stats.trendData.length > 0 ? (
            <SimpleGroupedBarChart
              data={stats.trendData.map((d: Record<string, number | string>) => ({
                name: String(d.month),
                values: [
                  { label: '支出', amount: Number(d['支出']) || 0, color: ANALYTICS_BAR_COLORS.expense },
                  { label: '收入', amount: Number(d['收入']) || 0, color: ANALYTICS_BAR_COLORS.income },
                ],
              }))}
              formatValue={(v) => formatMoney(v)}
            />
          ) : (
            <p className="text-sm text-[color:var(--muted)]">无月度数据</p>
          )}
        </div>
      </div>

      {/* Top Counterparties */}
      {stats.topCounterparties.length > 0 && (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-3">支出 TOP 10 往来方</h3>
          <div className="space-y-1.5">
            {stats.topCounterparties.map(([name, amt], i) => {
              const pct = stats.totalExpense > 0 ? (amt / stats.totalExpense) * 100 : 0
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-medium text-[color:var(--muted)]">#{i + 1}</span>
                  <span className="flex-1 text-sm text-[color:var(--fg-2)] truncate">{name}</span>
                  <span className="font-mono text-sm font-medium text-[color:var(--fg-2)]">{formatMoney(amt)}</span>
                  <div className="w-16 h-1.5 rounded-full bg-[color:var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full bg-danger-400" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}