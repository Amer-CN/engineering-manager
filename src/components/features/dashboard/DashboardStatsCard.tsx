import React from 'react'
import { motion } from 'framer-motion'
import { DashboardStats } from '../../../types/electron'
import { Icon } from '@/components/ui/Icon'
import { sectionVariant } from '@/constants/animations'
import CountUp from './CountUp'
import { statCards, cardHover, formatCurrency } from './dashboardConstants'

interface StatValue { primary: string; secondary: string; progress?: number; raw?: number }

const getStatValue = (stats: DashboardStats | null, key: string): StatValue => {
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

interface DashboardStatsCardProps {
  stats: DashboardStats | null
}

const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({ stats }) => {
  return (
    <motion.section variants={sectionVariant} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {statCards.map((card, i) => {
        const val = getStatValue(stats, card.key)
        return (
          <motion.div
            key={card.key}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: i * 0.03 } } }}
            whileHover={cardHover}
            whileTap={{ scale: 0.98 }}
            className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-3 transition-shadow duration-200 cursor-default"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}><Icon name={card.icon} size={14} /></span>
              <span className="text-xs text-[color:var(--muted)]">{card.label}</span>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums tracking-tight text-[color:var(--fg)]">
              {val.raw !== undefined && val.raw > 999 ? (
                <CountUp value={val.raw} />
              ) : val.raw !== undefined ? (
                <CountUp value={val.raw} />
              ) : val.primary}
            </p>
            <p className="text-xs text-[color:var(--muted)]">{val.secondary}</p>
            {val.progress !== undefined && (
              <div className="mt-2 h-1 bg-[color:var(--panel-2)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[color:var(--accent)] rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: val.progress / 100 }}
                  style={{ transformOrigin: 'left', width: '100%' }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                />
              </div>
            )}
          </motion.div>
        )
      })}
    </motion.section>
  )
}

export default DashboardStatsCard
