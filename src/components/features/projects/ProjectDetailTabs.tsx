import React, { useState, useEffect } from 'react'
import type { Project, Member, Task, Partner, IncomeContract, ExpenseContract, WorkerTeam, Invoice } from '@/types'
import { ProjectStatsData } from './ProjectStats'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm'
const CARD_HOVER = 'hover:shadow-md transition-all duration-200'

const partnerRoleLabels: Record<string, string> = {
  owner: '建设单位', general_contract: '总承包', professional: '专业分包',
  labor: '劳务分包', material: '材料供应', equipment: '设备租赁',
  design: '设计单位', supervisor: '监理单位', survey: '勘察单位',
  testing: '检测单位', other: '其他',
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
}

function InvoiceStatusBadge({ status, type }: { status: string; type?: string }) {
  const v: Record<string, 'success' | 'warning' | 'danger' | 'info'> = { received: 'success', partially_paid: 'warning', cancelled: 'danger', issued: 'info' }
  const isIn = type === 'invoice_in'
  const l: Record<string, string> = {
    received: isIn ? '已付清' : '已收齐',
    partially_paid: isIn ? '部分付款' : '部分收款',
    cancelled: '已作废',
    issued: isIn ? '已收票' : '已开具'
  }
  return <Badge variant={v[status] || 'info'}>{l[status] || status}</Badge>
}

export function ContractsTab({ incomeContracts, expenseContracts, stats }: {
  incomeContracts: IncomeContract[]; expenseContracts: ExpenseContract[]; stats: ProjectStatsData
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><Icon name="TrendingUp" size={14} className="text-emerald-600" /></span>收入合同
        </h3>
        {incomeContracts.length > 0 ? (
          <div className="space-y-2">
            {incomeContracts.map(c => (
              <div key={c.id} className={`${CARD} p-3 border-l-2 border-l-emerald-400`}>
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm text-slate-800">{c.name}</span><span className="font-bold text-sm text-emerald-600">¥{formatMoney(c.amount)}</span></div>
                <div className="text-xs text-slate-400">{c.partnerName || '未知'} · {c.signedDate}</div>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex justify-between text-sm"><span className="text-emerald-700 font-medium">合计</span><span className="text-emerald-700 font-bold">¥{formatMoney(stats.incomeTotal)}</span></div>
            </div>
          </div>
        ) : <EmptyState text="暂无收入合同" />}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><Icon name="TrendingDown" size={14} className="text-red-600" /></span>支出合同
        </h3>
        {expenseContracts.length > 0 ? (
          <div className="space-y-2">
            {expenseContracts.map(c => (
              <div key={c.id} className={`${CARD} p-3 border-l-2 border-l-red-400`}>
                <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm text-slate-800">{c.name}</span><span className="font-bold text-sm text-red-600">¥{formatMoney(c.amount)}</span></div>
                <div className="text-xs text-slate-400">{c.partnerName || '未知'} · {c.signedDate}</div>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="flex justify-between text-sm"><span className="text-red-700 font-medium">合计</span><span className="text-red-700 font-bold">¥{formatMoney(stats.expenseTotal)}</span></div>
            </div>
          </div>
        ) : <EmptyState text="暂无支出合同" />}
      </div>
    </div>
  )
}

export function InvoicesTab({ invoices, stats }: { invoices: Invoice[]; stats: ProjectStatsData }) {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[{ label: '进项发票', icon: 'Download', cls: 'border-emerald-200 bg-emerald-50', color: 'emerald', total: stats.invoiceInTotal, received: stats.receivedInTotal, unreceived: stats.invoiceInTotal - stats.receivedInTotal, paidLabel: '已付款', unpaidLabel: '未付款' },
          { label: '销项发票', icon: 'Upload', cls: 'border-blue-200 bg-blue-50', color: 'blue', total: stats.invoiceOutTotal, received: stats.receivedOutTotal, unreceived: stats.invoiceOutTotal - stats.receivedOutTotal, paidLabel: '已回款', unpaidLabel: '未回款' },
        ].map((card, i) => (
          <div key={i} className={`${CARD} p-5 border ${card.cls}`}>
            <div className="flex items-center gap-2 mb-3"><Icon name={card.icon} size={16} className={`text-${card.color}-600`} /><span className={`font-semibold text-sm text-${card.color}-700`}>{card.label}</span></div>
            <p className="text-2xl font-bold text-slate-800 mb-2">¥{formatMoney(card.total)}</p>
            <div className="text-sm space-y-1">
              <p className="text-slate-500">{card.paidLabel}: <span className="text-emerald-600 font-medium">¥{formatMoney(card.received)}</span></p>
              <p className="text-slate-500">{card.unpaidLabel}: <span className="text-amber-600 font-medium">¥{formatMoney(Math.max(0, card.unreceived))}</span></p>
            </div>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">发票列表</h3>
      {invoices.length > 0 ? (
        <div className={`${CARD} overflow-hidden`}>
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">{['发票号', '类型', '名称', '金额', '已收/已付', '状态'].map(h => <th key={h} className={`px-4 py-2.5 text-xs text-slate-500 font-medium ${h === '金额' || h === '收款' ? 'text-right' : h === '状态' ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-sm font-mono text-slate-700">{invoice.invoiceNo}</td>
                  <td className="px-4 py-2.5"><Badge variant={invoice.type === 'invoice_in' ? 'success' : 'info'}>{invoice.type === 'invoice_in' ? '进项' : '销项'}</Badge></td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{invoice.name}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800 text-sm">¥{formatMoney(invoice.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-emerald-600">¥{formatMoney(invoice.receivedAmount)}</td>
                  <td className="px-4 py-2.5 text-center"><InvoiceStatusBadge status={invoice.status} type={invoice.type} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="暂无发票记录" />}
    </div>
  )
}

export function MembersTab({ project, staffMembers, allStaffMembers, workerTeams, members, stats }: {
  project: Project; staffMembers: Member[]; allStaffMembers: Member[]; workerTeams: WorkerTeam[]; members: Member[]; stats: ProjectStatsData
}) {
  const [projectStaffIds, setProjectStaffIds] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadProjectMembers() }, [project.id])
  const loadProjectMembers = async () => {
    try {
      const r = await window.electronAPI.getProjectMembers(project.id)
      if (r.success && r.data) setProjectStaffIds(new Set(r.data.map((pm: any) => pm.memberId)))
    } catch (e) { console.error('加载项目成员失败:', e) }
    finally { setLoaded(true) }
  }
  const handleAdd = async (memberId: number) => { const r = await window.electronAPI.addProjectMember(project.id, memberId); if (r.success) setProjectStaffIds(p => new Set(p).add(memberId)); return r }
  const handleRemove = async (memberId: number) => {
    const all = await window.electronAPI.getProjectMembers(project.id)
    if (!all.success || !all.data) return
    const rec = all.data.find((pm: any) => pm.memberId === memberId)
    if (!rec) return
    const r = await window.electronAPI.removeProjectMember(rec.id)
    if (r.success) setProjectStaffIds(p => { const n = new Set(p); n.delete(memberId); return n })
  }

  const projectStaff = staffMembers.filter(m => projectStaffIds.has(m.id))
  const available = allStaffMembers.filter(m => !projectStaffIds.has(m.id) && m.id !== project.projectManagerId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center"><Icon name="Users" size={14} className="text-purple-600" /></span>项目人员
          </h3>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"><Icon name="Plus" size={12} /> 添加成员</button>
        </div>
        {project.projectManagerName && (
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 mb-3">
            <p className="text-xs text-purple-600 mb-0.5">项目经理</p><p className="font-medium text-sm text-slate-800">{project.projectManagerName}</p>
          </div>
        )}
        {projectStaff.length > 0 ? (
          <div className="space-y-2">
            {projectStaff.map(m => (
              <div key={m.id} className={`${CARD} ${CARD_HOVER} p-3 flex items-center justify-between`}>
                <div><p className="text-sm font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">{m.role}</p></div>
                <div className="flex items-center gap-2"><span className="text-xs text-slate-400">{m.phone || '-'}</span>
                  <button onClick={() => handleRemove(m.id)} className="p-1 hover:text-red-500 transition-colors text-slate-400"><Icon name="X" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="text-center py-8 text-slate-400 text-sm">{loaded ? '暂无项目人员，点击上方按钮添加' : '加载中...'}</div>}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Icon name="Construction" size={14} className="text-amber-600" /></span>农民工 ({stats.workerCount})
        </h3>
        {workerTeams.length > 0 ? (
          <div className="space-y-2">
            {workerTeams.map(team => {
              const tm = members.filter(m => m.memberType === 'worker' && m.teamId === team.id)
              return (
                <div key={team.id} className={`${CARD} p-3`}>
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-slate-800">{team.name}</span><span className="text-xs font-medium text-amber-600">{tm.length}人</span></div>
                  <div className="text-xs text-slate-500">班组长: {team.leaderName || '-'}</div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState text="暂无农民工班组" />}
      </div>
      {showAddModal && <AddMemberModal members={available} onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
    </div>
  )
}

function AddMemberModal({ members, onAdd, onClose }: {
  members: Member[]; onAdd: (memberId: number) => Promise<{ success: boolean; error?: string }>; onClose: () => void
}) {
  const [search, setSearch] = useState(''); const [adding, setAdding] = useState<number | null>(null); const [error, setError] = useState('')
  const filtered = members.filter(m => !search || m.name.includes(search) || m.role.includes(search) || m.phone?.includes(search))
  const handleAdd = async (id: number) => { setAdding(id); setError(''); const r = await onAdd(id); if (!r.success) setError(r.error || '添加失败'); setAdding(null) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-800">添加项目成员</h3><button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Icon name="X" size={18} /></button></div>
        <div className="p-4 border-b border-slate-100"><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、职位、电话..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" /></div>
        <div className="flex-1 overflow-y-auto p-2">
          {error && <p className="text-red-500 text-sm px-2 mb-2">{error}</p>}
          {filtered.length === 0 ? <div className="text-center py-8 text-slate-400 text-sm">{members.length === 0 ? '没有可添加的成员' : '无匹配结果'}</div>
          : filtered.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div><p className="text-sm font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">{m.role}</p></div>
              <button onClick={() => handleAdd(m.id)} disabled={adding === m.id} className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">{adding === m.id ? '...' : '加入'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TasksTab({ tasks, stats }: { tasks: Task[]; stats: ProjectStatsData }) {
  return (
    <div>
      <div className={`${CARD} p-5 mb-6`}>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-3xl font-bold text-blue-500">{stats.taskProgress}%</span>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1"><span>任务完成进度</span><span>{stats.completedTasks}/{tasks.length} 个</span></div>
            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${stats.taskProgress}%` }} /></div>
          </div>
        </div>
        {stats.overdueTasks > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200"><Icon name="AlertCircle" size={14} className="text-red-500" /><span className="text-xs text-red-600">{stats.overdueTasks} 个任务已逾期</span></div>
        )}
      </div>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(t => {
            const overdue = t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
            const cfg = { completed: { icon: 'Check', bg: 'bg-emerald-100', color: 'text-emerald-600' }, in_progress: { icon: 'RefreshCw', bg: 'bg-blue-100', color: 'text-blue-600' }, todo: { icon: 'ClipboardList', bg: 'bg-slate-100', color: 'text-slate-400' } }
            const c = cfg[t.status as keyof typeof cfg] || cfg.todo
            return (
              <div key={t.id} className={`${CARD} p-3 flex items-center gap-3 ${overdue ? 'border-l-2 border-l-red-400' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.bg} ${c.color}`}><Icon name={c.icon} size={15} /></div>
                <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>{t.description && <p className="text-xs text-slate-400 truncate">{t.description}</p>}</div>
                <div className="text-right flex-shrink-0">{t.dueDate && <p className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>截止: {t.dueDate}</p>}</div>
              </div>
            )
          })}
        </div>
      ) : <EmptyState text="暂无任务" />}
    </div>
  )
}

export function PartnersTab({ partners }: { partners: Partner[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">关联单位 ({partners.length})</h3>
      {partners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map(p => (
            <div key={p.id} className={`${CARD} p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-3 mb-3"><div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center"><Icon name="Building2" size={18} className="text-violet-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{p.name}</p><p className="text-xs text-slate-500">{partnerRoleLabels[p.category] || p.category}</p></div></div>
              <div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">联系人:</span><span className="ml-1 text-slate-600">{p.contact || '-'}</span></div><div><span className="text-slate-400">电话:</span><span className="ml-1 text-slate-600">{p.phone || '-'}</span></div></div>
            </div>
          ))}
        </div>
      ) : <EmptyState text="暂无关联单位" />}
    </div>
  )
}
