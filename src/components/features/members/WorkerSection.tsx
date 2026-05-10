/**
 * WorkerSection 组件
 * 
 * 农民工管理模块- 包含班组管理和工人管理 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam, WorkerType, WorkerStatus } from '@/types'
import { MemberCard } from './MemberCard'
import { getWorkerTypeLabel } from '@/utils'
import { Empty } from '@/components/ui/Empty'

// ═══════════════════════════════════════════════════════════════════════════════// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════
export interface WorkerSectionProps {
  /** 成员列表 */
  members: Member[]
  /** 项目列表 */
  projects: Array<{ id: number; name: string }>
  /** 班组列表 */
  workerTeams: WorkerTeam[]
  /** 加载状态*/
  loading: boolean
  /** 刷新数据回调 */
  onRefresh: () => void
  /** 添加工人回调 */
  onAddWorker: () => void
  /** 编辑工人回调 */
  onEditWorker: (worker: Member) => void
  /** 删除工人回调 */
  onDeleteWorker: (id: number) => void
  /** 添加班组回调 */
  onAddTeam: (name: string, projectId: number, leaderId?: number | null) => Promise<void>
  /** 编辑班组回调 */
  onEditTeam: (team: WorkerTeam) => void
  /** 删除班组回调 */
  onDeleteTeam: (id: number) => void
  /** 调组回调 */
  onTransfer: (worker: Member) => void
  /** 离场回调 */
  onLeave: (worker: Member) => void
  /** 重新入场回调 */
  onReEntry: (worker: Member) => void
}

// ═══════════════════════════════════════════════════════════════════════════════// 班组表单类型
// ═══════════════════════════════════════════════════════════════════════════════
export interface TeamFormData {
  name: string
  projectId?: number
  leaderId?: number | null
}

export const defaultTeamFormData: TeamFormData = {
  name: '',
  projectId: undefined,
  leaderId: undefined
}

/** 调组表单类型 */
export interface TransferFormData {
  toTeamId?: number
  toProjectId?: number
  transferDate: string
  reason: string
}

export const defaultTransferFormData: TransferFormData = {
  toTeamId: undefined,
  toProjectId: undefined,
  transferDate: new Date().toISOString().split('T')[0],
  reason: ''
}

/** 离场表单类型 */
export interface LeaveFormData {
  actualLeaveDate: string
  remarks: string
}

export const defaultLeaveFormData: LeaveFormData = {
  actualLeaveDate: new Date().toISOString().split('T')[0],
  remarks: ''
}

// ═══════════════════════════════════════════════════════════════════════════════// 班组卡片组件
// ═══════════════════════════════════════════════════════════════════════════════
interface TeamCardProps {
  team: WorkerTeam
  workerCount: number
  onEdit: () => void
  onDelete: () => void
}

function TeamCard({ team, workerCount, onEdit, onDelete }: TeamCardProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-orange-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Icon name="Users" size={20} className="mr-2" />
          <span className="font-medium text-slate-800">{team.name}</span>
        </div>
        {team.leaderId && team.leaderName && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
            组长: {team.leaderName}
          </span>
        )}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        工人: {workerCount} 人      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded transition-colors"
        >
          编辑
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════// 班组表单模态框
// ═══════════════════════════════════════════════════════════════════════════════
interface TeamFormModalProps {
  visible: boolean
  editingTeam: WorkerTeam | null
  formData: TeamFormData
  projects: Array<{ id: number; name: string }>
  workers: Member[]
  onChange: (data: Partial<TeamFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

function TeamFormModal({
  visible,
  editingTeam,
  formData,
  projects,
  workers,
  onChange,
  onSubmit,
  onClose
}: TeamFormModalProps) {
  // 过滤可用的班组长
  const availableLeaders = workers.filter(
    w => w.status !== 'left' && (!formData.projectId || w.projectId === formData.projectId)
  )

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {editingTeam ? '编辑班组' : '添加班组'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">班组名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => onChange({ name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="如：钢筋班、木工班"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">所属项目*</label>
            <select
              value={formData.projectId || ''}
              onChange={e => onChange({ projectId: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">请选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">班组长</label>
            <select
              value={formData.leaderId ?? ''}
              onChange={e => onChange({ leaderId: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">暂无班组长</option>
              {availableLeaders.map(w => (
                <option key={w.id} value={w.id}>{w.name} - {w.teamName || '未分组'}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">可以先创建班组，班组长可在之后从工人中选择指定</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              {editingTeam ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════// 调组模态框
// ═══════════════════════════════════════════════════════════════════════════════
interface TransferModalProps {
  visible: boolean
  worker: Member | null
  formData: TransferFormData
  workerTeams: WorkerTeam[]
  onChange: (data: Partial<TransferFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

function TransferModal({
  visible,
  worker,
  formData,
  workerTeams,
  onChange,
  onSubmit,
  onClose
}: TransferModalProps) {
  if (!visible || !worker) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">工人调组</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-800">{worker.name}</div>
            <div className="text-sm text-slate-500">
              当前: {worker.projectName} / {worker.teamName}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">调入班组 *</label>
            <select
              value={formData.toTeamId || ''}
              onChange={e => {
                const teamId = e.target.value ? Number(e.target.value) : undefined
                const team = workerTeams.find(t => t.id === teamId)
                onChange({
                  toTeamId: teamId,
                  toProjectId: team?.projectId
                })
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">选择调入的班组</option>
              {workerTeams
                .filter(t => t.id !== worker.teamId)
                .map(t => (
                  <option key={t.id} value={t.id}>{t.projectName} - {t.name}</option>
                ))
              }
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">调动日期 *</label>
            <input
              type="date"
              value={formData.transferDate}
              onChange={e => onChange({ transferDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">调动原因</label>
            <textarea
              value={formData.reason}
              onChange={e => onChange({ reason: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="如：项目完工调配、工作需要等"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              确认调组
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════// 离场模态框
// ═══════════════════════════════════════════════════════════════════════════════
interface LeaveModalProps {
  visible: boolean
  worker: Member | null
  formData: LeaveFormData
  onChange: (data: Partial<LeaveFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

function LeaveModal({
  visible,
  worker,
  formData,
  onChange,
  onSubmit,
  onClose
}: LeaveModalProps) {
  if (!visible || !worker) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">工人离场</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={16} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-800">{worker.name}</div>
            <div className="text-sm text-slate-500">
              进场日期: {worker.entryDate || '未知'}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">实际离场日期 *</label>
            <input
              type="date"
              value={formData.actualLeaveDate}
              onChange={e => onChange({ actualLeaveDate: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">备注（离场原因等？</label>
            <textarea
              value={formData.remarks}
              onChange={e => onChange({ remarks: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
              rows={3}
              placeholder="如：项目完工、个人原因等"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              确认离场
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════// 主组件// ═══════════════════════════════════════════════════════════════════════════════
/**
 * WorkerSection 组件
 */
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
