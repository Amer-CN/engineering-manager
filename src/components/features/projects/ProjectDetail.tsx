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
import { motion } from 'framer-motion'
import PageContainer from '../../ui/PageContainer'
import { Icon } from '../../ui/Icon'
import { Spinner } from '../../ui/Loading/Loading'
import { Tabs } from '../../ui/Tabs'
import { ContractsTab, InvoicesTab, MembersTab, PartnersTab } from './ProjectDetailTabs'
import { StatusBadge, PROJECT_STATUS } from '@/constants/status'
import { getAPI } from '@/services/api-adapter'

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
      const pid = project.id
      const api = await getAPI()
      const results = await Promise.allSettled([
      api.getInvoices(),               // 0
      api.getIncomeContracts(pid),      // 1
      api.getExpenseContracts(pid),     // 2
      api.getPartners(),                // 3
      api.getWorkerTeams(),             // 4
      api.getProjectWorkers(pid),       // 5
      api.getMaterials(pid),            // 6
      api.getSettlements(pid),          // 7
      api.getWagePaymentRecords(),      // 8
      api.getCostLedger(pid),           // 9
      ])

      const res = (i: number) => {
      const r = results[i]
      if (r.status === 'rejected') { console.error(`[ProjectDetail] API #${i} rejected:`, r.reason); return null }
      const val = r.value as any
      if (!val?.success) { console.warn(`[ProjectDetail] API #${i} failed:`, val?.error); return null }
      return val.data || []
      }

      // 规范化 projectIds（API 返回 JSON 字符串而非数组）
      const normalizeProjectIds = (item: any) => {
      if (typeof item.projectIds === 'string') {
      try { item.projectIds = JSON.parse(item.projectIds) } catch { item.projectIds = [] }
      }
      return item
      }

      const invoicesData = res(0) || []
      setInvoices(invoicesData.filter((i: Invoice) => i.projectId == pid))
      setIncomeContracts(res(1) || [])
      setExpenseContracts(res(2) || [])
      const partnersData = (res(3) || []).map(normalizeProjectIds)
      setPartners(partnersData.filter((p: Partner) => p.projectIds?.some((id: any) => id == pid)))
      const teamsData = res(4) || []
      setWorkerTeams(teamsData.filter((t: WorkerTeam) => t.projectId == pid))
      setProjectWorkers(res(5) || [])
      setMaterials(res(6) || [])
      const settlementsData = res(7) || []
      setSettlements(settlementsData.filter((s: Settlement) => s.projectId == pid))
      const paymentsData = res(8) || []
      setPaymentRecords(paymentsData.filter((p: PaymentRecord) => p.projectId == pid))
      setCostLedgerEntries(res(9) || [])
    } catch (e) {
      console.error('[ProjectDetail] 加载项目详情失败:', e)
    } finally {
      setLoading(false)
    }
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
          <div className="hero-overlay absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.08),transparent_50%)]" />
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
                  <StatusBadge status={project.status} config={PROJECT_STATUS} />
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

        {/* ── Tab Bar (统一 Tabs 组件) ── */}
        <Tabs
          value={detailTab}
          onChange={(value: string) => setDetailTab(value as DetailTab)}
          tabs={tabs.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
          animated={true}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {detailTab === 'overview' && <ProjectCommandCenter project={project} stats={stats} expenseByCategory={expenseByCategory} materials={materials} incomeContracts={incomeContracts} expenseContracts={expenseContracts} invoices={invoices} partners={partners} paymentRecords={paymentRecords} settlements={settlements} members={members} workerTeams={workerTeams} />}
              {detailTab === 'contracts' && <ContractsTab incomeContracts={incomeContracts} expenseContracts={expenseContracts} stats={stats} />}
              {detailTab === 'invoices' && <InvoicesTab invoices={invoices} stats={stats} />}
              {detailTab === 'members' && <MembersTab project={project} staffMembers={staffMembers} allStaffMembers={allStaffMembers} workerTeams={workerTeams} members={members} stats={stats} />}
              {detailTab === 'expenses' && <CostLedgerAnalytics projectId={project.id} projectName={project.name} categories={categories} />}
              {detailTab === 'partners' && <PartnersTab partners={partners} />}
            </>
          )}
        </Tabs>
      </motion.div>
    </PageContainer>
  )
}

// Tab components extracted to ./ProjectDetailTabs.tsx
