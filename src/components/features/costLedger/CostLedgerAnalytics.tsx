import { useState, useEffect, useMemo } from 'react'
import { EditorialDonut } from '@/components/ui/charts/EditorialDonut'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'
import { DotCascade } from '@/components/ui/charts/DotCascade'
import Spinner from '../../ui/Spinner'
import { formatMoney } from '@/utils/format'
import { getCategoryLabel, getCategoryColor } from './config'
import { ANALYTICS_FALLBACK_PALETTE } from './costLedgerColors'
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

    // 支出最高月（结论式标题用，可从数据直接验证）
    let topExpense: { month: string; value: number } | null = null
    for (const t of trendData) {
      const v = t['支出'] || 0
      if (!topExpense || v > topExpense.value) topExpense = { month: t.month, value: v }
    }

    // Top counterparties
    const topCounterparties = Object.entries(byCounterparty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    return { totalExpense, totalIncome, pieData, trendData, topExpense, topCounterparties, count: entries.length }
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
        {/* Category Donut — 编辑风多段圆环（手写 SVG，无 recharts） */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">支出分类占比</h3>
          {stats.pieData.length > 0 ? (
            <EditorialDonut
              data={stats.pieData.map((d: { code: string; name: string; value: number }, i) => ({
                name: d.name,
                value: d.value,
                color: getCategoryColor(d.code, categories as Parameters<typeof getCategoryColor>[1]) || ANALYTICS_FALLBACK_PALETTE[i % ANALYTICS_FALLBACK_PALETTE.length],
              }))}
              formatValue={(v) => formatMoney(v)}
              formatTotal={(v) => formatMoney(v).replace('元', '')}
              centerLabel="支出合计"
              size={180}
            />
          ) : (
            <p className="text-sm text-[color:var(--muted)]">无支出数据</p>
          )}
        </div>

        {/* Monthly Trend — 点阵级联（一列 = 一个月，点串按支出升序攀升，一点 = 固定金额；收入序列本期不上图） */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--fg-2)] mb-4">
            {stats.topExpense && stats.topExpense.value > 0
              ? `${stats.topExpense.month}支出最高 · 达 ¥${formatMoney(stats.topExpense.value)}`
              : '月度支出趋势'}
          </h3>
          {stats.trendData.length > 0 ? (
            <DotCascade
              data={stats.trendData.map((d) => ({ name: d.month, value: d['支出'] || 0 }))}
              formatValue={(v) => (v >= 10000 ? `¥${parseFloat((v / 10000).toFixed(1))}万` : `¥${formatMoney(v)}`)}
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
          {/* 编辑风横向条形：TOP10 全量保留（组件行高自适应，不截断）；原迷你条编码的
              「占总支出比」并入条尾文本诚实保留；条长基准 = TOP1 满条（EditorialBars 契约） */}
          <EditorialBars
            data={stats.topCounterparties.map(([name, amt]) => ({ name, value: amt }))}
            formatValue={(v) => {
              const pct = stats.totalExpense > 0 ? Math.round((v / stats.totalExpense) * 100) : 0
              return `¥${formatMoney(v)} · ${pct}%`
            }}
          />
        </div>
      )}
    </div>
  )
}