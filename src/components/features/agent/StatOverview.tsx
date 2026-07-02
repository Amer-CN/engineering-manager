/**
 * StatOverview — 6 张真实数据概览卡
 *
 * useQuery(['dashboard-stats']) → getAPI().getDashboardStats()
 * 每卡 onClick → navigate 到对应模块
 * 骨架屏 + 失败重试
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { getAPI } from '@/services/api-adapter'
import type { DashboardStats } from '@/types/electron'
import CountUp from '@/components/features/dashboard/CountUp'
import { formatCurrency } from '@/components/features/dashboard/dashboardConstants'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { navigateTo } from './types'

interface StatCardDef {
  key: string
  label: string
  icon: string
  iconBg: string
  pageId: string
  getVal: (s: DashboardStats) => { num: number; text: string }
}

const CARD_DEFS: StatCardDef[] = [
  {
    key: 'projects', label: '项目', icon: 'FolderKanban', iconBg: 'bg-blue-50 text-blue-600',
    pageId: 'projects',
    getVal: s => ({ num: s.projectsCount, text: `${s.inProgressProjects} 进行中` }),
  },
  {
    key: 'settlements', label: '待办结算', icon: 'ClipboardList', iconBg: 'bg-amber-50 text-amber-600',
    pageId: 'settlement',
    getVal: s => ({ num: s.settlementsCount, text: '待办理' }),
  },
  {
    key: 'invoices', label: '发票', icon: 'Receipt', iconBg: 'bg-teal-50 text-teal-600',
    pageId: 'invoices',
    getVal: s => ({ num: s.invoicesCount, text: '收票 / 开票' }),
  },
  {
    key: 'costLedger', label: '成本', icon: 'Wallet', iconBg: 'bg-emerald-50 text-emerald-600',
    pageId: 'costLedger',
    getVal: s => ({ num: s.totalExpenses, text: '累计支出' }),
  },
  {
    key: 'inventory', label: '库存', icon: 'Package', iconBg: 'bg-orange-50 text-orange-600',
    pageId: 'inventory',
    getVal: s => ({ num: s.inventoryItemsCount, text: '物料数' }),
  },
  {
    key: 'members', label: '人员', icon: 'Users', iconBg: 'bg-violet-50 text-violet-600',
    pageId: 'hr',
    getVal: s => ({ num: s.membersCount, text: '管理人员 + 工人' }),
  },
]

/** 骨架卡片 */
const SkeletonCard: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg bg-slate-100" />
      <div className="h-3 w-16 bg-slate-100 rounded" />
    </div>
    <div className="h-6 w-20 bg-slate-100 rounded mb-1" />
    <div className="h-3 w-24 bg-slate-50 rounded" />
  </div>
)

const StatOverview: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getDashboardStats()
      if (!res.success || !res.data) throw new Error(res.error || '获取统计数据失败')
      return res.data
    },
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mb-6 p-6 rounded-2xl border border-slate-200 bg-white text-center">
        <Icon name="AlertCircle" size={24} className="text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500 mb-3">数据加载失败</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          点击重试
        </button>
      </div>
    )
  }

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
    >
      {CARD_DEFS.map((card) => {
        const val = card.getVal(data)
        const isCurrency = card.key === 'costLedger'
        return (
          <motion.div
            key={card.key}
            variants={sectionVariant}
            whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo(card.pageId)}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm cursor-pointer transition-shadow"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <Icon name={card.icon} size={14} />
              </span>
              <span className="text-xs text-slate-400">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {isCurrency ? (
                formatCurrency(val.num)
              ) : (
                <CountUp value={val.num} />
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{val.text}</p>
          </motion.div>
        )
      })}
    </motion.section>
  )
}

export default StatOverview
