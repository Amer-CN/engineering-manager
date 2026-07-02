/**
 * InsightPanel — 智能建议面板（本批客户端粗算）
 *
 * 合并 getInvoices() + getDashboardStats() + getWageOverdueStats()
 * 生成建议条 {severity, icon, title, desc, action}
 * action: ask(注入 Composer 并发送) 或 navigate
 * 全部按权限过滤，无建议给友好空态
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { getAPI } from '@/services/api-adapter'
import type { Invoice } from '@/types/electron'
import { usePermission } from '@/hooks/usePermission'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { navigateTo } from './types'

interface InsightItem {
  severity: 'warning' | 'info' | 'danger'
  icon: string
  title: string
  desc: string
  action: { type: 'ask'; prompt: string } | { type: 'navigate'; page: string }
  actionLabel: string
}

interface InsightPanelProps {
  onAsk: (prompt: string) => void
}

const severityStyles: Record<string, { bg: string; border: string; icon: string }> = {
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
}

const InsightPanel: React.FC<InsightPanelProps> = ({ onAsk }) => {
  const { can } = usePermission()

  const invoicesQuery = useQuery({
    queryKey: ['insight-invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const api = await getAPI()
      const res = await api.getInvoices()
      return res.success && res.data ? res.data : []
    },
    staleTime: 30_000,
    enabled: can('invoices:read' as any),
  })

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getDashboardStats()
      return res.success && res.data ? res.data : null
    },
    staleTime: 30_000,
  })

  const wageQuery = useQuery({
    queryKey: ['insight-wages'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getWageOverdueStats()
      return res.success && res.data ? res.data : null
    },
    staleTime: 30_000,
    enabled: can('wages:read' as any),
  })

  const isLoading = invoicesQuery.isLoading || statsQuery.isLoading

  // ── 生成建议 ──
  const insights: InsightItem[] = []

  // 发票建议
  if (can('invoices:read' as any) && invoicesQuery.data) {
    const pendingInvoices = invoicesQuery.data.filter(
      inv => inv.status === 'issued' || inv.status === 'partially_paid',
    )
    if (pendingInvoices.length > 0) {
      insights.push({
        severity: 'warning',
        icon: 'Receipt',
        title: `${pendingInvoices.length} 张发票待处理`,
        desc: '有发票尚未完成收付款，建议及时跟进',
        action: { type: 'ask', prompt: `目前有 ${pendingInvoices.length} 张待处理发票，请帮我列出详情` },
        actionLabel: '问 AI',
      })
    }
  }

  // 结算建议
  if (statsQuery.data && statsQuery.data.settlementsCount > 0) {
    insights.push({
      severity: 'info',
      icon: 'ClipboardList',
      title: `${statsQuery.data.settlementsCount} 项待办结算`,
      desc: '有结算单待办理，建议尽快处理',
      action: { type: 'navigate', page: 'settlement' },
      actionLabel: '去办理',
    })
  }

  // 工资逾期建议
  if (can('wages:read' as any) && wageQuery.data) {
    const wd = wageQuery.data as any
    const overdueCount = wd.overdueWorkerCount ?? wd.count ?? 0
    const overdueAmount = wd.totalOverdueAmount ?? wd.amount ?? 0
    if (overdueCount > 0) {
      insights.push({
        severity: 'danger',
        icon: 'AlertTriangle',
        title: `${overdueCount} 名工人工资逾期`,
        desc: overdueAmount > 0 ? `逾期金额 ¥${(overdueAmount / 10000).toFixed(1)}万` : '请尽快处理',
        action: { type: 'navigate', page: 'labor' },
        actionLabel: '去查看',
      })
    }
  }

  const handleAction = (item: InsightItem) => {
    if (item.action.type === 'ask') {
      onAsk(item.action.prompt)
    } else {
      navigateTo(item.action.page)
    }
  }

  // ── 渲染 ──
  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Icon name="Lightbulb" size={16} className="text-slate-400" />
          智能建议
        </h3>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="p-3 rounded-xl border border-slate-100 bg-white animate-pulse">
              <div className="h-4 w-32 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-48 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.section variants={staggerContainer} initial="hidden" animate="visible">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Icon name="Lightbulb" size={16} className="text-slate-400" />
        智能建议
      </h3>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-slate-100 bg-white">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <Icon name="CheckCircle" size={24} className="text-emerald-500" />
          </div>
          <p className="text-sm text-slate-500">一切正常，暂无待处理事项</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((item, i) => {
            const style = severityStyles[item.severity]
            return (
              <motion.div
                key={i}
                variants={sectionVariant}
                className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${style.icon}`}>
                  <Icon name={item.icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleAction(item)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white/70 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
                >
                  {item.actionLabel}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.section>
  )
}

export default InsightPanel
