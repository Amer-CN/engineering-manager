/**
 * ProjectInsights — S12 概览驾驶舱的「AI 项目洞察」与「关键里程碑时间线」
 * 洞察从真实项目数据派生（预算/回款/发票/工期），非等大卡片墙：
 * 每条 = 细线墨色图标 + 一句摘要 + 小语义状态点 + 文字行动入口。
 * 时间线由真实日期字段推导（开工/竣工/最近合同签订/最近结算）。
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { sectionVariant } from '@/constants/animations'
import type { Project, Settlement, IncomeContract, ExpenseContract } from '@/types'

export interface InsightItem {
  icon: string
  text: string
  level: 'danger' | 'warning' | 'ok'
  actionLabel?: string
  actionPage?: string
}

const LEVEL_DOT: Record<InsightItem['level'], string> = {
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  ok: 'bg-success-500',
}

/** S12 ①：AI 项目洞察（中性表面列表，语义色仅小圆点） */
export function ProjectInsights({ items }: { items: InsightItem[] }) {
  if (items.length === 0) return null
  return (
    <motion.section variants={sectionVariant} className="mb-6 bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3 flex items-center gap-2">
        <Icon name="Sparkles" size={14} /> AI 项目洞察
      </h3>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={i} className={`flex items-center gap-3 py-2 ${i < items.length - 1 ? 'border-b border-[color:var(--border)]' : ''}`}>
            <Icon name={it.icon} size={16} className="text-[color:var(--fg-2)] shrink-0" />
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEVEL_DOT[it.level]}`} />
            <p className="flex-1 text-sm text-[color:var(--fg-2)] min-w-0">{it.text}</p>
            {it.actionLabel && it.actionPage && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: it.actionPage }))}
                className="text-xs font-medium text-[color:var(--accent)] hover:opacity-80 shrink-0 flex items-center gap-0.5"
              >
                {it.actionLabel} <Icon name="ChevronRight" size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

interface TimelineNode {
  date: string
  label: string
  sub?: string
  state: 'done' | 'current' | 'future'
}

/** S12 ④：关键里程碑时间线（发丝线，真实日期推导） */
export function ProjectMilestoneTimeline({ project, incomeContracts, expenseContracts, settlements }: {
  project: Project
  incomeContracts: IncomeContract[]
  expenseContracts: ExpenseContract[]
  settlements: Settlement[]
}) {
  const nodes = useMemo<TimelineNode[]>(() => {
    const now = new Date().toISOString().slice(0, 10)
    const list: TimelineNode[] = []
    if (project.startDate) list.push({ date: project.startDate, label: '项目开工', state: project.startDate <= now ? 'done' : 'future' })
    // 最近签订的合同（最多 2 条）
    const contracts = [...incomeContracts, ...expenseContracts]
      .filter(c => c.signedDate)
      .sort((a, b) => (b.signedDate || '').localeCompare(a.signedDate || ''))
      .slice(0, 2)
    for (const c of contracts) {
      list.push({ date: c.signedDate, label: `签订合同：${c.name}`, sub: c.contractNo || undefined, state: c.signedDate <= now ? 'done' : 'future' })
    }
    // 最近结算（最多 2 条）
    const recentSettlements = settlements
      .filter(s => s.settlementDate)
      .sort((a, b) => (b.settlementDate || '').localeCompare(a.settlementDate || ''))
      .slice(0, 2)
    for (const s of recentSettlements) {
      list.push({ date: s.settlementDate!, label: `结算办理：${s.name}`, sub: s.settlementNo || undefined, state: 'done' })
    }
    if (project.endDate) list.push({ date: project.endDate, label: '计划竣工', state: project.endDate <= now ? 'done' : 'future' })
    // 按日期排序 + 标记"当前"节点（最后一个已完成节点之后的第一个未来节点前）
    list.sort((a, b) => a.date.localeCompare(b.date))
    return list
  }, [project, incomeContracts, expenseContracts, settlements])

  if (nodes.length === 0) return null

  return (
    <motion.section variants={sectionVariant} className="mb-6 bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-4 flex items-center gap-2">
        <Icon name="Clock" size={14} /> 关键里程碑与近期动态
      </h3>
      <div className="flex flex-col">
        {nodes.map((n, i) => (
          <div key={`${n.date}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.state === 'done' ? 'bg-[color:var(--fg)]' : 'bg-[color:var(--border-strong)]'}`} />
              {i < nodes.length - 1 && <span className="w-px flex-1 bg-[color:var(--border)] my-1" />}
            </div>
            <div className={`flex-1 min-w-0 ${i < nodes.length - 1 ? 'pb-4' : ''}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className={`text-sm leading-tight truncate ${n.state === 'done' ? 'font-medium text-[color:var(--fg)]' : 'text-[color:var(--muted)]'}`}>{n.label}</p>
                <span className="text-xs font-mono tabular-nums text-[color:var(--muted)] shrink-0">{n.date}</span>
              </div>
              {n.sub && <p className="text-xs font-mono tabular-nums text-[color:var(--muted)] mt-0.5">{n.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
