// WorkerSection 组件

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam, WorkerStatus } from '@/types'
import { MemberCard } from './MemberCard'
import { getWorkerTypeLabel } from '@/utils'
import {
  WorkerSectionProps, TeamFormData, defaultTeamFormData,
  TransferFormData, defaultTransferFormData,
  LeaveFormData, defaultLeaveFormData,
  TeamCard, TeamFormModal, TransferModal, LeaveModal
} from './WorkerSectionModals'

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
  onTransfer,
  onLeave,
  onReEntry
}: WorkerSectionProps) {
  // 子Tab状态
  const [subTab, setSubTab] = useState<'teams' | 'workers'>('teams')

  // 筛选状态
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')

  // 班组表单模态框状态
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<WorkerTeam | null>(null)
  const [teamFormData, setTeamFormData] = useState<TeamFormData>(defaultTeamFormData)

  // 农民工列表
  const workerMembers = members.filter(m => m.memberType === 'worker')

  // 筛选后的工人
  const filteredWorkers = workerMembers.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    if (filterStatus !== 'all' && w.status !== filterStatus) return false
    return true
  })

  // 按项目分组班组
  const teamsByProject = workerTeams.reduce((acc, team) => {
    if (!acc[team.projectId]) {
      acc[team.projectId] = {
        projectName: team.projectName || projects.find(p => p.id === team.projectId)?.name || '未知项目',
        projectId: team.projectId,
        teams: []
      }
    }
    acc[team.projectId].teams.push(team)
    return acc
  }, {} as Record<number, { projectName: string; projectId: number; teams: WorkerTeam[] }>)

  // 获取班组工人数量
  const getTeamWorkerCount = (teamId: number) => {
    return workerMembers.filter(w => w.teamId === teamId).length
  }

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-orange-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 子Tab */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setSubTab('teams')}
          className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            subTab === 'teams' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {subTab === 'teams' && (
            <motion.div layoutId="worker-tab" className="absolute inset-0 bg-orange-600 rounded-xl shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          )}
          <span className="relative z-10 flex items-center gap-1.5"><Icon name="Building2" size={14} />班组管理 ({workerTeams.length})</span>
        </button>
        <button
          onClick={() => setSubTab('workers')}
          className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            subTab === 'workers' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {subTab === 'workers' && (
            <motion.div layoutId="worker-tab" className="absolute inset-0 bg-orange-600 rounded-xl shadow-md"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          )}
          <span className="relative z-10 flex items-center gap-1.5"><Icon name="Construction" size={14} />工人列表 ({filteredWorkers.length})</span>
        </button>
      </div>

      {/* 班组管理 */}
      {subTab === 'teams' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="text-slate-500">
              按项目分类管理班组，共{workerTeams.length} 个班组            </div>
            <button
              onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              添加班组
            </button>
          </div>

          {Object.keys(teamsByProject).length > 0 ? (
            <div className="space-y-6">
              {Object.values(teamsByProject).map(projectGroup => (
                <div key={projectGroup.projectId} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
                          onEdit={() => onEditTeam(team)}
                          onDelete={() => onDeleteTeam(team.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4"><Icon name="Building2" size={48} /></div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无班组</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">请先添加项目，然后创建班组</p>
              <button
                onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                添加班组
              </button>
            </div>
          )}
        </>
      )}

      {/* 工人列表 */}
      {subTab === 'workers' && (
        <>
          {/* 筛选器 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
            <span className="text-slate-600 font-medium">筛选：</span>
            <select
              value={filterProject || ''}
              onChange={e => { setFilterProject(e.target.value ? Number(e.target.value) : null); setFilterTeam(null) }}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">全部项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={filterTeam || ''}
              onChange={e => setFilterTeam(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              disabled={!filterProject}
            >
              <option value="">全部班组</option>
              {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as WorkerStatus | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">全部状态</option>
              <option value="active">在职</option>
              <option value="left">已离场</option>
            </select>
            <button
              onClick={onAddWorker}
              className="ml-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center"
            >
              <Icon name="Plus" size={18} className="mr-1" />
              添加工人
            </button>
          </div>

          {filteredWorkers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredWorkers.map(worker => (
                <MemberCard
                  key={worker.id}
                  member={worker}
                  type="worker"
                  onClick={() => {}}
                  onEdit={() => onEditWorker(worker)}
                  onDelete={() => onDeleteWorker(worker.id)}
                  onTransfer={onTransfer}
                  onLeave={onLeave}
                  onReEntry={onReEntry}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无工人</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">点击下方按钮添加工人</p>
              <button
                onClick={onAddWorker}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                添加工人
              </button>
            </div>
          )}
        </>
      )}

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
            await onAddTeam(teamFormData.name, teamFormData.projectId, teamFormData.leaderId)
            setShowTeamModal(false)
            setTeamFormData(defaultTeamFormData)
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
