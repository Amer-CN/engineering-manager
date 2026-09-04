/**
 * ProjectCommandCenter - 项目指挥中心
 *
 * Bento Grid layout with alerts, charts, and data cards.
 */
import React from 'react'
import type { Project, Member, Partner, IncomeContract, ExpenseContract, WorkerTeam, Invoice, Material, Settlement, PaymentRecord } from '@/types'
import { ProjectStatsData } from './ProjectStats'
import { calculateHealthScore, getHealthLevel } from '@/utils/projectHealth'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { Card } from '../../ui/Card'
import { EditorialBars } from '@/components/ui/charts/EditorialBars'
import { DotMatrix } from '@/components/ui/charts/DotMatrix'
import { RungBars } from '@/components/ui/charts/RungBars'
import { TickRing } from '@/components/ui/charts/TickRing'
import { formatMoney } from '@/utils/format'
import { formatDateTime } from '@/utils/date'
import { getCategoryLabel } from '@/components/features/costLedger/config'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { ProjectCommandCenterDetail } from './ProjectCommandCenterDetail'
import { ProjectInsights, ProjectMilestoneTimeline, type InsightItem } from './ProjectInsights'

export interface ProjectCommandCenterProps {
  project: Project; stats: ProjectStatsData; expenseByCategory: Record<string, number>
  materials: Material[]
  incomeContracts: IncomeContract[]; expenseContracts: ExpenseContract[]
  invoices: Invoice[]; partners: Partner[]; paymentRecords: PaymentRecord[]
  settlements: Settlement[]; members: Member[]; workerTeams: WorkerTeam[]
}

const statusConfig: Record<string, { text: string; color: string }> = {
  planning: { text: '筹备中', color: 'bg-[color:var(--muted)]' }, in_progress: { text: '进行中', color: 'bg-success-500' },
  completed: { text: '已完成', color: 'bg-[color:var(--muted)]' }, archived: { text: '已归档', color: 'bg-warning-500' },
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-3 transition-colors" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{icon}</span><span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span></div>
      <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-[color:var(--muted)]"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
}

export function ProjectCommandCenter({ project, stats, expenseByCategory, materials, incomeContracts, expenseContracts, invoices, partners, paymentRecords, settlements }: ProjectCommandCenterProps) {
  const healthScore = calculateHealthScore(project, stats)
  const healthLevel = getHealthLevel(healthScore)
  const status = statusConfig[project.status] || statusConfig.planning

  const collectionRate = stats.incomeTotal > 0 ? Math.round(stats.receivedOutTotal / stats.incomeTotal * 100) : 0

  const incP = incomeContracts.map(c => { const rec = invoices.filter(i => i.contractId === c.id && i.type === 'invoice_out').reduce((s, i) => s + i.receivedAmount, 0); return { ...c, received: rec, progress: c.amount > 0 ? Math.round(rec / c.amount * 100) : 0 } })
  const expP = expenseContracts.map(c => { const rec = invoices.filter(i => i.contractId === c.id && i.type === 'invoice_in').reduce((s, i) => s + i.receivedAmount, 0); return { ...c, received: rec, progress: c.amount > 0 ? Math.round(rec / c.amount * 100) : 0 } })

  // 编辑风成本卡（深色反色卡）：结论式标题 + 梯级柱 + 来源行，全部由 expenseByCategory 真实数据推导
  const costEntries = Object.entries(expenseByCategory)
    .map(([code, amount]) => ({ name: getCategoryLabel(code), amount }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const costTotal = Object.values(expenseByCategory).reduce((s, v) => s + v, 0)
  // 口径展示：类目数用全量条目数（含 0 值/负值冲销类目）；负值存在时来源行诚实注记冲销金额
  const costCategoryCount = Object.keys(expenseByCategory).length
  const costWriteoffTotal = Object.values(expenseByCategory).filter(v => v < 0).reduce((s, v) => s + v, 0)
  const costTop = costEntries.slice(0, 6)
  const costRest = costEntries.slice(6)
  const costBars = costRest.length > 0
    ? [...costTop, { name: '其他', amount: costRest.reduce((s, d) => s + d.amount, 0) }]
    : costTop
  const costTop1 = costEntries[0]
  const costHeadline = costTop1 && costTotal > 0
    ? `${costTop1.name}是最大成本项 · 占 ${Math.round(costTop1.amount / costTotal * 100)}%`
    : ''
  // 墨阶横向条形数据（不再传彩虹色）：冠军 var(--fg)，其余 var(--fg-2)；EditorialBars 契约要求降序传入
  const financeBar = [{ name: '收入合同', value: stats.incomeTotal }, { name: '已回款', value: stats.receivedOutTotal }, { name: '支出合同', value: stats.expenseTotal }, { name: '已付款', value: stats.receivedInTotal }]
  const materialTotalAmt = materials.reduce((s, m) => s + m.price * m.quantity, 0)
  const partnerStats = partners.map(p => ({ ...p, incAmt: incomeContracts.filter(c => c.partnerId === p.id).reduce((s, c) => s + c.amount, 0), expAmt: expenseContracts.filter(c => c.partnerId === p.id).reduce((s, c) => s + c.amount, 0) }))
  const unpaidInvoices = invoices.filter(i => i.status === 'partially_paid' || i.status === 'issued').length

  // S12 Stitch ①：AI 项目洞察 — 从真实数据派生（成本风险 / 回款提醒 / 工期提示）
  const insights: InsightItem[] = []
  if (project.budget > 0 && stats.totalExpenses > project.budget * 0.85) {
    insights.push({ icon: 'TrendingDown', level: stats.totalExpenses > project.budget ? 'danger' : 'warning', text: `预算使用率已达 ${Math.round(stats.totalExpenses / project.budget * 100)}%，${stats.totalExpenses > project.budget ? '已超支' : '接近超支'}，建议复核成本台账`, actionLabel: '查看成本', actionPage: 'costLedger' })
  }
  if (unpaidInvoices > 0) {
    insights.push({ icon: 'Receipt', level: 'warning', text: `${unpaidInvoices} 张发票待处理（未付款/部分付款），请及时跟进`, actionLabel: '去处理', actionPage: 'invoices' })
  }
  if (stats.incomeTotal > 0 && collectionRate < 40) {
    insights.push({ icon: 'Wallet', level: 'warning', text: `收款率仅 ${collectionRate}%，资金回笼偏慢，建议跟进回款`, actionLabel: '回款记录', actionPage: 'invoices' })
  }
  if (project.status === 'in_progress' && project.endDate) {
    const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000)
    if (daysLeft < 0) insights.push({ icon: 'Clock', level: 'danger', text: `工期已逾期 ${Math.abs(daysLeft)} 天，请关注交付风险` })
    else if (daysLeft <= 30) insights.push({ icon: 'Clock', level: 'warning', text: `距计划竣工仅剩 ${daysLeft} 天，临近交付` })
  }
  if (insights.length === 0) {
    insights.push({ icon: 'CheckCircle', level: 'ok', text: '项目运行平稳，暂无需要关注的风险项' })
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>

      {/* ═══ 1. 项目概览卡片 ═══ */}
      <motion.section variants={sectionVariant} className="mb-6">
        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5">
          {/* 项目基本信息 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--accent-soft)] flex items-center justify-center">
                <Icon name="Building2" size={20} className="text-[color:var(--accent)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[color:var(--fg)]">{project.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium ${project.status === 'in_progress' ? 'bg-success-100 text-success-700' : project.status === 'planning' ? 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' : project.status === 'completed' ? 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' : 'bg-warning-100 text-warning-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                    {status.text}
                  </span>
                </div>
                <p className="text-[color:var(--muted)] text-xs mt-0.5">{project.address || '暂无地址'} · {project.projectManagerName || '暂无负责人'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-600">{healthScore}<span className="text-sm font-normal text-[color:var(--muted)]">分</span></p>
                <p className="text-caption text-[color:var(--muted)]">{healthLevel.label}</p>
              </div>
              {/* 编辑风刻度环替换健康度半环：单色墨阶；健康度分段语义色只保留在文字层（分数 text-success-600 例外惯例） */}
              <TickRing percent={healthScore} label="健康度" size={96} />
            </div>
          </div>
          {/* 关键指标 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[color:var(--border)]">
            <div className="p-3 rounded-lg bg-[color:var(--panel-2)]">
              <p className="text-caption text-[color:var(--muted)] mb-0.5">合同总额</p>
              <p className="text-base font-bold text-[color:var(--fg)] font-mono tabular-nums">¥{project.budget > 0 ? (project.budget / 10000).toFixed(1) : '-'}万</p>
            </div>
            <div className="p-3 rounded-lg bg-[color:var(--panel-2)]">
              <p className="text-caption text-[color:var(--muted)] mb-0.5">工期进度</p>
              <p className="text-base font-bold text-[color:var(--fg)]">{stats.timeProgress}%</p>
              <p className="text-caption text-[color:var(--muted)]">{stats.daysElapsed}/{stats.totalDays}天</p>
            </div>
            <div className="p-3 rounded-lg bg-[color:var(--panel-2)]">
              <p className="text-caption text-[color:var(--muted)] mb-0.5">待处理</p>
              <p className="text-base font-bold text-[color:var(--fg)]">{unpaidInvoices}项</p>
              {/* 编辑风点阵：1 点 = 1 张待处理发票 */}
              <div className="mt-1.5"><DotMatrix count={unpaidInvoices} unitLabel="张" dotSize={6} /></div>
              <p className="text-caption text-[color:var(--muted)]">发票待付/待收</p>
            </div>
            <div className="p-3 rounded-lg bg-[color:var(--panel-2)]">
              <p className="text-caption text-[color:var(--muted)] mb-0.5">净利润</p>
              <p className={`text-base font-bold ${stats.netProfit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.netProfit >= 0 ? '+' : ''}¥{(stats.netProfit / 10000).toFixed(1)}万
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ 2. AI 项目洞察（S12 ①，中性表面替代整块铺色横幅） ═══ */}
      <ProjectInsights items={insights} />

      {/* ═══ 3. Finance + Cost ═══ */}
      <motion.section variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card bordered={false} className="border border-[color:var(--border)] p-5" padding="none">
          {/* 卡首：净利润大数字（文字层语义色保留）+ 事实性结论句（数据直接可验证，无形容词） */}
          <p className={`text-xl font-bold font-mono tabular-nums tracking-tight ${stats.netProfit >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{stats.netProfit >= 0 ? '盈利' : '亏损'} ¥{formatMoney(Math.abs(stats.netProfit))}</p>
          <p className="text-caption mt-1" style={{ color: 'var(--muted)' }}>
            已回款 {collectionRate}% · 未回款 ¥{(Math.max(stats.incomeTotal - stats.receivedOutTotal, 0) / 10000).toFixed(1)}万
          </p>
          {/* 主体：左墨阶条形（冠军 var(--fg)，其余 var(--fg-2)，不传彩虹色）+ 右回款率刻度环 */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <EditorialBars
                data={[...financeBar].sort((a, b) => b.value - a.value).map((d, i) => ({ name: d.name, value: d.value, ...(i === 0 ? { color: 'var(--fg)' } : {}) }))}
                formatValue={(v) => `¥${formatMoney(v)}`}
              />
            </div>
            <TickRing percent={collectionRate} label="回款率" size={96} />
          </div>
          {/* 卡底：图例注记 */}
          <p className="mt-4 text-caption tracking-widest" style={{ color: 'var(--muted)' }}>条尾 = 金额 · 环 = 回款率 · 一格 = 1%</p>
        </Card>
        {/* 深色大圆角卡：var(--fg)/var(--bg) 互换的反色技巧（亮色主题=深卡，暗色主题=浅卡），禁写死 hex；
            圆角用 v3 important 前缀覆盖 Card 基类 rounded-xl（同级类名字母序 rounded-xl 在产物中更靠后会胜出） */}
        <Card bordered={false} className="!rounded-2xl bg-[color:var(--fg)] p-5" padding="none">
          {costEntries.length > 0 ? (
            <div className="flex flex-col">
              {/* 卡首：白墨结论标题（真实数据推导）+ 总成本大数字 */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--bg)' }}>{costHeadline}</h3>
                <span className="text-numeric-xl font-mono tabular-nums shrink-0" style={{ color: 'var(--bg)' }}>¥{(costTotal / 10000).toFixed(1)}万</span>
              </div>
              {/* 主体：梯级柱（TOP6 + 其余合并「其他」，降序传入；dark 墨色 = var(--bg)，不用 accent） */}
              <div className="mt-4">
                <RungBars
                  data={costBars.map(d => ({ name: d.name, value: d.amount }))}
                  formatValue={(v) => `¥${(v / 10000).toFixed(1)}万`}
                  tone="dark"
                />
              </div>
              {/* 卡底：来源行（反色 60% 透明度，含冲销口径沿用） */}
              <p className="mt-4 text-caption" style={{ color: 'var(--bg)', opacity: 0.6 }}>
                来源：成本台账 · 共 {costCategoryCount} 类 · 取数 {formatDateTime(new Date())}
                {costWriteoffTotal < 0 ? ` · 含冲销 ¥${formatMoney(Math.abs(costWriteoffTotal))}` : ''}
                {costRest.length > 0 ? ` · 其余 ${costRest.length} 类并入其他` : ''}
              </p>
            </div>
          ) : (
            // 深色卡内联空态：共享 EmptyState 的 var(--muted) 文字压在 var(--fg) 底上对比度不足
            <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--bg)', opacity: 0.6 }}>
              <Icon name="Inbox" size={32} className="mb-2 opacity-40" />
              <p className="text-sm">暂无费用数据</p>
            </div>
          )}
        </Card>
      </motion.section>

      {/* ═══ 4. Contracts + KPIs ═══ */}
      <motion.section variants={sectionVariant} className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card bordered={false} className="border border-[color:var(--border)] p-4" padding="none">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-2 flex items-center gap-2"><Icon name="TrendingUp" size={14} className="text-success-500" /> 收入合同</h3>
            <p className="text-xl font-bold text-success-600 mb-3 font-mono tabular-nums">¥{stats.incomeTotal > 0 ? (stats.incomeTotal / 10000).toFixed(1) : '0'}万</p>
            {incP.length > 0 ? <div className="space-y-2">{incP.slice(0, 4).map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)]">
                <div className="flex justify-between mb-1"><span className="text-xs font-medium text-[color:var(--fg-2)] truncate max-w-[120px]">{c.name}</span><span className="text-xs font-bold text-success-600 font-mono tabular-nums">¥{formatMoney(c.amount)}</span></div>
                <div className="flex items-center gap-2"><div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}><div className="h-full rounded-full transition-transform duration-500" style={{ transformOrigin: 'left', width: '100%', transform: `scaleX(${c.progress / 100})`, background: 'var(--accent)' }} /></div><span className="text-caption w-12 text-right font-mono tabular-nums" style={{ color: 'var(--muted)' }}>已回款 ¥{formatMoney(c.received)}</span></div>
              </div>
            ))}</div> : <EmptyState text="暂无" />}
          </Card>
          <Card bordered={false} className="border border-[color:var(--border)] p-4" padding="none">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-2 flex items-center gap-2"><Icon name="TrendingDown" size={14} className="text-danger-500" /> 支出合同</h3>
            <p className="text-xl font-bold text-danger-500 mb-3 font-mono tabular-nums">¥{stats.expenseTotal > 0 ? (stats.expenseTotal / 10000).toFixed(1) : '0'}万</p>
            {expP.length > 0 ? <div className="space-y-2">{expP.slice(0, 4).map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)]">
                <div className="flex justify-between mb-1"><span className="text-xs font-medium text-[color:var(--fg-2)] truncate max-w-[120px]">{c.name}</span><span className="text-xs font-bold text-danger-500 font-mono tabular-nums">¥{formatMoney(c.amount)}</span></div>
                <div className="flex items-center gap-2"><div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--panel-2)' }}><div className="h-full rounded-full transition-transform duration-500" style={{ transformOrigin: 'left', width: '100%', transform: `scaleX(${c.progress / 100})`, background: 'var(--accent)' }} /></div><span className="text-caption w-12 text-right font-mono tabular-nums" style={{ color: 'var(--muted)' }}>已付款 ¥{formatMoney(c.received)}</span></div>
              </div>
            ))}</div> : <EmptyState text="暂无" />}
          </Card>
        </div>
        <div className="space-y-3">
          <StatCard icon={<Icon name="DollarSign" size={16} />} label="合同总额" value={`¥${(stats.incomeTotal / 10000).toFixed(1)}万`} />
          <StatCard icon={<Icon name="TrendingUp" size={16} />} label="已回款" value={`¥${(stats.receivedOutTotal / 10000).toFixed(1)}万`} sub={`回款率 ${collectionRate}%`} />
          <StatCard icon={<Icon name="Receipt" size={16} />} label="待处理发票" value={`${unpaidInvoices}张`} sub={unpaidInvoices > 0 ? '需要跟进' : '全部已处理'} />
          <StatCard icon={<Icon name="Construction" size={16} />} label="在岗人员" value={`${stats.workerCountTotal}人`} sub={`${stats.staffCount}管理 + ${stats.workerCount}工人`} />
        </div>
      </motion.section>

      <ProjectCommandCenterDetail
        partnerStats={partnerStats}
        invoices={invoices}
        materials={materials}
        materialCount={stats.materialCount}
        materialTotalAmt={materialTotalAmt}
        stats={{ invoiceInTotal: stats.invoiceInTotal, receivedInTotal: stats.receivedInTotal, invoiceOutTotal: stats.invoiceOutTotal, receivedOutTotal: stats.receivedOutTotal }}
      />

      {/* ═══ 6. 关键里程碑时间线（S12 ④，真实日期推导） ═══ */}
      <ProjectMilestoneTimeline
        project={project}
        incomeContracts={incomeContracts}
        expenseContracts={expenseContracts}
        settlements={settlements}
      />

      {/* ═══ 7. Info Footer ═══ */}
      <motion.section variants={sectionVariant} className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-3 flex items-center gap-2"><Icon name="ClipboardList" size={14} /> 项目基本信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[{ l: '项目负责人', v: project.projectManagerName || '-' }, { l: '开工日期', v: project.startDate || '-' }, { l: '竣工日期', v: project.endDate || '-' }, { l: '项目周期', v: project.startDate && project.endDate ? `${Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))}天` : '-' }].map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-[color:var(--panel-2)]"><p className="text-xs text-[color:var(--muted)] mb-0.5">{item.l}</p><p className="font-medium text-[color:var(--fg-2)] text-sm">{item.v}</p></div>
          ))}
        </div>
        {project.description && <div className="p-3 rounded-lg bg-[color:var(--panel-2)]"><p className="text-xs text-[color:var(--muted)] mb-1">项目描述</p><p className="text-sm text-[color:var(--fg-2)]">{project.description}</p></div>}
      </motion.section>

    </motion.div>
  )
}
