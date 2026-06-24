// WorkerSection 组件
// @deprecated 此组件已废弃，工人管理模块已改用 LaborWorkerList + LaborTeamManager

import { useMaskedFn } from "@/hooks/useMaskedValue";
import { useState, useMemo } from 'react'
import { type Column } from '@/components/DataTable'
import Spinner from '../../ui/Spinner'
import { Tabs } from '../../ui/Tabs'
import type { WorkerTeam } from '@/types'
import { getWorkerTypeLabel } from '@/utils'
import {
  WorkerSectionProps, TeamFormData, defaultTeamFormData,
  TeamCard, TeamFormModal, TransferModal
} from './WorkerSectionModals'
import { LeaveModal } from './LeaveModal'
import { TeamsTab, WorkersTab } from './WorkerSectionTabs'
import { Button } from '../../ui/Button'

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
  const masked = useMaskedFn();

  const [subTab, setSubTab] = useState<'teams' | 'workers' | 'wages'>('workers')
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<WorkerTeam | null>(null)
  const [teamFormData, setTeamFormData] = useState<TeamFormData>(defaultTeamFormData)

  const workerMembers = useMemo(() => members.filter(m => m.memberType === 'worker'), [members])

  const filteredWorkers = useMemo(() => workerMembers.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    return true
  }), [workerMembers, filterProject, filterTeam])

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

  const getTeamWorkerCount = (teamId: number) => {
    return workerMembers.filter(w => w.teamId === teamId).length
  }

  const workerColumns: Column<any>[] = [
    { key: 'name', title: '姓名', render: (item) => <span className="font-medium text-slate-800">{item.name}</span> },
    { key: 'idCard', title: '身份证号', render: (item) => <span className="text-slate-500 font-mono text-xs">{masked('idCard', item.idCard) || '-'}</span> },
    { key: 'age', title: '年龄', align: 'center', render: (item) => {
      const age = item.birthDate ? calcAge(item.birthDate) : null
      const isOverage = age !== null && age > 60
      return <span className={`text-sm font-medium ${isOverage ? 'text-red-600' : 'text-slate-600'}`}>{age !== null ? age : '-'}</span>
    }},
    { key: 'gender', title: '性别', render: (item) => <span className="text-slate-600">{item.gender || '-'}</span> },
    { key: 'workerType', title: '工种', render: (item) => <span className="text-slate-600">{item.workerType ? getWorkerTypeLabel(item.workerType as any) : '-'}</span> },
    { key: 'dailyWage', title: '日工资', align: 'right', render: (item) => <span className="text-slate-700 font-medium">{item.dailyWage ? `¥${item.dailyWage}` : '-'}</span> },
    { key: 'bankAccount', title: '银行卡号', render: (item) => <span className="text-slate-500 font-mono text-xs">{masked('bankAccount', (item as any).bankAccount) || '-'}</span> },
    { key: 'actions', title: '操作', align: 'right', render: (item) => (
      <div className="flex items-center justify-end gap-1">
        <Button onClick={() => onEditWorker(item)}  variant="ghost" size="sm" className="text-blue-600">编辑</Button>
        <Button onClick={() => onDeleteWorker((item as any).workerId)}  variant="danger" size="sm">删除</Button>
      </div>
    )},
  ]

  if (loading) {
    return <Spinner size="lg" text="加载工人数据..." />
  }

  return (
    <div className="p-6">
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
          <TeamsTab
            workerTeams={workerTeams}
            teamsByProject={teamsByProject}
            getTeamWorkerCount={getTeamWorkerCount}
            onDeleteTeam={onDeleteTeam}
            onManageWorkers={onManageWorkers}
            onOpenAddModal={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
            onOpenEditModal={(team) => { setEditingTeam(team); setTeamFormData({ name: team.name, projectId: team.projectId, leaderId: team.leaderId }); setShowTeamModal(true) }}
          />
        )}
        {subTab === 'workers' && (
          <WorkersTab
            filterProject={filterProject}
            filterTeam={filterTeam}
            onFilterProjectChange={setFilterProject}
            onFilterTeamChange={setFilterTeam}
            projects={projects}
            workerTeams={workerTeams}
            filteredWorkers={filteredWorkers}
            columns={workerColumns}
            onAddWorker={onAddWorker}
            onImportClick={onImportClick}
          />
        )}
        {subTab === 'wages' && (
          <div className="min-h-[600px]">{wageContent}</div>
        )}
      </Tabs>

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

export {
  TeamCard,
  TeamFormModal,
  TransferModal,
  LeaveModal
}

export default WorkerSection
