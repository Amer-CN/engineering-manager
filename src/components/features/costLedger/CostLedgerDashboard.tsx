import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { formatMoney } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import type { Project, CostLedgerSummary } from '@/types'

const CARD = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'

const sectionV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const cardHover = { y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }

const CountUp: React.FC<{ value: number; suffix?: string; prefix?: string; decimals?: number }> = ({ value, suffix = '', prefix = '', decimals = 0 }) => {
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 40, damping: 25 })
  const [display, setDisplay] = useState('0')

  useEffect(() => { motionVal.set(value) }, [value])

  useEffect(() => {
    const unsub = springVal.on('change', (latest) => {
      setDisplay(prefix + Number(latest).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix)
    })
    return () => unsub()
  }, [springVal, prefix, suffix, decimals])

  return <span>{display}</span>
}

interface CostLedgerDashboardProps {
  projects: Project[]
  summaries: Record<number, CostLedgerSummary>
  loading: boolean
  onSelectProject: (projectId: number) => void
  onManageCategories?: () => void
}

export function CostLedgerDashboard({ projects, summaries, loading, onSelectProject, onManageCategories }: CostLedgerDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-slate-100 animate-pulse h-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="rounded-xl bg-slate-100 animate-pulse h-28" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Icon name="FolderKanban" size={48} className="mb-3 opacity-30" />
        <p className="text-lg font-medium text-slate-500">暂无项目</p>
        <p className="mt-1 text-sm">请先在项目管理中创建项目</p>
      </motion.div>
    )
  }

  const totals = projects.reduce((acc, p) => {
    const s = summaries[p.id]
    if (s) { acc.expense += s.totalExpense; acc.income += s.totalIncome }
    return acc
  }, { expense: 0, income: 0 })

  const netFlow = totals.income - totals.expense

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>

      {/* ═══ Hero Banner ═══ */}
      <motion.section variants={sectionV} className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.1),transparent_50%)]" />
        <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-amber-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-orange-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon name="Wallet" size={28} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">成本台账</h1>
              <p className="text-white/50 text-sm mt-1">真实资金流追踪 — 经营支出、垫资进出、股东融资</p>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/10">
            <div className="text-right">
              <p className="text-3xl font-bold text-red-300"><CountUp value={totals.expense} /></p>
              <p className="text-xs text-red-300/80">经营支出</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-300"><CountUp value={totals.income} /></p>
              <p className="text-xs text-emerald-300/80">资金收入</p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ KPI Stat Cards ═══ */}
      <motion.section variants={sectionV} className="grid grid-cols-3 gap-3 mb-6">
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: 0 } } }}
          whileHover={cardHover} whileTap={{ scale: 0.98 }}
          className={`${CARD} p-3 transition-shadow duration-200 cursor-default`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-600"><Icon name="ArrowUpCircle" size={14} /></span>
            <span className="text-xs text-slate-400">经营支出</span>
          </div>
          <p className="text-lg font-bold text-slate-800"><CountUp value={totals.expense} /></p>
          <p className="text-xs text-slate-400">总支出金额</p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: 0.05 } } }}
          whileHover={cardHover} whileTap={{ scale: 0.98 }}
          className={`${CARD} p-3 transition-shadow duration-200 cursor-default`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600"><Icon name="ArrowDownCircle" size={14} /></span>
            <span className="text-xs text-slate-400">资金收入</span>
          </div>
          <p className="text-lg font-bold text-slate-800"><CountUp value={totals.income} /></p>
          <p className="text-xs text-slate-400">总收入金额</p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: 0.1 } } }}
          whileHover={cardHover} whileTap={{ scale: 0.98 }}
          className={`${CARD} p-3 transition-shadow duration-200 cursor-default`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${netFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Icon name={netFlow >= 0 ? 'TrendingUp' : 'TrendingDown'} size={14} />
            </span>
            <span className="text-xs text-slate-400">净{netFlow >= 0 ? '流入' : '流出'}</span>
          </div>
          <p className={`text-lg font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}><CountUp value={Math.abs(netFlow)} prefix={netFlow < 0 ? '-' : ''} /></p>
          <p className="text-xs text-slate-400">收入 - 支出</p>
        </motion.div>
      </motion.section>

      {/* ═══ Toolbar ═══ */}
      {onManageCategories && (
        <motion.section variants={sectionV} className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Icon name="FolderKanban" size={14} /> 项目台账
          </h2>
          <button onClick={onManageCategories}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
            <Icon name="Settings" size={12} /> 管理分类
          </button>
        </motion.section>
      )}

      {/* ═══ Project Cards Grid ═══ */}
      <motion.section variants={sectionV} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, i) => {
          const s = summaries[project.id]
          const net = s ? s.totalIncome - s.totalExpense : 0
          const netLabel = net >= 0 ? '净流入' : '净流出'
          return (
            <motion.button
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.05 } } }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectProject(project.id)}
              className={`${CARD} overflow-hidden text-left transition-shadow duration-200`}
            >
              {/* 顶部色条 */}
              <div className={`h-1 ${net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />

              <div className="p-5">
                {/* 头部：名称 + 编号 */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 truncate">{project.name}</h3>
                  </div>
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${net >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {i + 1}
                  </span>
                </div>

                {s ? (
                  <>
                    {/* 收支双栏 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-lg bg-red-50/50 border border-red-100 p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">经营支出</p>
                        <p className="font-mono text-sm font-bold text-red-600 truncate">{formatMoney(s.totalExpense)}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-2.5">
                        <p className="text-xs text-slate-500 mb-0.5">资金收入</p>
                        <p className="font-mono text-sm font-bold text-emerald-600 truncate">{formatMoney(s.totalIncome)}</p>
                      </div>
                    </div>

                    {/* 净额汇总 */}
                    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${net >= 0 ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-red-50/50 border border-red-100'}`}>
                      <span className="text-xs text-slate-500">{netLabel}</span>
                      <span className={`font-mono text-sm font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {net >= 0 ? '+' : ''}{formatMoney(net)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 py-2">暂无台账数据</p>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.section>

    </motion.div>
  )
}
