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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts'
import { formatMoney } from '@/utils/format'

export interface ProjectCommandCenterProps {
  project: Project; stats: ProjectStatsData; expenseByCategory: Record<string, number>
  materials: Material[]
  incomeContracts: IncomeContract[]; expenseContracts: ExpenseContract[]
  invoices: Invoice[]; partners: Partner[]; paymentRecords: PaymentRecord[]
  settlements: Settlement[]; members: Member[]; workerTeams: WorkerTeam[]
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#f59e0b']

const partnerRoleLabels: Record<string, string> = {
  owner: '建设单位', general_contract: '总承包', professional: '专业分包',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
  design: '设计单位', supervisor: '监理单位', survey: '地勘单位',
  testing: '检测单位', other: '其他',
}

const statusConfig: Record<string, { text: string; color: string }> = {
  planning: { text: '筹备中', color: 'bg-blue-500' }, in_progress: { text: '进行中', color: 'bg-emerald-500' },
  completed: { text: '已完成', color: 'bg-slate-400' }, archived: { text: '已归档', color: 'bg-amber-500' },
}

const sectionV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function StatCard({ icon, accent, label, value, sub }: { icon: React.ReactNode; accent: string; label: string; value: string; sub?: string }) {
  return (
    <Card bordered={false} className="border border-slate-200 p-3 hover:shadow-md transition-all duration-200" padding="none">
      <div className="flex items-center gap-2 mb-1"><span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</span><span className="text-xs text-slate-400">{label}</span></div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
}

export function ProjectCommandCenter({ project, stats, expenseByCategory, materials, incomeContracts, expenseContracts, invoices, partners, paymentRecords }: ProjectCommandCenterProps) {
  const healthScore = calculateHealthScore(project, stats)
  const healthLevel = getHealthLevel(healthScore)
  const status = statusConfig[project.status] || statusConfig.planning

  const laborCats = ['人工费', '工资', '劳务费', '管理人员薪酬', '社保', '公积金']
  const materialCats = ['材料费', '材料采购', '建材', '石材', '钢材', '水泥', '混凝土']
  const machineryCats = ['机械费', '设备租赁', '机械租赁', '台班费']
  const laborT = Object.entries(expenseByCategory).filter(([c]) => laborCats.some(l => c.includes(l))).reduce((s, [, v]) => s + v, 0)
  const materialCT = Object.entries(expenseByCategory).filter(([c]) => materialCats.some(l => c.includes(l))).reduce((s, [, v]) => s + v, 0)
  const machineryT = Object.entries(expenseByCategory).filter(([c]) => machineryCats.some(l => c.includes(l))).reduce((s, [, v]) => s + v, 0)
  const allCats = [...laborCats, ...materialCats, ...machineryCats]
  const otherT = Object.entries(expenseByCategory).filter(([c]) => !allCats.some(k => c.includes(k))).reduce((s, [, v]) => s + v, 0)
  const costTotal = laborT + materialCT + machineryT + otherT
  const collectionRate = stats.incomeTotal > 0 ? Math.round(stats.receivedOutTotal / stats.incomeTotal * 100) : 0

  const incP = incomeContracts.map(c => { const rec = invoices.filter(i => i.contractId === c.id && i.type === 'invoice_out').reduce((s, i) => s + i.receivedAmount, 0); return { ...c, received: rec, progress: c.amount > 0 ? Math.round(rec / c.amount * 100) : 0 } })
  const expP = expenseContracts.map(c => { const rec = invoices.filter(i => i.contractId === c.id && i.type === 'invoice_in').reduce((s, i) => s + i.receivedAmount, 0); return { ...c, received: rec, progress: c.amount > 0 ? Math.round(rec / c.amount * 100) : 0 } })

  const costDonut = [{ name: '人工', value: laborT, color: '#3b82f6' }, { name: '材料', value: materialCT, color: '#10b981' }, { name: '机械', value: machineryT, color: '#f97316' }, { name: '其他', value: otherT, color: '#8b5cf6' }].filter(d => d.value > 0)
  const financeBar = [{ name: '收入合同', value: stats.incomeTotal, color: '#10b981' }, { name: '已回款', value: stats.receivedOutTotal, color: '#34d399' }, { name: '支出合同', value: stats.expenseTotal, color: '#ef4444' }, { name: '已付款', value: stats.receivedInTotal, color: '#f87171' }]
  const healthGauge = [{ name: '健康度', value: healthScore, fill: healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#3b82f6' : healthScore >= 40 ? '#f59e0b' : '#ef4444' }]
  const materialTotalAmt = materials.reduce((s, m) => s + m.price * m.quantity, 0)
  const partnerStats = partners.map(p => ({ ...p, incAmt: incomeContracts.filter(c => c.partnerId === p.id).reduce((s, c) => s + c.amount, 0), expAmt: expenseContracts.filter(c => c.partnerId === p.id).reduce((s, c) => s + c.amount, 0) }))
  const unpaidInvoices = invoices.filter(i => i.status === 'partially_paid' || i.status === 'issued').length
  const hasAlerts = unpaidInvoices > 0 || (project.budget > 0 && stats.totalExpenses > project.budget * 0.85)

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>

      {/* ═══ 1. Hero ═══ */}
      <motion.section variants={sectionV} className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]" />
        {/* 装饰光点 */}
        <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-cyan-400"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Icon name="Building2" size={28} /></div>
            <div>
              <div className="flex items-center gap-3 flex-wrap"><h2 className="text-2xl font-bold tracking-tight">{project.name}</h2><span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15"><span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />{status.text}</span></div>
              <p className="text-white/50 text-sm mt-1">{project.address || '暂无地址'}{project.projectManagerName && <span> — {project.projectManagerName}</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10">
            <div className="w-[72px] h-[72px]"><ResponsiveContainer width="100%" height="100%"><RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={8} data={healthGauge} startAngle={180} endAngle={0}><RadialBar dataKey="value" cornerRadius={4} animationDuration={1200} animationEasing="ease-out" /></RadialBarChart></ResponsiveContainer></div>
            <div><p className="text-3xl font-bold text-emerald-300">{healthScore}</p><p className="text-xs text-emerald-300/80">{healthLevel.label}</p><p className="text-[10px] text-white/30 mt-0.5">健康指数</p></div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[{ l: '合同总额', v: `¥${project.budget > 0 ? (project.budget / 10000).toFixed(1) : '-'}万` }, { l: '工期进度', v: `${stats.timeProgress}%`, s: `${stats.daysElapsed}/${stats.totalDays}天` }, { l: '待处理', v: `${unpaidInvoices}项`, s: `发票待付/待收` }, { l: '净利润', v: `${stats.netProfit >= 0 ? '+' : ''}¥${(stats.netProfit / 10000).toFixed(1)}万`, a: stats.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300' }].map((k, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/10"><p className="text-xs text-white/60">{k.l}</p><p className={`text-lg font-bold mt-0.5 ${(k as any).a || ''}`}>{k.v}</p>{(k as any).s && <p className="text-xs text-white/40">{(k as any).s}</p>}</div>
          ))}
        </div>
      </motion.section>

      {/* ═══ 2. Alerts ═══ */}
      {hasAlerts && (
        <motion.section variants={sectionV} className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Icon name="AlertTriangle" size={16} className="text-amber-600" /></div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-700 text-sm">需要关注</p>
              {unpaidInvoices > 0 && <p className="text-sm text-slate-600">{unpaidInvoices} 张发票待处理（未付款/部分付款），请及时跟进</p>}
              {project.budget > 0 && stats.totalExpenses > project.budget * 0.85 && <p className="text-sm text-slate-600">预算使用率 {Math.round(stats.totalExpenses / project.budget * 100)}%，接近超支</p>}
              {stats.incomeTotal > 0 && collectionRate < 40 && <p className="text-sm text-slate-600">收款率仅 {collectionRate}%，资金回笼偏慢</p>}
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══ 3. Finance + Cost ═══ */}
      <motion.section variants={sectionV} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card bordered={false} className="border border-slate-200 p-5" padding="none">
          <p className={`text-xl font-bold mb-2 ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{stats.netProfit >= 0 ? '盈利' : '亏损'} ¥{formatMoney(Math.abs(stats.netProfit))}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={financeBar} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `¥${(v / 10000).toFixed(0)}万`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                // @ts-ignore - Recharts formatter type mismatch
                formatter={(v: any) => [`¥${formatMoney(v as number)}`, '']} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} animationDuration={1200} animationEasing="ease-out">{financeBar.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card bordered={false} className="border border-slate-200 p-5" padding="none">
          {costDonut.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-[160px] h-[160px] flex-shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={costDonut} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0} animationDuration={1200} animationEasing="ease-out">{costDonut.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer></div>
              <div className="flex-1 space-y-2 text-sm">
                {costDonut.map((d, i) => (
                  <div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} /><span className="text-slate-600">{d.name}</span></div><span className="font-medium text-slate-800">¥{(d.value / 10000).toFixed(1)}万 <span className="text-xs text-slate-400">{costTotal > 0 ? Math.round(d.value / costTotal * 100) : 0}%</span></span></div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex justify-between"><span className="text-slate-500">总成本</span><span className="font-bold text-slate-800">¥{(costTotal / 10000).toFixed(1)}万</span></div>
              </div>
            </div>
          ) : <EmptyState text="暂无费用数据" />}
        </div>
      </motion.section>

      {/* ═══ 4. Contracts + KPIs ═══ */}
      <motion.section variants={sectionV} className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Icon name="TrendingUp" size={14} className="text-emerald-500" /> 收入合同</h3>
            <p className="text-xl font-bold text-emerald-600 mb-3">¥{stats.incomeTotal > 0 ? (stats.incomeTotal / 10000).toFixed(1) : '0'}万</p>
            {incP.length > 0 ? <div className="space-y-2">{incP.slice(0, 4).map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between mb-1"><span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{c.name}</span><span className="text-xs font-bold text-emerald-600">¥{formatMoney(c.amount)}</span></div>
                <div className="flex items-center gap-2"><div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${c.progress}%` }} /></div><span className="text-[10px] text-slate-400 w-12 text-right">已回款 ¥{formatMoney(c.received)}</span></div>
              </div>
            ))}</div> : <EmptyState text="暂无" />}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Icon name="TrendingDown" size={14} className="text-red-500" /> 支出合同</h3>
            <p className="text-xl font-bold text-red-500 mb-3">¥{stats.expenseTotal > 0 ? (stats.expenseTotal / 10000).toFixed(1) : '0'}万</p>
            {expP.length > 0 ? <div className="space-y-2">{expP.slice(0, 4).map(c => (
              <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between mb-1"><span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{c.name}</span><span className="text-xs font-bold text-red-500">¥{formatMoney(c.amount)}</span></div>
                <div className="flex items-center gap-2"><div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all" style={{ width: `${c.progress}%` }} /></div><span className="text-[10px] text-slate-400 w-12 text-right">已付款 ¥{formatMoney(c.received)}</span></div>
              </div>
            ))}</div> : <EmptyState text="暂无" />}
          </div>
        </div>
        <div className="space-y-3">
          <StatCard icon={<Icon name="DollarSign" size={16} className="text-blue-500" />} accent="bg-blue-50" label="合同总额" value={`¥${(stats.incomeTotal / 10000).toFixed(1)}万`} />
          <StatCard icon={<Icon name="TrendingUp" size={16} className="text-emerald-500" />} accent="bg-emerald-50" label="已回款" value={`¥${(stats.receivedOutTotal / 10000).toFixed(1)}万`} sub={`回款率 ${collectionRate}%`} />
          <StatCard icon={<Icon name="Receipt" size={16} className="text-purple-500" />} accent="bg-purple-50" label="待处理发票" value={`${unpaidInvoices}张`} sub={unpaidInvoices > 0 ? '需要跟进' : '全部已处理'} />
          <StatCard icon={<Icon name="Construction" size={16} className="text-amber-500" />} accent="bg-amber-50" label="在岗人员" value={`${stats.workerCountTotal}人`} sub={`${stats.staffCount}管理 + ${stats.workerCount}工人`} />
        </div>
      </motion.section>

      {/* ═══ 5. Partners + Invoices + Materials ═══ */}
      <motion.section variants={sectionV} className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Icon name="Building2" size={14} /> 关联单位 ({stats.partnerCount})</h3>
          {partnerStats.length > 0 ? (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {partnerStats.map(p => (
                <div key={p.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center"><Icon name="Building2" size={12} className="text-violet-600" /></div><span className="text-xs font-medium text-slate-700 truncate">{p.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 ml-auto flex-shrink-0">{partnerRoleLabels[p.category] || p.category}</span></div>
                  {(p.incAmt > 0 || p.expAmt > 0) && <div className="flex gap-2 text-[10px]">{p.incAmt > 0 && <span className="text-emerald-600">收入 ¥{(p.incAmt / 10000).toFixed(1)}万</span>}{p.expAmt > 0 && <span className="text-red-500">支出 ¥{(p.expAmt / 10000).toFixed(1)}万</span>}</div>}
                </div>
              ))}
            </div>
          ) : <EmptyState text="暂无关联单位" />}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Icon name="Receipt" size={14} /> 发票概览</h3>
          {invoices.length > 0 ? (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {invoices.slice(0, 6).map(inv => {
                const statusColors: Record<string, string> = { '已付清': 'bg-emerald-100 text-emerald-700', '已收齐': 'bg-emerald-100 text-emerald-700', '部分付款': 'bg-amber-100 text-amber-700', '部分收款': 'bg-amber-100 text-amber-700', '已收票': 'bg-blue-100 text-blue-700', '已开具': 'bg-blue-100 text-blue-700' }
                const sc = statusColors[inv.status] || 'bg-slate-100 text-slate-500'
                return (
                  <div key={inv.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-xs text-slate-700 truncate flex-1 min-w-0">{inv.invoiceNo || '无号'}</span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">¥{formatMoney(inv.amount)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sc}`}>{inv.status}</span>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState text="暂无发票" />}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Icon name="Package" size={14} /> 材料使用</h3>
          <div className="flex items-center gap-3 mb-3 text-xs"><span className="text-slate-400">{stats.materialCount}种</span><span className="w-px h-3 bg-slate-200" /><span className="font-bold text-violet-600">¥{formatMoney(materialTotalAmt)}</span></div>
          {materials.length > 0 ? (
            <div className="space-y-1 max-h-[220px] overflow-y-auto">
              {materials.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-xs">
                  <span className="text-slate-600 truncate max-w-[100px]">{m.name}</span><span className="text-slate-400">{m.quantity}{m.unit}</span><span className="font-medium text-violet-600">¥{formatMoney((m.price * m.quantity))}</span>
                </div>
              ))}
              {materials.length > 8 && <p className="text-center text-xs text-slate-400 pt-1">还有 {materials.length - 8} 种...</p>}
            </div>
          ) : <EmptyState text="暂未登记材料" />}
        </div>
      </motion.section>

      {/* ═══ 6. Invoice stats + Info ═══ */}
      <motion.section variants={sectionV} className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {[{ l: '收票总额', v: `¥${formatMoney(stats.invoiceInTotal)}`, s: `已付款 ¥${formatMoney(stats.receivedInTotal)}`, cls: 'border-emerald-200 bg-emerald-50' },
          { l: '开票总额', v: `¥${formatMoney(stats.invoiceOutTotal)}`, s: `已回款 ¥${formatMoney(stats.receivedOutTotal)}`, cls: 'border-blue-200 bg-blue-50' },
          { l: '应付未付', v: `¥${formatMoney(Math.max(0, stats.invoiceInTotal - stats.receivedInTotal))}`, s: '已收票，尚未付款', cls: 'border-amber-200 bg-amber-50' },
          { l: '应收未收', v: `¥${formatMoney(Math.max(0, stats.invoiceOutTotal - stats.receivedOutTotal))}`, s: '发票已开尚未收款', cls: 'border-red-200 bg-red-50' },
        ].map((card, i) => (
          <div key={i} className={`bg-white border border-slate-200 rounded-xl shadow-sm p-3 border ${card.cls}`}>
            <p className="text-xs text-slate-400 mb-1">{card.l}</p><p className="text-lg font-bold text-slate-800">{card.v}</p><p className="text-xs text-slate-400">{card.s}</p>
          </div>
        ))}
      </motion.section>

      {/* ═══ 7. Info Footer ═══ */}
      <motion.section variants={sectionV} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><Icon name="ClipboardList" size={14} /> 项目基本信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[{ l: '项目负责人', v: project.projectManagerName || '-' }, { l: '开工日期', v: project.startDate || '-' }, { l: '竣工日期', v: project.endDate || '-' }, { l: '项目周期', v: project.startDate && project.endDate ? `${Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))}天` : '-' }].map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-400 mb-0.5">{item.l}</p><p className="font-medium text-slate-700 text-sm">{item.v}</p></div>
          ))}
        </div>
        {project.description && <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-400 mb-1">项目描述</p><p className="text-sm text-slate-600">{project.description}</p></div>}
      </motion.section>

    </motion.div>
  )
}
