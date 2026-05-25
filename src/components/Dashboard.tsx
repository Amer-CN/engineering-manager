import React, { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { DashboardStats, Invoice } from '../types/electron'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from './ui/Icon'
import { formatMoney } from '@/utils/format'
import { Card } from '@/components/ui/Card'
const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#f59e0b']

const statCards = [
  { key: 'projects', label: '项目总数', icon: 'FolderKanban', color: 'bg-blue-50 text-blue-600' },
  { key: 'settlements', label: '待办结算', icon: 'ClipboardList', color: 'bg-amber-50 text-amber-600' },
  { key: 'members', label: '团队成员', icon: 'Users', color: 'bg-violet-50 text-violet-600' },
  { key: 'costLedger', label: '总支出', icon: 'Wallet', color: 'bg-emerald-50 text-emerald-600' },
  { key: 'invoices', label: '发票记录', icon: 'Receipt', color: 'bg-teal-50 text-teal-600' },
  { key: 'inventory', label: '库存物料', icon: 'Package', color: 'bg-orange-50 text-orange-600' },
]

const sectionV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const cardHover = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }

function formatCurrency(n: number): string {
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${formatMoney(n)}`
}

// CountUp: 数字滚动动画组件
const CountUp: React.FC<{ value: number; duration?: number; suffix?: string; prefix?: string; decimals?: number }> = ({ value, duration = 1.2, suffix = '', prefix = '', decimals = 0 }) => {
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 40, damping: 25 })
  const [display, setDisplay] = useState('0')
  const prevValue = useRef(0)

  useEffect(() => {
    motionVal.set(value)
    prevValue.current = value
  }, [value])

  useEffect(() => {
    const unsub = springVal.on('change', (latest) => {
      setDisplay(prefix + Number(latest).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix)
    })
    return () => unsub()
  }, [springVal, prefix, suffix, decimals])

  return <span>{display}</span>
}

// SVG 自定义刻度：分类名超过 4 个字自动拆成两行，避免 recharts 隐藏重叠标签
const CategoryTick = (props: any) => {
  const { x, y, payload } = props
  const text: string = payload?.value ?? ''
  if (!text) return null
  if (text.length <= 4) {
    return <text x={x} y={y} dy={6} textAnchor="middle" fill="#94a3b8" fontSize={11}>{text}</text>
  }
  const mid = Math.ceil(text.length / 2)
  return (
    <text x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize={11}>
      <tspan x={x} dy={6}>{text.slice(0, mid)}</tspan>
      <tspan x={x} dy={13}>{text.slice(mid)}</tspan>
    </text>
  )
}

interface StatValue { primary: string; secondary: string; progress?: number; raw?: number }

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartData, setChartData] = useState<{
    expenseByCategory: { name: string; amount: number }[]
    invoiceStatus: { name: string; value: number; color: string }[]
  }>({ expenseByCategory: [], invoiceStatus: [] })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getDashboardStats()
      if (result.success && result.data) {
        setStats(result.data)
        // 从统计数据中构建分类支出图表数据
        if (result.data.expenseByCategory) {
          const expenseByCategory = Object.entries(result.data.expenseByCategory as Record<string, number>)
            .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
            .sort((a, b) => b.amount - a.amount)
          setChartData(prev => ({ ...prev, expenseByCategory }))
        }
      }
      else setError(result.error || '加载统计失败')
    } catch (err: any) { setError(err.message || '加载统计失败') }
  }

  const loadInvoiceData = async () => {
    try {
      const res = await window.electronAPI.getInvoices()
      if (res.success && res.data) {
        const invoices = res.data
        setRecentInvoices(invoices.slice(0, 5))
        const statusCounts: Record<string, number> = {}
        for (const inv of invoices) {
          const s = inv.status || '其他'
          statusCounts[s] = (statusCounts[s] || 0) + 1
        }
        const colorMap: Record<string, string> = {
          'received': '#10b981', 'partially_paid': '#f59e0b', 'issued': '#3b82f6',
          'cancelled': '#94a3b8', 'red_flushed': '#ef4444',
        }
        const invoiceStatus = Object.entries(statusCounts)
          .map(([name, value]) => ({ name, value, color: colorMap[name] || '#94a3b8' }))
          .filter(d => d.value > 0)
        setChartData(prev => ({ ...prev, invoiceStatus }))
      }
    } catch { /* charts silently degrade */ }
  }

  useEffect(() => { Promise.all([loadStats(), loadInvoiceData()]).finally(() => setLoading(false)) }, [])

  const getStatValue = (key: string): StatValue => {
    if (!stats) return { primary: '0', secondary: '', raw: 0 }
    switch (key) {
      case 'projects': return { primary: String(stats.projectsCount), secondary: `${stats.inProgressProjects} 个进行中`, progress: stats.projectsCount ? Math.round((stats.inProgressProjects / stats.projectsCount) * 100) : 0, raw: stats.projectsCount }
      case 'settlements': return { primary: String(stats.settlementsCount), secondary: '待办结算', raw: stats.settlementsCount }
      case 'members': return { primary: String(stats.membersCount), secondary: '管理人员 + 农民工', raw: stats.membersCount }
      case 'costLedger': return { primary: formatCurrency(stats.totalExpenses), secondary: '累计成本', raw: stats.totalExpenses }
      case 'invoices': return { primary: String(stats.invoicesCount), secondary: '收票 / 开票', raw: stats.invoicesCount }
      case 'inventory': return { primary: String(stats.inventoryItemsCount), secondary: '进销存管理', raw: stats.inventoryItemsCount }
      default: return { primary: '0', secondary: '', raw: 0 }
    }
  }

  const statusLabels: Record<string, { text: string; color: string; dot: string }> = {
    planning: { text: '筹备中', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    in_progress: { text: '进行中', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    completed: { text: '已完成', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
    archived: { text: '已归档', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  }
  const invoiceStatusLabels: Record<string, { text: string; color: string; dot: string }> = {
    'received': { text: '已收齐', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    'partially_paid': { text: '部分收付', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    'issued': { text: '已开具', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    'cancelled': { text: '已作废', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
    'red_flushed': { text: '已红冲', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    '其他': { text: '其他', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  }

  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="rounded-2xl bg-slate-100 animate-pulse h-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-slate-100 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-slate-100 animate-pulse h-80" />
          <div className="rounded-xl bg-slate-100 animate-pulse h-80" />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Icon name="AlertCircle" size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">加载失败</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { setLoading(true); setError(''); Promise.all([loadStats(), loadInvoiceData()]).finally(() => setLoading(false)) }}
            className="btn btn-primary text-sm">重试</motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6">
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>

        {/* ═══ Hero Banner ═══ */}
        <motion.section variants={sectionV} className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
          {/* 装饰光点 */}
          <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          />
          <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <Icon name="LayoutDashboard" size={28} />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{greeting}，{currentUser?.displayName || currentUser?.username || '用户'}</h1>
                <p className="text-white/50 text-sm mt-1">工程管理驾驶舱 · 数据概览</p>
              </div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/10">
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-300"><CountUp value={stats?.projectsCount || 0} /></p>
                <p className="text-xs text-emerald-300/80">项目总数</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-300"><CountUp value={stats?.settlementsCount || 0} /></p>
                <p className="text-xs text-amber-300/80">待办结算</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ═══ KPI Stat Cards ═══ */}
        <motion.section variants={sectionV} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map((card, i) => {
            const val = getStatValue(card.key)
            return (
              <motion.div
                key={card.key}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.05 } } }}
                whileHover={cardHover}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-3 transition-shadow duration-200 cursor-default"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}><Icon name={card.icon} size={14} /></span>
                  <span className="text-xs text-slate-400">{card.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {val.raw !== undefined && val.raw > 999 ? (
                    <CountUp value={val.raw} />
                  ) : val.raw !== undefined ? (
                    <CountUp value={val.raw} />
                  ) : val.primary}
                </p>
                <p className="text-xs text-slate-400">{val.secondary}</p>
                {val.progress !== undefined && (
                  <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${val.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.section>

        {/* ═══ Charts Row ═══ */}
        <motion.section variants={sectionV} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* BarChart */}
          <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="BarChart3" size={14} /> 支出分类</span>} headerDivider className="hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-shadow">
              {chartData.expenseByCategory.length > 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
                  className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.expenseByCategory} margin={{ top: 4, right: 4, left: -16, bottom: 32 }} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={CategoryTick} interval={0} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)} />
                      <Tooltip /* @ts-ignore */ contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => [formatCurrency(value ?? 0), '金额']} />
                      <Bar dataKey="amount" radius={[5, 5, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                        {chartData.expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Icon name="Wallet" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无支出数据</p>
                </div>
              )}
            </Card>

          {/* Invoice Status PieChart */}
          <Card title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="PieChart" size={14} /> 发票状态</span>} headerDivider className="hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-shadow">
              {chartData.invoiceStatus.length > 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.4 }}
                  className="flex items-center h-72">
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData.invoiceStatus} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}
                          animationDuration={1200} animationEasing="ease-out">
                          {chartData.invoiceStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip /* @ts-ignore */ contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any, name: any) => [value, invoiceStatusLabels[name ?? '']?.text || name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-36 space-y-3 pl-2">
                    {chartData.invoiceStatus.map((entry, i) => (
                      <motion.div key={entry.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div className="flex-1 min-w-0"><div className="text-xs text-slate-500 truncate">{invoiceStatusLabels[entry.name]?.text || entry.name}</div><div className="text-sm font-semibold text-slate-800">{entry.value}</div></div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Icon name="Receipt" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无发票数据</p>
                </div>
              )}
            </Card>
        </motion.section>

        {/* ═══ Recent Projects & Invoices ═══ */}
        <motion.section variants={sectionV} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card 
            title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="FolderKanban" size={14} /> 最近项目</span>}
            extra={stats?.projectsCount ? <span className="text-xs text-slate-400">{stats.projectsCount} 总计</span> : null}
            headerDivider
          >
              {stats?.recentProjects && stats.recentProjects.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentProjects.map((project, index) => (
                    <motion.div key={project.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.06 }}
                      whileHover={{ x: 4, backgroundColor: 'rgb(248 250 252)' }}
                      className="flex items-center justify-between p-3 rounded-xl transition-colors group cursor-pointer"
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }))}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">{index + 1}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate group-hover:text-primary-600 transition-colors">{project.name}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{project.address || '暂无地址'}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusLabels[project.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                        <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                          className={`inline-block w-1.5 h-1.5 rounded-full ${statusLabels[project.status]?.dot} mr-1.5 align-middle`} />{statusLabels[project.status]?.text || project.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Icon name="FolderKanban" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无项目</p>
                </div>
              )}
            </Card>

          <Card 
            title={<span className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2"><Icon name="Receipt" size={14} /> 最近发票</span>}
            extra={stats?.invoicesCount ? <span className="text-xs text-slate-400">{stats.invoicesCount} 总计</span> : null}
            headerDivider
          >
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((inv, index) => (
                    <motion.div key={inv.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.06 }}
                      whileHover={{ x: 4, backgroundColor: 'rgb(248 250 252)' }}
                      className="p-3 rounded-xl bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-800 text-sm truncate">{inv.invoiceNo || '无号'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${invoiceStatusLabels[inv.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                            className={`inline-block w-1.5 h-1.5 rounded-full ${invoiceStatusLabels[inv.status]?.dot || 'bg-slate-400'} mr-1 align-middle`} />{invoiceStatusLabels[inv.status]?.text || inv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1"><Icon name="Building2" size={12} />{inv.buyerName || inv.sellerName || '未知单位'}</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1"><Icon name="DollarSign" size={12} />{formatMoney(inv.amount)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${inv.amount > 0 ? Math.round(inv.receivedAmount / inv.amount * 100) : 0}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-medium w-8 text-right">{inv.amount > 0 ? Math.round(inv.receivedAmount / inv.amount * 100) : 0}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Icon name="Receipt" size={32} className="mb-2 opacity-40" /><p className="text-sm">暂无发票</p>
                </div>
              )}
            </Card>
        </motion.section>

      </motion.div>
    </div>
  )
}

export default Dashboard
