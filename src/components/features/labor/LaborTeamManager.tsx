// LaborTeamManager.tsx - 班组管理Tab

import React, { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { TeamCard, TeamFormModal, TeamFormData, defaultTeamFormData } from '../members/WorkerSectionModals'
import { TeamWageModal } from './TeamWageModal'

interface LaborTeamManagerProps {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  onRefresh: () => void
  onAddTeam: (name: string, projectId: number, leaderId?: number | null) => Promise<void>
  onEditTeam: (team: WorkerTeam) => Promise<void>
  onDeleteTeam: (id: number) => Promise<void>
  onManageWorkers: (teamId: number, teamName: string, projectId: number) => void
}

const LaborTeamManager: React.FC<LaborTeamManagerProps> = ({
  members,
  projects,
  workerTeams,
  onRefresh,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onManageWorkers,
}) => {
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<WorkerTeam | null>(null)
  const [teamFormData, setTeamFormData] = useState<TeamFormData>(defaultTeamFormData)

  // Team wage modal state
  const [wageModal, setWageModal] = useState<{ teamId: number; teamName: string; projectId: number; projectName: string } | null>(null)

  // 按项目分组班组
  const teamsByProject = workerTeams.reduce((acc, team) => {
    if (!acc[team.projectId]) {
      acc[team.projectId] = {
        projectName: team.projectName || projects.find(p => p.id === team.projectId)?.name || '未知项目',
        projectId: team.projectId,
        teams: [],
      }
    }
    acc[team.projectId].teams.push(team)
    return acc
  }, {} as Record<number, { projectName: string; projectId: number; teams: WorkerTeam[] }>)

  // 获取班组工人数量
  const getTeamWorkerCount = (teamId: number) => {
    return members.filter(w => w.teamId === teamId).length
  }

  const handleAddTeam = () => {
    setEditingTeam(null)
    setTeamFormData(defaultTeamFormData)
    setShowTeamModal(true)
  }

  const handleEditTeam = (team: WorkerTeam) => {
    setEditingTeam(team)
    setTeamFormData({
      name: team.name,
      projectId: team.projectId,
      leaderId: team.leaderId,
    })
    setShowTeamModal(true)
  }

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamFormData.name || !teamFormData.projectId) return

    if (editingTeam) {
      await onEditTeam({
        ...editingTeam,
        name: teamFormData.name,
        projectId: teamFormData.projectId,
        leaderId: teamFormData.leaderId ?? null,
      })
    } else {
      await onAddTeam(teamFormData.name, teamFormData.projectId, teamFormData.leaderId)
    }

    setShowTeamModal(false)
    setEditingTeam(null)
    setTeamFormData(defaultTeamFormData)
  }

  const handleCloseModal = () => {
    setShowTeamModal(false)
    setEditingTeam(null)
    setTeamFormData(defaultTeamFormData)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-slate-500">
          按项目分类管理班组，共 {workerTeams.length} 个班组
        </div>
        <button
          onClick={handleAddTeam}
          className="btn btn-warning flex items-center"
        >
          <Icon name="Plus" size={20} className="mr-2" />
          添加班组
        </button>
      </div>

      {/* Team list by project */}
      {Object.keys(teamsByProject).length > 0 ? (
        <div className="space-y-6">
          {Object.values(teamsByProject).map(projectGroup => (
            <div key={projectGroup.projectId} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center">
                  <Icon name="FolderKanban" size={18} className="mr-2" />
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
                      onEdit={() => handleEditTeam(team)}
                      onDelete={() => onDeleteTeam(team.id)}
                      onManageWorkers={onManageWorkers}
                      onTeamWages={(tid, tname, pid, pname) => setWageModal({ teamId: tid, teamName: tname, projectId: pid, projectName: pname })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4"><Icon name="Building2" size={48} /></div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无班组</h3>
          <p className="text-slate-500 mb-6">请先添加项目，然后创建班组</p>
          <button
            onClick={handleAddTeam}
            className="btn btn-warning"
          >
            添加班组
          </button>
        </div>
      )}

      {/* Team wage modal */}
      {wageModal && (
        <TeamWageModal
          show={!!wageModal}
          teamId={wageModal.teamId}
          teamName={wageModal.teamName}
          projectId={wageModal.projectId}
          projectName={wageModal.projectName}
          onClose={() => setWageModal(null)}
        />
      )}

      {/* Team form modal */}
      {showTeamModal && (
        <TeamFormModal
          visible={showTeamModal}
          editingTeam={editingTeam}
          formData={teamFormData}
          projects={projects}
          workers={members}
          onChange={(data) => setTeamFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleSubmitTeam}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default LaborTeamManager
