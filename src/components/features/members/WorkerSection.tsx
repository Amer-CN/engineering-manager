// WorkerSection 组件
// @deprecated 此组件已废弃，工人管理模块已改用 LaborWorkerList + LaborTeamManager

import { useMask } from '@/contexts/MaskContext';
import { maskIdCard, maskPhone, maskBankAccount } from "@/utils/mask";
import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
import { Tabs } from '../../ui/Tabs'
import Spinner from '../../ui/Spinner'
import type { WorkerTeam } from '@/types'
import { getWorkerTypeLabel } from '@/utils'
import {
  WorkerSectionProps, TeamFormData, defaultTeamFormData,
  TeamCard, TeamFormModal, TransferModal
} from './WorkerSectionModals'
import { LeaveModal } from './LeaveModal'
function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function WorkerSection({
  members,
  projects,
  workerTeams,
  loading,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onImportClick,
  onAddFromPool,
  wageContent,
  onManageWorkers,
  onUpdateWorker,
  onRemoveFromTeam
}: WorkerSectionProps) {
  // 子Tab状态
  const [subTab, setSubTab] = useState<'teams' | 'workers' | 'wages'>('workers')

  // 筛选状态
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)

  // 班组表单模态框状态
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<WorkerTeam | null>(null)
  const [teamFormData, setTeamFormData] = useState<TeamFormData>(defaultTeamFormData)


  // 农民工列表
  const workerMembers = useMemo(() => members.filter(m => m.memberType === 'worker'), [members])

  // 筛选后的工人
  const filteredWorkers = useMemo(() => workerMembers.filter(w => {
  if (filterProject && w.projectId !== filterProject) return false
  if (filterTeam && w.teamId !== filterTeam) return false
  return true
  }), [workerMembers, filterProject, filterTeam])

  // 按项目分组班组
  const teamsByProject = useMemo(() => workerTeams.reduce((acc, team) => {
  if (!acc[team.projectId]) {
  acc[team.projectId] = {
  projectName: team.projectName || projects.find(p => p.id === team.projectId)?.name || '未知项目',
  projectId: team.projectId,
  teams: []
  }
  }
  acc[team.projectId].teams.push(team)
  return acc
  }, {} as Record<number, { projectName: string; projectId: number; teams: WorkerTeam[] }>), [workerTeams, projects])
  // 获取班组工人数量
  const getTeamWorkerCount = (teamId: number) => {
  return workerMembers.filter(w => w.teamId === teamId).length
  }

  const workerColumns: Column<any>[] = [
    { key: 'name', title: '姓名', render: (item) => <span className="font-medium text-slate-800">{item.name}</span> },
    { key: 'idCard', title: '身份证号', render: (item) => <span className="text-slate-500 font-mono text-xs">{maskIdCard(item.idCard) || '-'}</span> },
    { key: 'age', title: '年龄', align: 'center', render: (item) => {
      const age = item.birthDate ? calcAge(item.birthDate) : null
      const isOverage = age !== null && age > 60
      return <span className={`text-sm font-medium ${isOverage ? 'text-red-600' : 'text-slate-600'}`}>{age !== null ? age : '-'}</span>
    }},
    { key: 'gender', title: '性别', render: (item) => <span className="text-slate-600">{item.gender || '-'}</span> },
    { key: 'workerType', title: '工种', render: (item) => <span className="text-slate-600">{item.workerType ? getWorkerTypeLabel(item.workerType as any) : '-'}</span> },
    { key: 'dailyWage', title: '日工资', align: 'right', render: (item) => <span className="text-slate-700 font-medium">{item.dailyWage ? `¥${item.dailyWage}` : '-'}</span> },
    { key: 'bankAccount', title: '银行卡号', render: (item) => <span className="text-slate-500 font-mono text-xs">{maskBankAccount((item as any).bankAccount) || '-'}</span> },
    { key: 'actions', title: '操作', align: 'right', render: (item) => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => onEditWorker(item)} className="btn btn-ghost btn-sm text-blue-600">编辑</button>
        <button onClick={() => onDeleteWorker((item as any).workerId)} className="btn btn-danger btn-sm">删除</button>
      </div>
    )},
  ]

  // 加载状态
  if (loading) {
  return <Spinner size="lg" text="加载工人数据..." />
  }

  return (
  <div className="p-6">
  {/* 统一 Tabs 组件 */}
  <Tabs
  value={subTab}
  onChange={(value: string) => setSubTab(value as 'teams' | 'workers' | 'wages')}
  tabs={[
  { key: 'teams', label: '班组管理', icon: 'Building2', badge: workerTeams.length },
  { key: 'workers', label: '工人库', icon: 'Construction', badge: filteredWorkers.length },
  { key: 'wages', label: '工资管理', icon: 'Wallet' },
  ]}
  animated={true}
  >
  {subTab === 'teams' && (
  <>
  <div className="flex items-center justify-between mb-6">
  <div className="text-slate-500">
  按项目分类管理班组，共{workerTeams.length} 个班组 </div>
  <div className="flex items-center gap-3">
  <button
  onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
  className="btn btn-warning"
  >
  <span className="mr-2">+</span>
  添加班组
  </button>
  </div>
  </div>

  {Object.keys(teamsByProject).length > 0 ? (
  <div className="space-y-6">
  {Object.values(teamsByProject).map(projectGroup => (
  <div key={projectGroup.projectId} className="bg-white rounded-xl shadow-sm overflow-hidden">
  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
  <div className="flex items-center">
  <span className="mr-2">📁</span>
  <span className="font-medium text-slate-800">{projectGroup.projectName}</span>
  </div>
  <span className="text-sm text-slate-500">{projectGroup.teams.length} 个班组</span>
  </div>
  <div className="p-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {projectGroup.teams.map(team => (
  <TeamCard
  key={team.id}
  team={team}
  workerCount={getTeamWorkerCount(team.id)}
  onEdit={() => { setEditingTeam(team); setTeamFormData({ name: team.name, projectId: team.projectId, leaderId: team.leaderId }); setShowTeamModal(true) }}
  onDelete={() => onDeleteTeam(team.id)}
  onManageWorkers={onManageWorkers}
  />
  ))}
  </div>
  </div>
  </div>
  ))}
  </div>
  ) : (
  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
  <div className="text-6xl mb-4">🏗️</div>
  <h3 className="text-lg font-medium text-slate-800 mb-2">暂无班组</h3>
  <p className="text-slate-500 mb-6">请先添加项目，然后创建班组</p>
  <button
  onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
  className="btn btn-warning"
  >
  添加班组
  </button>
  </div>
  )}
  </>
  )}
  {subTab === 'workers' && (
  <>
  {/* 筛选器 */}
  <FilterBar className="mb-6">
  <span className="text-slate-600 font-medium">筛选：</span>
  <select
  value={filterProject || ''}
  onChange={e => { setFilterProject(e.target.value ? Number(e.target.value) : null); setFilterTeam(null) }}
  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  >
  <option value="">全部项目</option>
  {projects.map(p => (
  <option key={p.id} value={p.id}>{p.name}</option>
  ))}
  </select>
  <select
  value={filterTeam || ''}
  onChange={e => setFilterTeam(e.target.value ? Number(e.target.value) : null)}
  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  disabled={!filterProject}
  >
  <option value="">全部班组</option>
  {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
  <option key={t.id} value={t.id}>{t.name}</option>
  ))}
  </select>
  <button onClick={onAddWorker} className="btn btn-warning flex items-center">
  <span className="mr-1">+</span>添加工人
  </button>
  <button onClick={onImportClick} className="btn btn-primary px-5 py-2 flex items-center">
  <span className="mr-1">↑</span>导入Excel
  </button>
  </FilterBar>

  {filteredWorkers.length > 0 ? (
    <DataTable
      data={filteredWorkers}
      columns={workerColumns}
      rowKey="id"
      pagination={false}
      showContainer={true}
      stickyHeader={true}
      emptyText="暂无工人"
      emptyIcon="Construction"
    />
  ) : (
  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
  <div className="text-6xl mb-4">🚧</div>
  <h3 className="text-lg font-medium text-slate-800 mb-2">暂无工人</h3>
  <p className="text-slate-500 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
  <button
  onClick={onAddWorker}
  className="btn btn-warning"
  >
  添加工人
  </button>
  </div>
  )}
  </>
  )}
  {subTab === 'wages' && (
  <div className="min-h-[600px]">{wageContent}</div>
  )}
  </Tabs>

  {/* 班组表单模态框 */}
  {showTeamModal && (
  <TeamFormModal
  visible={showTeamModal}
  editingTeam={editingTeam}
  formData={teamFormData}
  projects={projects}
  workers={workerMembers}
  onChange={(data) => setTeamFormData(prev => ({ ...prev, ...data }))}
  onSubmit={async (e) => {
  e.preventDefault()
  if (!teamFormData.name || !teamFormData.projectId) return
  editingTeam
  ? await onEditTeam({ ...editingTeam, name: teamFormData.name, projectId: teamFormData.projectId, leaderId: teamFormData.leaderId ?? null })
  : await onAddTeam(teamFormData.name, teamFormData.projectId, teamFormData.leaderId)
  setShowTeamModal(false); setEditingTeam(null); setTeamFormData(defaultTeamFormData)
  }}
  onClose={() => { setShowTeamModal(false); setTeamFormData(defaultTeamFormData) }}
  />
  )}


  </div>
  )
}

// 导出子组件和类型

export {
  TeamCard,
  TeamFormModal,
  TransferModal,
  LeaveModal
}

export default WorkerSection
