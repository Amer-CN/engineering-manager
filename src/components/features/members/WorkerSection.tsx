// WorkerSection 组件

import React, { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam, WorkerStatus } from '@/types'
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
  onReEntry,
  onImportClick,
  onFileDrop,
  onAddFromPool,
  wageContent,
  onManageWorkers,
  onUpdateWorker,
  onRemoveFromTeam
}: WorkerSectionProps) {
  // 子Tab状态
  const [subTab, setSubTab] = useState<'teams' | 'workers' | 'wages'>('teams')

  // 筛选状态
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')

  // 班组表单模态框状态
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<WorkerTeam | null>(null)
  const [teamFormData, setTeamFormData] = useState<TeamFormData>(defaultTeamFormData)

  // 调组模态框状态
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferWorker, setTransferWorker] = useState<Member | null>(null)
  const [transferFormData, setTransferFormData] = useState<TransferFormData>(defaultTransferFormData)

  // 离场模态框状态
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveWorker, setLeaveWorker] = useState<Member | null>(null)
  const [leaveFormData, setLeaveFormData] = useState<LeaveFormData>(defaultLeaveFormData)

  // 拖拽上传状态
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        onFileDrop(file)
      }
    }
  }, [onFileDrop])

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
        {([
          { key: 'teams' as const, icon: 'Building2', label: '班组管理', count: workerTeams.length },
          { key: 'workers' as const, icon: 'Construction', label: '工人库', count: filteredWorkers.length },
          { key: 'wages' as const, icon: 'Wallet', label: '工资管理' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              subTab === tab.key ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {subTab === tab.key && (
              <motion.div layoutId="worker-tab" className="absolute inset-0 bg-orange-600 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon name={tab.icon as any} size={14} />{tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </span>
          </button>
        ))}
      </div>

      {/* 班组管理 */}
      {subTab === 'teams' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="text-slate-500">
              按项目分类管理班组，共{workerTeams.length} 个班组            </div>
            <div className="flex items-center gap-3">
              {onAddFromPool && (
                <button onClick={() => {
                  const projectId = projects[0]?.id
                  if (projectId) onAddFromPool(projectId, new Set(members.filter(m => m.projectId === projectId).map(m => (m as any).workerId)))
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center">
                  <Icon name="Users" size={18} className="mr-1.5" />从工人库添加
                </button>
              )}
              <button
                onClick={() => { setEditingTeam(null); setTeamFormData(defaultTeamFormData); setShowTeamModal(true) }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                <Icon name="Plus" size={20} className="mr-2" />
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
            <button onClick={onAddWorker} className="ml-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center">
              <Icon name="Plus" size={18} className="mr-1" />添加工人
            </button>
            <button onClick={onImportClick} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center">
              <Icon name="Upload" size={18} className="mr-1" />导入Excel
            </button>
          </div>

          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={onImportClick}
            className={`mb-4 border-2 border-dashed rounded-lg px-4 py-2.5 text-center cursor-pointer transition-all duration-200 ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImportClick} />
            <div className="flex items-center justify-center gap-2 text-sm">
              <Icon name="Upload" size={16} className="text-slate-400" />
              <span className="text-slate-500">拖拽 Excel 文件到此处导入工人</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400 text-xs">.xlsx .xls .csv</span>
            </div>
          </div>

          {filteredWorkers.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">姓名</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">身份证号</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">性别</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">班组</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">工种</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">日工资</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">进场日期</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">状态</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredWorkers.map(worker => (
                      <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{worker.name}</td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{worker.idCard || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{worker.gender || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{worker.teamName || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{worker.workerType ? getWorkerTypeLabel(worker.workerType as any) : '-'}</td>
                        <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 font-medium">{worker.dailyWage ? `¥${worker.dailyWage}` : '-'}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{worker.entryDate || '-'}</td>
                        <td className="px-3 py-2.5 text-center">
                          {worker.status === 'active' ? (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">在职</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">离场</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => onEditWorker(worker)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">编辑</button>
                            {worker.status === 'active' && (<button onClick={() => { setTransferWorker(worker); setTransferFormData(defaultTransferFormData); setShowTransferModal(true) }} className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded">调组</button>)}
                            {worker.status === 'active' && (<button onClick={() => { setLeaveWorker(worker); setLeaveFormData(defaultLeaveFormData); setShowLeaveModal(true) }} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">离场</button>)}
                            {worker.status === 'left' && (<button onClick={() => onReEntry(worker)} className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded">重新入场</button>)}
                            <button onClick={() => onDeleteWorker((worker as any).workerId)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无工人</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
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

      {/* 工资管理 */}
      {subTab === 'wages' && <div className="min-h-[600px]">{wageContent}</div>}

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

      {/* 调组模态框 */}
      {showTransferModal && transferWorker && (
        <TransferModal
          visible={showTransferModal}
          worker={transferWorker}
          formData={transferFormData}
          workerTeams={workerTeams}
          onChange={(data) => setTransferFormData(prev => ({ ...prev, ...data }))}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!transferFormData.toTeamId) return
            const team = workerTeams.find(t => t.id === transferFormData.toTeamId)
            await onTransfer(transferWorker, transferFormData.toTeamId, team?.projectId || transferWorker.projectId || 0, transferFormData.transferDate, transferFormData.reason)
            setShowTransferModal(false); setTransferWorker(null); setTransferFormData(defaultTransferFormData)
          }}
          onClose={() => { setShowTransferModal(false); setTransferWorker(null); setTransferFormData(defaultTransferFormData) }}
        />
      )}

      {/* 离场模态框 */}
      {showLeaveModal && leaveWorker && (
        <LeaveModal
          visible={showLeaveModal}
          worker={leaveWorker}
          formData={leaveFormData}
          onChange={(data) => setLeaveFormData(prev => ({ ...prev, ...data }))}
          onSubmit={async (e) => {
            e.preventDefault()
            await onLeave(leaveWorker, leaveFormData.actualLeaveDate, leaveFormData.remarks)
            setShowLeaveModal(false); setLeaveWorker(null); setLeaveFormData(defaultLeaveFormData)
          }}
          onClose={() => { setShowLeaveModal(false); setLeaveWorker(null); setLeaveFormData(defaultLeaveFormData) }}
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
