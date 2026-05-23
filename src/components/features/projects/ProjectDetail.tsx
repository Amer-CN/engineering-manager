/**
 * ProjectDetail - 项目详情页
 *
 * Glass header, animated tab bar, 6 tabs with clean card design.
 */
import { useState, useEffect, useMemo } from 'react'
import type { Project, Member, Partner, IncomeContract, ExpenseContract, WorkerTeam, Invoice, Material, Settlement, PaymentRecord, CostLedgerEntry } from '@/types'
import { ProjectStats, ProjectStatsData } from './ProjectStats'
import { ProjectCommandCenter } from './ProjectCommandCenter'
import { CostLedgerAnalytics } from '../costLedger/CostLedgerAnalytics'
import { useCostLedgerCategories } from '@/hooks/useCostLedgerCategories'
import { motion, AnimatePresence } from 'framer-motion'
import PageContainer from '../../ui/PageContainer'
import { Icon } from '../../ui/Icon'
import { ContractsTab, InvoicesTab, MembersTab, PartnersTab } from './ProjectDetailTabs'

const statusLabels: Record<string, { text: string; color: string; dot: string }> = {
  planning: { text: '筹备中', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { text: '进行中', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { text: '已完成', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  archived: { text: '已归档', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
}

type DetailTab = 'overview' | 'contracts' | 'invoices' | 'members' | 'expenses' | 'partners'

export interface ProjectDetailProps {
  project: Project; members: Member[]; allMembers?: Member[]
  onBack: () => void; onEdit: (project: Project) => void
}

export function ProjectDetail({ project, members, allMembers, onBack, onEdit }: ProjectDetailProps) {
  const { categories } = useCostLedgerCategories()
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [incomeContracts, setIncomeContracts] = useState<IncomeContract[]>([])
  const [expenseContracts, setExpenseContracts] = useState<ExpenseContract[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [projectWorkers, setProjectWorkers] = useState<any[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [costLedgerEntries, setCostLedgerEntries] = useState<CostLedgerEntry[]>([])

  useEffect(() => { loadProjectDetail() }, [project.id])

  const loadProjectDetail = async () => {
    setLoading(true)
    try {
      const [invoicesR, incomeR, expenseR, partnersR, teamsR, projectWorkersR, materialsR, settlementsR, paymentsR, costLedgerR] = await Promise.all([
        window.electronAPI.getInvoices(), window.electronAPI.getIncomeContracts(project.id),
        window.electronAPI.getExpenseContracts(project.id), window.electronAPI.getPartners(),
        window.electronAPI.getWorkerTeams(), window.electronAPI.getProjectWorkers(project.id),
        window.electronAPI.getMaterials(project.id),
        window.electronAPI.getSettlements(project.id), window.electronAPI.getWagePaymentRecords(),
        window.electronAPI.getCostLedger(project.id),
      ])
      if (invoicesR.success) setInvoices((invoicesR.data || []).filter((i: Invoice) => i.projectId === project.id))
      if (incomeR.success) setIncomeContracts(incomeR.data || [])
      if (expenseR.success) setExpenseContracts(expenseR.data || [])
      if (partnersR.success) setPartners((partnersR.data || []).filter((p: Partner) => p.projectIds?.includes(project.id)))
      if (teamsR.success) setWorkerTeams((teamsR.data || []).filter((t: WorkerTeam) => t.projectId === project.id))
      if (projectWorkersR.success) setProjectWorkers(projectWorkersR.data || [])
      if (materialsR.success) setMaterials(materialsR.data || [])
      if (settlementsR.success) setSettlements((settlementsR.data || []).filter((s: Settlement) => s.projectId === project.id))
      if (paymentsR.success) setPaymentRecords((paymentsR.data || []).filter((p: PaymentRecord) => p.projectId === project.id))
      if (costLedgerR.success) setCostLedgerEntries(costLedgerR.data || [])
    } catch (e) { console.error('加载项目详情失败:', e) }
    finally { setLoading(false) }
  }

  const materialTotal = materials.reduce((s, m) => s + m.price * m.quantity, 0)
  const totalRevenue = incomeContracts.reduce((s, c) => s + c.amount, 0)
  const expenseContractTotal = expenseContracts.reduce((s, c) => s + c.amount, 0)
  const totalExpensesCalc = costLedgerEntries.filter(e => e.direction === 'expense').reduce((s, e) => s + e.amount, 0)
  const totalCost = expenseContractTotal + materialTotal
  const workerCount = workerTeams.reduce((s, t) => s + projectWorkers.filter((pw: any) => pw.teamId === t.id).length, 0)

  const now = new Date()
  const startDate = project.startDate ? new Date(project.startDate) : null
  const endDate = project.endDate ? new Date(project.endDate) : null
  const totalDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 1
  const daysElapsed = startDate ? Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
  const timeProgress = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)))
  const stats: ProjectStatsData = {
    totalExpenses: totalExpensesCalc,
    incomeTotal: totalRevenue, expenseTotal: expenseContractTotal,
    invoiceInTotal: invoices.filter(i => i.type === 'invoice_in').reduce((s, i) => s + i.amount, 0),
    invoiceOutTotal: invoices.filter(i => i.type === 'invoice_out').reduce((s, i) => s + i.amount, 0),
    receivedInTotal: invoices.filter(i => i.type === 'invoice_in').reduce((s, i) => s + i.receivedAmount, 0),
    receivedOutTotal: invoices.filter(i => i.type === 'invoice_out').reduce((s, i) => s + i.receivedAmount, 0),
    staffCount: members.filter(m => m.memberType === 'staff').length, workerCount, teamCount: workerTeams.length,
    materialTotal, settlementIncomeTotal: settlements.filter(s => s.type === 'income').reduce((s, s2) => s + s2.amount, 0),
    settlementExpenseTotal: settlements.filter(s => s.type === 'expense').reduce((s, s2) => s + s2.amount, 0),
    totalRevenue, totalCost, netProfit: totalRevenue - totalCost,
    daysElapsed: Math.max(0, daysElapsed), totalDays, timeProgress,
    partnerCount: partners.length, materialCount: materials.length,
    workerCountTotal: members.filter(m => m.memberType === 'staff').length + workerCount,
  }

  const expenseByCategory = useMemo(() => {
    const result: Record<string, number> = {}
    const catMap = new Map(categories.map(c => [c.code, c.label]))
    for (const entry of costLedgerEntries) {
      if (entry.direction !== 'expense') continue
      const label = catMap.get(entry.category) || entry.category
      result[label] = (result[label] || 0) + entry.amount
    }
    return result
  }, [costLedgerEntries, categories])
  const staffMembers = members.filter(m => m.memberType === 'staff')
  const allStaffMembers = (allMembers || members).filter(m => m.memberType === 'staff')
  const status = statusLabels[project.status] || { text: project.status, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }

  const tabs = [
    { id: 'overview' as DetailTab, label: '项目总览', icon: 'LayoutDashboard' },
    { id: 'contracts' as DetailTab, label: '合同台账', icon: 'FileText' },
    { id: 'invoices' as DetailTab, label: '发票管理', icon: 'Receipt' },
    { id: 'members' as DetailTab, label: '人员管理', icon: 'Users' },
    { id: 'expenses' as DetailTab, label: '费用明细', icon: 'DollarSign' },
    { id: 'partners' as DetailTab, label: '关联单位', icon: 'Building2' },
  ]

  return (
    <PageContainer>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-5 lg:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.08),transparent_50%)]" />
          {/* 装饰光点 */}
          <motion.div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-emerald-400"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          />
          <motion.div className="absolute bottom-4 right-24 w-1.5 h-1.5 rounded-full bg-amber-400"
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: 1 }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <Icon name="ChevronLeft" size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />{status.text}
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-1">{project.address || '暂无地址'}<span className="mx-2 opacity-50">·</span>{project.projectManagerName || '暂无负责人'}</p>
              </div>
            </div>
            <button onClick={() => onEdit(project)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-sm font-medium">
              <Icon name="Edit3" size={14} /> 编辑项目
            </button>
          </div>
        </div>

        <ProjectStats budget={project.budget} stats={stats} />

        {/* ── Tab Bar ── */}
        <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-2xl w-fit overflow-x-auto shadow-sm">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setDetailTab(tab.id)}
              className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                detailTab === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-800'
              }`}>
              {detailTab === tab.id && (
                <motion.div layoutId="active-tab" className="absolute inset-0 bg-primary-600 rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5"><Icon name={tab.icon} size={14} />{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-primary-600" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={detailTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {detailTab === 'overview' && <ProjectCommandCenter project={project} stats={stats} expenseByCategory={expenseByCategory} materials={materials} incomeContracts={incomeContracts} expenseContracts={expenseContracts} invoices={invoices} partners={partners} paymentRecords={paymentRecords} settlements={settlements} members={members} workerTeams={workerTeams} />}
              {detailTab === 'contracts' && <ContractsTab incomeContracts={incomeContracts} expenseContracts={expenseContracts} stats={stats} />}
              {detailTab === 'invoices' && <InvoicesTab invoices={invoices} stats={stats} />}
              {detailTab === 'members' && <MembersTab project={project} staffMembers={staffMembers} allStaffMembers={allStaffMembers} workerTeams={workerTeams} members={members} stats={stats} />}
              {detailTab === 'expenses' && <CostLedgerAnalytics projectId={project.id} projectName={project.name} categories={categories} />}
              {detailTab === 'partners' && <PartnersTab partners={partners} />}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </PageContainer>
  )
}

// Tab components extracted to ./ProjectDetailTabs.tsx
