import { useState, useEffect } from 'react'
import { Icon } from '../../ui/Icon'
import { getAPI } from '@/services/api-adapter'
import type { Project, Member, WorkerTeam } from '@/types'
import type { ProjectStatsData } from './ProjectStats'
import { AddMemberModal } from './AddMemberModal'

const CARD = 'bg-white border border-slate-200 rounded-xl shadow-sm'
const CARD_HOVER = 'hover:shadow-md transition-all duration-200'

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-12 text-slate-400"><Icon name="Inbox" size={32} className="mb-2 opacity-40" /><p className="text-sm">{text}</p></div>
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
    const r = await (await getAPI()).getProjectWorkers(project.id)
    if (r.success) setProjectWorkers(r.data || [])
  }

  const loadProjects = async () => {
    const r = await (await getAPI()).getProjects()
    if (r.success) setProjects((r.data || []).filter((p: any) => p.status !== 'archived' && p.id !== project.id))
  }

  const loadProjectMembers = async () => {
    try {
      const r = await (await getAPI()).getProjectMembers(project.id)
      if (r.success && r.data) setProjectRecords(r.data)
    } catch (e) { console.error('加载项目成员失败:', e) }
    finally { setLoaded(true) }
  }

  const handleAdd = async (memberId: number, joinedAt?: string) => {
    const r = await (await getAPI()).addProjectMember(project.id, memberId, joinedAt)
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
    const api = await getAPI()
    await api.updateProjectMember(transferRecord.id, { leftAt: transferDate })
    // 如果选了调入其他项目，在新项目创建成员记录
    if (transferToProject) {
      await api.addProjectMember(
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
                        getAPI().then(api => api.removeProjectMember(rec.id)).then(() => loadProjectMembers())
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
                    getAPI().then(api => api.updateProjectMember(rec.id, { leftAt: '' }))
                      .then(() => loadProjectMembers())
                  }} className="btn btn-ghost btn-sm text-primary-600 border border-primary-200">恢复</button>
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
