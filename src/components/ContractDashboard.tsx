import React, { useState, useEffect } from 'react'
import { ContractStats } from '../types/electron'
import { formatMoney } from '../utils/format'
import { formatContractCurrency } from './features/contracts/formatContractCurrency'
import { Icon } from './ui/Icon'
import PageContainer from './ui/PageContainer'
import HeroBanner from './ui/HeroBanner'
import { motion } from 'framer-motion'
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { SimpleBarChart } from './ui/SimpleBarChart'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { getAPI } from '@/services/api-adapter'
import { COLORS } from './features/contracts/contractsColors'

const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm'

interface ContractDashboardProps {
  refresh?: () => void
  onNavigate?: (view: 'income' | 'expense' | 'agreement', opts?: { createNew?: boolean }) => void
}

const ContractDashboard: React.FC<ContractDashboardProps> = ({ refresh, onNavigate }) => {
  const [stats, setStats] = useState<ContractStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  loadStats()
  }, [refresh])

  const loadStats = async () => {
  try {
  const result = await (await getAPI()).getContractStats()
  if (result.success && result.data) setStats(result.data)
  } catch (error) {
  console.error('加载统计数据失败:', error)
  } finally {
  setLoading(false)
  }
  }

  if (loading) {
  return (
  <PageContainer>
  <div className="rounded-2xl bg-slate-100 animate-pulse h-32 mb-6" />
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {Array.from({ length: 4 }).map((_, i) => (
  <div key={i} className="rounded-xl bg-slate-100 animate-pulse h-28" />
  ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="rounded-xl bg-slate-100 animate-pulse h-80" />
  <div className="rounded-xl bg-slate-100 animate-pulse h-80" />
  </div>
  </PageContainer>
  )
  }

  const netIncome = (stats?.incomeTotal || 0) - (stats?.expenseTotal || 0)
  const isPositive = netIncome >= 0

  const barData = [
  { name: '收入合同', amount: stats?.incomeTotal || 0, fill: COLORS.income },
  { name: '支出合同', amount: stats?.expenseTotal || 0, fill: COLORS.expense },
  { name: '已回款', amount: stats?.incomeReceived || 0, fill: COLORS.received },
  { name: '已付款', amount: stats?.expensePaid || 0, fill: COLORS.paid },
  ]

  const pieData = [
  { name: '收入合同', value: stats?.incomeCount || 0, color: COLORS.income },
  { name: '支出合同', value: stats?.expenseCount || 0, color: COLORS.expense },
  { name: '其他协议', value: stats?.agreementCount || 0, color: COLORS.agreement },
  ].filter(d => d.value > 0)

  return (
  <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
  <PageContainer>
  <HeroBanner
    icon="FileText"
    title="合同看板"
    subtitle="合同数据统计与收支分析"
    metrics={[
      { value: (stats?.incomeCount || 0) + (stats?.expenseCount || 0) + (stats?.agreementCount || 0), label: "合同总数" },
      { value: `${isPositive ? "+" : "-"}¥${formatContractCurrency(Math.abs(netIncome))}`, label: "收支差额", color: isPositive ? "text-emerald-400" : "text-red-400" },
    ]}
    accentColor="emerald"
  />

  {/* 导航入口卡片：点击进入子页面 */}
  <motion.div variants={sectionVariant} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
  {/* 收入合同入口 */}
  <button onClick={() => onNavigate?.('income')}
  className={`${CARD} p-6 text-left cursor-pointer hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all duration-200 group`}>
  <div className="flex items-center gap-4 mb-4">
  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
  <Icon name="TrendingUp" size={24} className="text-emerald-600" />
  </div>
  <div>
  <h3 className="text-lg font-bold text-slate-800">收入合同</h3>
  <p className="text-xs text-slate-400">记录新签订单</p>
  </div>
  </div>
  <div className="flex items-end justify-between">
  <div>
  <p className="text-3xl font-bold text-slate-800">{stats?.incomeCount || 0}</p>
  <p className="text-sm text-slate-500 mt-0.5">总额 ¥{formatContractCurrency(stats?.incomeTotal || 0)}</p>
  </div>
  <span className="text-sm text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
  查看详情 <Icon name="ChevronRight" size={14} />
  </span>
  </div>
  </button>

  {/* 支出合同入口 */}
  <button onClick={() => onNavigate?.('expense')}
  className={`${CARD} p-6 text-left cursor-pointer hover:shadow-lg hover:border-red-300 hover:-translate-y-1 transition-all duration-200 group`}>
  <div className="flex items-center gap-4 mb-4">
  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
  <Icon name="TrendingDown" size={24} className="text-red-600" />
  </div>
  <div>
  <h3 className="text-lg font-bold text-slate-800">支出合同</h3>
  <p className="text-xs text-slate-400">记录采购/分包</p>
  </div>
  </div>
  <div className="flex items-end justify-between">
  <div>
  <p className="text-3xl font-bold text-slate-800">{stats?.expenseCount || 0}</p>
  <p className="text-sm text-slate-500 mt-0.5">总额 ¥{formatContractCurrency(stats?.expenseTotal || 0)}</p>
  </div>
  <span className="text-sm text-red-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
  查看详情 <Icon name="ChevronRight" size={14} />
  </span>
  </div>
  </button>

  {/* 其他协议入口 */}
  <button onClick={() => onNavigate?.('agreement')}
  className={`${CARD} p-6 text-left cursor-pointer hover:shadow-lg hover:border-sky-300 hover:-translate-y-1 transition-all duration-200 group`}>
  <div className="flex items-center gap-4 mb-4">
  <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
  <Icon name="FileText" size={24} className="text-sky-600" />
  </div>
  <div>
  <h3 className="text-lg font-bold text-slate-800">其他协议</h3>
  <p className="text-xs text-slate-400">框架/合作协议</p>
  </div>
  </div>
  <div className="flex items-end justify-between">
  <div>
  <p className="text-3xl font-bold text-slate-800">{stats?.agreementCount || 0}</p>
  <p className="text-sm text-slate-500 mt-0.5">协议合同</p>
  </div>
  <span className="text-sm text-sky-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
  查看详情 <Icon name="ChevronRight" size={14} />
  </span>
  </div>
  </button>
  </motion.div>

  {/* 汇总统计条 */}
  <motion.div variants={sectionVariant} className="grid grid-cols-4 gap-4 mb-8">
  <div className={`${CARD} p-4 flex items-center gap-4`}>
  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
  <Icon name="CheckCircle" size={20} className="text-emerald-600" />
  </div>
  <div>
  <p className="text-xs text-slate-500">已回款</p>
  <p className="text-lg font-bold text-emerald-600">¥{formatContractCurrency(stats?.incomeReceived || 0)}</p>
  </div>
  </div>
  <div className={`${CARD} p-4 flex items-center gap-4`}>
  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
  <Icon name="CreditCard" size={20} className="text-red-600" />
  </div>
  <div>
  <p className="text-xs text-slate-500">已付款</p>
  <p className="text-lg font-bold text-red-600">¥{formatContractCurrency(stats?.expensePaid || 0)}</p>
  </div>
  </div>
  <div className={`${CARD} p-4 flex items-center gap-4`}>
  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
  <Icon name="Sparkles" size={20} className="text-blue-600" />
  </div>
  <div>
  <p className="text-xs text-slate-500">收支差额</p>
  <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
  {netIncome >= 0 ? '+' : '-'}¥{formatContractCurrency(Math.abs(netIncome))}
  </p>
  </div>
  </div>
  <div className={`${CARD} p-4 flex items-center gap-4`}>
  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
  <Icon name="AlertTriangle" size={20} className="text-amber-600" />
  </div>
  <div>
  <p className="text-xs text-slate-500">即将到期</p>
  <p className="text-lg font-bold text-amber-600">{stats?.expiringSoon?.length || 0} 份</p>
  </div>
  </div>
  </motion.div>

  {/* Charts Section */}
  <motion.div variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {/* Bar Chart */}
  <div className={`${CARD} p-6`}>
  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">收支对比</h3>
  {stats ? (
  <SimpleBarChart
  data={barData.map(d => ({ name: d.name, amount: d.amount }))}
  colors={barData.map(d => d.fill)}
  formatValue={(v) => `¥${formatMoney(v)}`}
  />
  ) : (
  <div className="flex items-center justify-center h-[280px] text-slate-400">暂无数据</div>
  )}
  </div>

  {/* Pie Chart */}
  <div className={`${CARD} p-6`}>
  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">合同类型分布</h3>
  {pieData.length > 0 ? (
  <ResponsiveContainer width="100%" height={280}>
  <PieChart>
  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
  {pieData.map((entry, idx) => (
  <Cell key={idx} fill={entry.color} stroke="none" />
  ))}
  </Pie>
  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)', color: 'var(--fg)' }} formatter={((value: any) => [`${value ?? 0} 份`, '']) as any} />
  </PieChart>
  </ResponsiveContainer>
  ) : (
  <div className="flex items-center justify-center h-[280px] text-slate-400">暂无数据</div>
  )}
  {pieData.length > 0 && (
  <div className="flex items-center justify-center gap-6 mt-2">
  {pieData.map((d) => (
  <div key={d.name} className="flex items-center gap-2 text-sm text-slate-600">
  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
  {d.name} ({d.value})
  </div>
  ))}
  </div>
  )}
  </div>
  </motion.div>

  {/* 即将到期合同 + 快捷创建 */}
  <motion.div variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
  {/* Expiring Soon */}
  <div className={`${CARD} p-6 lg:col-span-3`}>
  <div className="flex items-center gap-2 mb-4">
  <Icon name="AlertTriangle" size={18} className="text-amber-500" />
  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">即将到期合同</h3>
  {stats?.expiringSoon && stats.expiringSoon.length > 0 && (
  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">{stats.expiringSoon.length} 份</span>
  )}
  </div>
  {stats?.expiringSoon && stats.expiringSoon.length > 0 ? (
  <div className="space-y-2">
  {stats.expiringSoon.map((contract: any, index: number) => (
  <div key={index} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
  <div>
  <div className="font-medium text-slate-800 text-sm">{contract.name}</div>
  <div className="text-xs text-slate-500">{contract.contractNo}</div>
  </div>
  <div className="text-right">
  <div className="text-sm text-amber-600 font-medium">剩余 {contract.daysLeft} 天</div>
  <div className="text-xs text-slate-400">到期: {contract.endDate}</div>
  </div>
  </div>
  ))}
  </div>
  ) : (
  <p className="text-sm text-slate-400 py-4">暂无即将到期的合同</p>
  )}
  </div>

  {/* 快捷创建 */}
  <div className={`${CARD} p-6`}>
  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">快捷创建</h3>
  <div className="space-y-2">
  <button onClick={() => onNavigate?.('income', { createNew: true })}
  className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition-colors flex items-center gap-3">
  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
  <Icon name="Plus" size={18} className="text-emerald-600" />
  </div>
  <div>
  <div className="font-medium text-emerald-700 text-sm">新增收入合同</div>
  <div className="text-xs text-emerald-600/70">记录新签订单</div>
  </div>
  </button>
  <button onClick={() => onNavigate?.('expense', { createNew: true })}
  className="w-full p-3 bg-red-50 hover:bg-red-100 rounded-lg text-left transition-colors flex items-center gap-3">
  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
  <Icon name="Plus" size={18} className="text-red-600" />
  </div>
  <div>
  <div className="font-medium text-red-700 text-sm">新增支出合同</div>
  <div className="text-xs text-red-600/70">记录采购/分包</div>
  </div>
  </button>
  </div>
  </div>
  </motion.div>

  {/* Empty State */}
  {(!stats || (stats.incomeCount === 0 && stats.expenseCount === 0 && stats.agreementCount === 0)) && (
  <motion.div variants={sectionVariant} className={`${CARD} p-12 text-center`}>
  <Icon name="BarChart3" size={56} className="text-slate-300 mx-auto mb-4" />
  <h3 className="text-lg font-medium text-slate-800 mb-2">暂无合同数据</h3>
  <p className="text-slate-500">开始添加收入合同和支出合同来查看统计数据</p>
  </motion.div>
  )}
  </PageContainer>
  </motion.div>
  )
}

export default ContractDashboard
