// WorkerSection 组件
// @deprecated 此组件已废弃，工人管理模块已改用 LaborWorkerList + LaborTeamManager

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tabs } from '../../ui/Tabs'
import type { WorkerTeam } from '@/types'
import { getWorkerTypeLabel } from '@/utils'
import {
  WorkerSectionProps, TeamFormData, defaultTeamFormData,
// @ts-ignore TS6133: defaultLeaveFormData is declared but never read
// @ts-ignore TS6133: LeaveFormData is declared but never read
  TeamCard, TeamFormModal, TransferModal, LeaveFormData, defaultLeaveFormData
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
  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-amber-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
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
        {/* 班组管理 */}
        <AnimatePresence mode="sync">
          {subTab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-slate-500">
                  按项目分类管理班组，共{workerTeams.length} 个班组                </div>
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
                    <div key={projectGroup.projectId} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4">🏗️</div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无班组</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">请先添加项目，然后创建班组</p>
                  <button
                    onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
                    className="btn btn-warning"
                  >
                    添加班组
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 工人列表 */}
          {subTab === 'workers' && (
            <motion.div
              key="workers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* 筛选器 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
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
              </div>

              {filteredWorkers.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">姓名</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">身份证号</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">年龄</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">性别</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">工种</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">日工资</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">银行卡号</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredWorkers.map(worker => {
                          const age = worker.birthDate ? calcAge(worker.birthDate) : null
                          const isOverage = age !== null && age > 60
                          return (
                          <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{worker.name}</td>
                            <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{worker.idCard || '-'}</td>
                            <td className={`px-3 py-2.5 text-center text-sm font-medium ${isOverage ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {age !== null ? age : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{worker.gender || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{worker.workerType ? getWorkerTypeLabel(worker.workerType as any) : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 font-medium">{worker.dailyWage ? `¥${worker.dailyWage}` : '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{(worker as any).bankAccount || '-'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => onEditWorker(worker)} className="btn btn-ghost btn-sm text-blue-600">编辑</button>
                                <button onClick={() => onDeleteWorker((worker as any).workerId)} className="btn btn-danger btn-sm">删除</button>
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无工人</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
                  <button
                    onClick={onAddWorker}
                    className="btn btn-warning"
                  >
                    添加工人
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 工资管理 */}
          {subTab === 'wages' && (
            <motion.div
              key="wages"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="min-h-[600px]"
            >
              {wageContent}
            </motion.div>
          )}
        </AnimatePresence>
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
