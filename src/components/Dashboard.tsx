import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { DashboardStats, Invoice } from '../types/electron'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from './ui/Icon'
import HeroBanner from './ui/HeroBanner'
import { formatMoney } from '@/utils/format'
import { Card } from '@/components/ui/Card'
import { staggerContainer, sectionVariant, EASE_OUT } from '@/constants/animations'
import { getAPI } from '@/services/api-adapter'
import { getLevel1ForCode, CATEGORY_HIERARCHY } from '@/components/features/costLedger/config'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import CountUp from './features/dashboard/CountUp'
import { statusLabels, invoiceStatusLabels, getGreeting } from './features/dashboard/dashboardConstants'
import DashboardStatsCard from './features/dashboard/DashboardStatsCard'
import DashboardCharts from './features/dashboard/DashboardCharts'
import { COLORS } from './features/dashboard/dashboardColors'

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth()

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const api = await getAPI()
      const [result, categoriesRes] = await Promise.all([
        api.getDashboardStats(),
        api.getCostLedgerCategories().catch(() => ({ success: false, data: [] }))
      ])
      if (!result.success || !result.data) throw new Error(result.error || '加载统计失败')
      const data: DashboardStats = result.data
      let expenseByCategory = chartDataDefault.expenseByCategory
      if (data.expenseByCategory) {
        const dynamicCategories = (categoriesRes.success && categoriesRes.data)
          ? categoriesRes.data.filter((c: any) => c.level1).map((c: any) => ({ code: c.code, label: c.label, direction: c.direction, color: c.color, level1: c.level1 }))
          : []
        const camelToSnake = (s: string) => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
        const codeToSnake = new Map<string, string>()
        for (const [code] of Object.entries(data.expenseByCategory as Record<string, number>)) {
          if (code !== camelToSnake(code)) codeToSnake.set(code, camelToSnake(code))
        }
        const level1Map = new Map<string, number>()
        for (const [code, amount] of Object.entries(data.expenseByCategory as Record<string, number>)) {
          const snakeCode = codeToSnake.get(code)
          const level1 = getLevel1ForCode(code, dynamicCategories)
            || (snakeCode ? getLevel1ForCode(snakeCode, dynamicCategories) : null)
            || '其他'
          level1Map.set(level1, (level1Map.get(level1) || 0) + amount)
        }
        const colorMap = new Map<string, string>()
        for (const entry of CATEGORY_HIERARCHY) {
          if (entry.direction === 'expense') colorMap.set(entry.level1, entry.level1Color)
        }
        expenseByCategory = Array.from(level1Map.entries())
          .map(([name, amount]) => ({ name, amount: Math.round(amount), color: colorMap.get(name) || COLORS.fallbackCategory }))
          .sort((a, b) => b.amount - a.amount)
      }
      return { stats: data, expenseByCategory }
    },
    staleTime: 30_000,
  })

  const invoicesQuery = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getInvoices()
      if (!res.success || !res.data) return { recentInvoices: [], invoiceStatus: [] }
      const invoices: Invoice[] = res.data
      const recentInvoices = invoices.slice(0, 5)
      const statusCounts: Record<string, number> = {}
      for (const inv of invoices) {
        const s = inv.status || '其他'
        statusCounts[s] = (statusCounts[s] || 0) + 1
      }
      const colorMap: Record<string, string> = {
        'received': COLORS.invoiceReceived, 'partially_paid': COLORS.invoicePartiallyPaid, 'issued': COLORS.invoiceIssued,
        'cancelled': COLORS.invoiceCancelled, 'red_flushed': COLORS.invoiceRedFlushed,
      }
      const invoiceStatus = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value, color: colorMap[name] || COLORS.invoiceFallback }))
        .filter(d => d.value > 0)
      return { recentInvoices, invoiceStatus }
    },
    staleTime: 30_000,
  })

  const stats = statsQuery.data?.stats ?? null
  const expenseByCategory = statsQuery.data?.expenseByCategory ?? chartDataDefault.expenseByCategory
  const recentInvoices = invoicesQuery.data?.recentInvoices ?? []
  const invoiceStatus = invoicesQuery.data?.invoiceStatus ?? []
  const loading = statsQuery.isLoading || invoicesQuery.isLoading
  const error = statsQuery.error?.message || ''

  const greeting = getGreeting()

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="rounded-xl bg-[color:var(--panel-2)] animate-pulse h-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="rounded-xl bg-[color:var(--panel-2)] animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[color:var(--panel-2)] animate-pulse h-80" />
          <div className="rounded-xl bg-[color:var(--panel-2)] animate-pulse h-80" />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Icon name="AlertCircle" size={48} className="text-danger-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[color:var(--fg-2)] mb-2">加载失败</h3>
          <p className="text-[color:var(--muted)] mb-4">{error}</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { statsQuery.refetch(); invoicesQuery.refetch() }}
            className="bg-[color:var(--fg)] hover:opacity-90 text-[color:var(--bg)] text-sm px-4 py-2 rounded-lg transition-colors">重试</motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-60px)] overflow-hidden">
      <HoverScrollbar className="h-full">
        <div className="max-w-[1600px] mx-auto p-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>

            <HeroBanner
              icon="LayoutDashboard"
              title={`${greeting}，${currentUser?.displayName || currentUser?.username || '用户'}`}
              subtitle="工程管理驾驶舱 · 数据概览"
              metrics={[
                { value: <CountUp value={stats?.projectsCount || 0} />, label: '项目总数' },
                { value: <CountUp value={stats?.settlementsCount || 0} />, label: '待办结算' },
              ]}
            />

            {/* ═══ KPI Stat Cards ═══ */}
            <DashboardStatsCard stats={stats} />

            {/* ═══ Charts Row ═══ */}
            <DashboardCharts chartData={{ expenseByCategory, invoiceStatus }} />

            {/* ═══ Recent Projects & Invoices ═══ */}
            <motion.section variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card 
                title={<span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2"><Icon name="FolderKanban" size={14} /> 最近项目</span>}
                extra={stats?.projectsCount ? <span className="text-xs text-[color:var(--muted)]">{stats.projectsCount} 总计</span> : null}
                headerDivider
              >
                {stats?.recentProjects && stats.recentProjects.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentProjects.map((project, index) => (
                      <motion.div key={project.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.06 }}
                        whileHover={{ x: 4, backgroundColor: 'var(--card-hover)' }}
                        className="flex items-center justify-between p-3 rounded-xl transition-colors group cursor-pointer"
                        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }))}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--panel-2)' }}>
                            <span className="flex items-center justify-center w-full h-full text-xs font-bold" style={{ color: 'var(--muted)' }}>{index + 1}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-[color:var(--accent)] transition-colors" style={{ color: 'var(--fg)' }}>{project.name}</p>
                            <p className="text-xs text-[color:var(--muted)] truncate mt-0.5">{project.address || '暂无地址'}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusLabels[project.status]?.color || 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>
                          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                            className={`inline-block w-1.5 h-1.5 rounded-full ${statusLabels[project.status]?.dot} mr-1.5 align-middle`} />{statusLabels[project.status]?.text || project.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]">
                    <Icon name="FolderKanban" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无项目</p>
                  </div>
                )}
              </Card>

              <Card 
                title={<span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] flex items-center gap-2"><Icon name="Receipt" size={14} /> 最近发票</span>}
                extra={stats?.invoicesCount ? <span className="text-xs text-[color:var(--muted)]">{stats.invoicesCount} 总计</span> : null}
                headerDivider
              >
                {recentInvoices.length > 0 ? (
                  <div className="space-y-3">
                    {recentInvoices.map((inv, index) => (
                      <motion.div key={inv.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.06 }}
                        whileHover={{ x: 4, backgroundColor: 'var(--card-hover)' }}
                        className="p-3 rounded-xl transition-colors"
                        style={{ background: 'var(--bg)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-[color:var(--fg)] text-sm truncate">{inv.invoiceNo || '无号'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${invoiceStatusLabels[inv.status]?.color || 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>
                            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                              className={`inline-block w-1.5 h-1.5 rounded-full ${invoiceStatusLabels[inv.status]?.dot || 'bg-[color:var(--muted)]'} mr-1 align-middle`} />{invoiceStatusLabels[inv.status]?.text || inv.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[color:var(--muted)] mb-2">
                          <span className="flex items-center gap-1"><Icon name="Building2" size={12} />{inv.buyerName || inv.sellerName || '未知单位'}</span>
                          <span className="text-[color:var(--border-strong)]">|</span>
                          <span className="flex items-center gap-1"><Icon name="DollarSign" size={12} />{formatMoney(inv.amount)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-[color:var(--panel-2)] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-[color:var(--accent)] rounded-full"
                              style={{ transformOrigin: 'left', width: '100%' }}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: (inv.amount > 0 ? Math.round(inv.receivedAmount / inv.amount * 100) : 0) / 100 }}
                              transition={{ duration: 0.55, delay: 0.15 + index * 0.07, ease: EASE_OUT }}
                            />
                          </div>
                          <span className="text-xs text-[color:var(--muted)] font-medium w-8 text-right">{inv.amount > 0 ? Math.round(inv.receivedAmount / inv.amount * 100) : 0}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]">
                    <Icon name="Receipt" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无发票</p>
                  </div>
                )}
              </Card>
            </motion.section>

          </motion.div>
        </div>
      </HoverScrollbar>
    </div>
  )
}

const chartDataDefault = {
  expenseByCategory: [] as { name: string; amount: number; color?: string }[],
}

export default Dashboard