import React, { useState, useEffect } from 'react'
import { ContractStats } from '../types/electron'
import { formatMoney } from '../utils/format'
import { Icon } from './ui/Icon'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CARD = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'
const CHART_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4']

const sectionV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

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
      const result = await window.electronAPI.getContractStats()
      if (result.success && result.data) setStats(result.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) return (amount / 100000000).toFixed(2) + ' 亿'
    if (amount >= 10000) return (amount / 10000).toFixed(2) + ' 万'
    return formatMoney(amount)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse h-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-80" />
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-80" />
        </div>
      </div>
    )
  }

  const netIncome = (stats?.incomeTotal || 0) - (stats?.expenseTotal || 0)
  const isPositive = netIncome >= 0

  const barData = [
    { name: '收入合同', amount: stats?.incomeTotal || 0, fill: '#10b981' },
    { name: '支出合同', amount: stats?.expenseTotal || 0, fill: '#ef4444' },
    { name: '已回款', amount: stats?.incomeReceived || 0, fill: '#3b82f6' },
    { name: '已付款', amount: stats?.expensePaid || 0, fill: '#f59e0b' },
  ]

  const pieData = [
    { name: '收入合同', value: stats?.incomeCount || 0, color: '#10b981' },
    { name: '支出合同', value: stats?.expenseCount || 0, color: '#ef4444' },
    { name: '其他协议', value: stats?.agreementCount || 0, color: '#0ea5e9' },
  ].filter(d => d.value > 0)

  return (
    <motion.div className="p-6 max-w-[1400px] mx-auto" initial="hidden" animate="visible" variants={stagger}>
      {/* Hero Banner */}
      <motion.div variants={sectionV} className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-2xl mb-8 overflow-hidden">
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
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">合同看板</h1>
            <p className="text-slate-300 mt-1">合同数据统计与收支分析</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-slate-400">合同总数</p>
              <p className="text-2xl font-bold">{(stats?.incomeCount || 0) + (stats?.expenseCount || 0) + (stats?.agreementCount || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">收支差额</p>
              <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : '-'}¥{formatCurrency(Math.abs(netIncome))}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 导航入口卡片：点击进入子页面 */}
      <motion.div variants={sectionV} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
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
              <p className="text-sm text-slate-500 mt-0.5">总额 ¥{formatCurrency(stats?.incomeTotal || 0)}</p>
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
              <p className="text-sm text-slate-500 mt-0.5">总额 ¥{formatCurrency(stats?.expenseTotal || 0)}</p>
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
      <motion.div variants={sectionV} className="grid grid-cols-4 gap-4 mb-8">
        <div className={`${CARD} p-4 flex items-center gap-4`}>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Icon name="CheckCircle" size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">已回款</p>
            <p className="text-lg font-bold text-emerald-600">¥{formatCurrency(stats?.incomeReceived || 0)}</p>
          </div>
        </div>
        <div className={`${CARD} p-4 flex items-center gap-4`}>
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Icon name="CreditCard" size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">已付款</p>
            <p className="text-lg font-bold text-red-600">¥{formatCurrency(stats?.expensePaid || 0)}</p>
          </div>
        </div>
        <div className={`${CARD} p-4 flex items-center gap-4`}>
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon name="Sparkles" size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">收支差额</p>
            <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netIncome >= 0 ? '+' : '-'}¥{formatCurrency(Math.abs(netIncome))}
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
      <motion.div variants={sectionV} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className={`${CARD} p-6`}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">收支对比</h3>
          {stats ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip formatter={(value: number) => [`¥${formatCurrency(value)}`, '']} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">暂无数据</div>
          )}
        </div>

        {/* Pie Chart */}
        <div className={`${CARD} p-6`}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">合同类型分布</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 份`, '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400">暂无数据</div>
          )}
          {pieData.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 即将到期合同 + 快捷创建 */}
      <motion.div variants={sectionV} className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Expiring Soon */}
        <div className={`${CARD} p-6 lg:col-span-3`}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="AlertTriangle" size={18} className="text-amber-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">即将到期合同</h3>
            {stats?.expiringSoon && stats.expiringSoon.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">{stats.expiringSoon.length} 份</span>
            )}
          </div>
          {stats?.expiringSoon && stats.expiringSoon.length > 0 ? (
            <div className="space-y-2">
              {stats.expiringSoon.map((contract: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{contract.name}</div>
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
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">快捷创建</h3>
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
        <motion.div variants={sectionV} className={`${CARD} p-12 text-center`}>
          <Icon name="BarChart3" size={56} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无合同数据</h3>
          <p className="text-slate-500 dark:text-slate-400">开始添加收入合同和支出合同来查看统计数据</p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default ContractDashboard
