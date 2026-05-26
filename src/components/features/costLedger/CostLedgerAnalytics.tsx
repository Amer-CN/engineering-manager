import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/utils/format'
import { getCategoryLabel, getCategoryColor } from './config'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

const FALLBACK_COLORS = ['#f97316','#3b82f6','#8b5cf6','#6b7280','#ec4899','#ef4444','#14b8a6','#a855f7','#9ca3af','#0891b2','#2563eb','#059669']

interface CostLedgerAnalyticsProps {
  projectId: number
  projectName?: string
  categories?: CostLedgerCategory[]
}

export function CostLedgerAnalytics({ projectId, projectName, categories }: CostLedgerAnalyticsProps) {
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.getCostLedger) return
    api.getCostLedger(projectId).then((res: any) => {
      if (res?.success) setEntries(res.data || [])
      setLoading(false)
    })
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-lg">暂无成本台账数据</p>
        <p className="mt-1 text-sm">请先在侧边栏"成本台账"中录入数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-red-400">经营支出</div>
          <div className="mt-2 font-mono text-2xl font-bold text-red-600">{formatMoney(stats.totalExpense)}</div>
          <div className="mt-1 text-xs text-slate-400">{stats.count} 条记录</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-emerald-400">资金收入</div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-600">{formatMoney(stats.totalIncome)}</div>
          <div className="mt-1 text-xs text-slate-400">股东投资 + 融资 + 垫资回收</div>
        </div>
        <div className={`rounded-xl border p-5 bg-gradient-to-br ${stats.totalIncome - stats.totalExpense >= 0 ? 'from-emerald-50 to-white border-emerald-100' : 'from-red-50 to-white border-red-100'}`}>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400">净{stats.totalIncome - stats.totalExpense >= 0 ? '流入' : '流出'}</div>
          <div className={`mt-2 font-mono text-2xl font-bold ${stats.totalIncome - stats.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMoney(stats.totalIncome - stats.totalExpense)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {stats.totalExpense > 0 ? `收支比 ${((stats.totalIncome / stats.totalExpense) * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">支出分类占比</h3>
          {stats.pieData.length > 0 ? (
            <div className="flex items-start gap-4">
              <div style={{ width: 180, height: 180 }} className="shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {stats.pieData.map((d: any, i) => (
                        <Cell key={i} fill={getCategoryColor(d.code, categories as any) || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={((v: any) => formatMoney(v ?? 0)) as any} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                {stats.pieData.map((d: any, i) => (
                  <div key={d.code} className="flex items-start justify-between text-xs">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="h-2 w-2 shrink-0 rounded-full mt-1" style={{ backgroundColor: getCategoryColor(d.code, categories as any) || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
                      <span className="flex-1 min-w-0">
                        <span className="text-slate-600 line-clamp-2 leading-tight">{d.name}</span>
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 ml-2 shrink-0">{formatMoney(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">无支出数据</p>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">月度收支趋势</h3>
          {stats.trendData.length > 0 ? (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trendData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 10000 ? `${(v/10000).toFixed(0)}万` : String(v)} />
                  <Tooltip formatter={((v: any) => formatMoney(v ?? 0)) as any} />
                  <Bar dataKey="支出" fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="收入" fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400">无月度数据</p>
          )}
        </div>
      </div>

      {/* Top Counterparties */}
      {stats.topCounterparties.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">支出 TOP 10 往来方</h3>
          <div className="space-y-1.5">
            {stats.topCounterparties.map(([name, amt], i) => {
              const pct = stats.totalExpense > 0 ? (amt / stats.totalExpense) * 100 : 0
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs font-medium text-slate-400">#{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{name}</span>
                  <span className="font-mono text-sm font-medium text-slate-600">{formatMoney(amt)}</span>
                  <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(pct, 100)}%` }} />
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
