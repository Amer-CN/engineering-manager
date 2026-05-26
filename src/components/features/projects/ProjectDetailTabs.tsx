import { useState, useEffect } from 'react'
import type { Project, Member, Partner, IncomeContract, ExpenseContract, WorkerTeam, Invoice } from '@/types'
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
            <thead className="bg-slate-50 border-b border-slate-200"><tr>{['发票号', '类型', '名称', '金额', '已收/已付', '状态'].map(h => <th key={h} className={`px-4 py-2.5 text-xs text-slate-500 font-medium ${h === '金额' || h === '收款' ? 'text-right' : h === '状态' ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map(invoice => (
                <tr key={invoice.id} className="table-row-hover">
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
  const [projectRecords, setProjectRecords] = useState<any[]>([])
  const [projectWorkers, setProjectWorkers] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // 调离弹窗
  const [transferRecord, setTransferRecord] = useState<any | null>(null)
  const [transferDate, setTransferDate] = useState('')
  const [transferToProject, setTransferToProject] = useState<number | ''>('')
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => { loadProjectMembers(); loadProjects(); loadProjectWorkers() }, [project.id])

  const loadProjectWorkers = async () => {
    const r = await window.electronAPI.getProjectWorkers(project.id)
    if (r.success) setProjectWorkers(r.data || [])
  }

  const loadProjects = async () => {
    const r = await window.electronAPI.getProjects()
    if (r.success) setProjects((r.data || []).filter((p: any) => p.status !== 'archived' && p.id !== project.id))
  }

  const loadProjectMembers = async () => {
    try {
      const r = await window.electronAPI.getProjectMembers(project.id)
      if (r.success && r.data) setProjectRecords(r.data)
    } catch (e) { console.error('加载项目成员失败:', e) }
    finally { setLoaded(true) }
  }

  const handleAdd = async (memberId: number, joinedAt?: string) => {
    const r = await window.electronAPI.addProjectMember(project.id, memberId, joinedAt)
    if (r.success) loadProjectMembers()
    return r
  }

  // 打开调离弹窗
  const openTransfer = (rec: any) => {
    setTransferRecord(rec)
    setTransferDate(new Date().toISOString().split('T')[0])
    setTransferToProject('')
  }

  // 确认调离
  const confirmTransfer = async () => {
    if (!transferRecord || !transferDate) return
    await window.electronAPI.updateProjectMember(transferRecord.id, { leftAt: transferDate })
    // 如果选了调入其他项目，在新项目创建成员记录
    if (transferToProject) {
      await window.electronAPI.addProjectMember(
        Number(transferToProject), transferRecord.memberId, transferDate
      )
    }
    loadProjectMembers()
    setTransferRecord(null)
  }

  // 按 leftAt 区分当前成员和已调离成员
  const activeRecords = projectRecords.filter((r: any) => !r.leftAt)
  const pastRecords = projectRecords.filter((r: any) => r.leftAt)

  // 当前项目人员（无论公司在职/离职，只要在项目上的都显示）
  const projectStaff = staffMembers.filter(m =>
    activeRecords.some((r: any) => r.memberId === m.id)
  )
  const available = allStaffMembers.filter(m =>
    !projectRecords.some((r: any) => r.memberId === m.id && !r.leftAt) &&
    m.id !== project.projectManagerId
  )

  // 获取成员的项目记录
  const getRecordFor = (memberId: number) => projectRecords.find((r: any) => r.memberId === memberId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center"><Icon name="Users" size={14} className="text-purple-600" /></span>项目人员
            <span className="text-xs font-normal text-slate-400">({activeRecords.length}人)</span>
          </h3>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"><Icon name="Plus" size={12} /> 添加成员</button>
        </div>
        {project.projectManagerName && (() => {
          const pm = staffMembers.find(m => m.id === project.projectManagerId)
          return (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 mb-3">
              <p className="text-xs text-purple-600 mb-0.5">项目经理</p>
              <p className="font-medium text-sm text-slate-800">{project.projectManagerName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{pm?.entryDate || '入职日期未知'} 入职</p>
            </div>
          )
        })()}
        {projectStaff.length > 0 ? (
          <div className="space-y-2">
            {projectStaff.map(m => {
              const rec = getRecordFor(m.id)
              return (
                <div key={m.id} className={`${CARD} ${CARD_HOVER} p-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.position || m.role || '-'}</p>
                    {rec?.joinedAt && <p className="text-xs text-slate-400 mt-0.5">
                      {rec.joinedAt} 加入 ·
                      {m.leaveDate && !m.reentryDate
                        ? <span className="text-amber-500"> {m.leaveDate} 离职</span>
                        : <span> 在岗</span>}
                    </p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openTransfer(rec)} className="btn btn-ghost btn-sm text-amber-600 border border-amber-200">调离</button>
                    <button onClick={() => {
                      if (confirm(`确认将 ${m.name} 从项目中删除？此操作不可撤销。`)) {
                        window.electronAPI.removeProjectMember(rec.id).then(() => loadProjectMembers())
                      }
                    }} className="btn btn-danger btn-sm border border-slate-200">删除</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <div className="text-center py-8 text-slate-400 text-sm">{loaded ? '暂无项目人员，点击上方按钮添加' : '加载中...'}</div>}

        {/* 已调离成员 */}
        {pastRecords.length > 0 && (
          <>
            <h4 className="text-xs font-medium text-slate-400 mt-4 mb-2">已调离 · {pastRecords.length}人</h4>
            <div className="space-y-1.5">
              {pastRecords.map(rec => (
                <div key={rec.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{rec.member?.name || staffMembers.find(m => m.id === rec.memberId)?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{rec.member ? (rec.member.position || rec.member.role || '') : ''}</p>
                    <p className="text-xs text-slate-400">
                      {rec.joinedAt} 加入 ~ {rec.leftAt} 调离
                      {rec.member && rec.member.leaveDate && !rec.member.reentryDate && (
                        <span className="text-amber-500 ml-2">· 已离职</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => {
                    window.electronAPI.updateProjectMember(rec.id, { leftAt: '' })
                      .then(() => loadProjectMembers())
                  }} className="btn btn-ghost btn-sm text-indigo-600 border border-indigo-200">恢复</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Icon name="Construction" size={14} className="text-amber-600" /></span>农民工 ({stats.workerCount})
        </h3>
        {workerTeams.length > 0 ? (
          <div className="space-y-2">
            {workerTeams.map(team => {
              const tm = projectWorkers.filter((pw: any) => pw.teamId === team.id)
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

      {/* 调离/调转弹窗 */}
      {transferRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTransferRecord(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-1">调离成员</h3>
            <p className="text-sm text-slate-500 mb-4">
              {staffMembers.find(m => m.id === transferRecord.memberId)?.name || ''}
              {' '}· 加入于 {transferRecord.joinedAt}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">调离日期 *</label>
                <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">调入其他项目（可选）</label>
                <select value={transferToProject} onChange={e => setTransferToProject(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">仅调离，不调入其他项目</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setTransferRecord(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={confirmTransfer}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">确认调离</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddMemberModal({ members, onAdd, onClose }: {
  members: Member[]; onAdd: (memberId: number, joinedAt?: string) => Promise<{ success: boolean; error?: string }>; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<number | null>(null)
  const [error, setError] = useState('')
  const filtered = members.filter(m => !search || m.name.includes(search) || (m.position || m.role || '').includes(search) || m.phone?.includes(search))
  const handleAdd = async (m: any) => {
    setAdding(m.id); setError('')
    // 加入日期自动取成员的 entryDate（入职日期）
    const r = await onAdd(m.id, m.entryDate || undefined)
    if (!r.success) setError(r.error || '添加失败'); setAdding(null)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-800">添加项目成员</h3><button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Icon name="X" size={18} /></button></div>
        <div className="p-4 border-b border-slate-100">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、职位、电话..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {error && <p className="text-red-500 text-sm px-2 mb-2">{error}</p>}
          {filtered.length === 0 ? <div className="text-center py-8 text-slate-400 text-sm">{members.length === 0 ? '没有可添加的成员' : '无匹配结果'}</div>
          : filtered.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <div><p className="text-sm font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">{m.position || m.role || '-'}{m.entryDate ? ` · ${m.entryDate} 入职` : ''}</p></div>
              <button onClick={() => handleAdd(m)} disabled={adding === m.id} className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">{adding === m.id ? '...' : '加入'}</button>
            </div>
          ))}
        </div>
      </div>
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
