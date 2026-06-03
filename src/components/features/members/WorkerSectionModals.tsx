import React from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'; import type { Member, WorkerTeam } from '@/types'
import { defaultLeaveFormData } from './LeaveModal'
export type { LeaveFormData } from './LeaveModal'
export { defaultLeaveFormData }
export interface WorkerSectionProps {
  members: Member[]
  projects: Array<{ id: number; name: string }>
  workerTeams: WorkerTeam[]
  loading: boolean
  onRefresh: () => void
  onAddWorker: () => void
  onEditWorker: (worker: Member) => void
  onDeleteWorker: (id: number) => void
  onAddTeam: (name: string, projectId: number, leaderId?: number | null) => Promise<void>
  onEditTeam: (team: WorkerTeam) => void
  onDeleteTeam: (id: number) => void
  onImportClick: () => void
  onAddFromPool?: () => void
  wageContent?: React.ReactNode
  onManageWorkers?: (teamId: number, teamName: string, projectId: number) => void
  onUpdateWorker?: (pwId: number, data: Record<string, any>) => void
  onRemoveFromTeam?: (pwId: number) => void
}

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

interface TeamCardProps {
  team: WorkerTeam
  workerCount: number
  onEdit: () => void
  onDelete: () => void
  onManageWorkers?: (teamId: number, teamName: string, projectId: number) => void
  onTeamWages?: (teamId: number, teamName: string, projectId: number, projectName: string) => void
}

export function TeamCard({ team, workerCount, onEdit, onDelete, onManageWorkers, onTeamWages }: TeamCardProps) {
  const projectName = (team as any).projectName || ''
  return (
  <div className="border border-slate-200 rounded-lg p-4 hover:border-amber-300 transition-colors">
  <div className="flex items-center justify-between mb-2">
  <div className="flex items-center">
  <Icon name="Users" size={20} className="mr-2" />
  <span className="font-medium text-slate-800">{team.name}</span>
  </div>
  {team.leaderId && team.leaderName && (
  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
  组长: {team.leaderName}
  </span>
  )}
  </div>
  <div className="text-sm text-slate-500 mb-3">
  工人: {workerCount} 人 </div>
  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
  {onManageWorkers && (
  <button
  onClick={() => onManageWorkers(team.id, team.name, team.projectId)}
  className="btn btn-ghost btn-sm text-primary-600 flex-1"
  >
  管理工人
  </button>
  )}
  {onTeamWages && (
  <button
  onClick={() => onTeamWages(team.id, team.name, team.projectId, projectName)}
  className="btn btn-ghost btn-sm text-success-600 flex-1"
  >
  工资汇总
  </button>
  )}
  <button
  onClick={onEdit}
  className="btn btn-ghost btn-sm text-warning-600 flex-1"
  >
  编辑
  </button>
  <button
  onClick={onDelete}
  className="btn btn-danger btn-sm flex-1"
  >
  删除
  </button>
  </div>
  </div>
  )
}

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

export function TeamFormModal({
  visible,
  editingTeam,
  formData,
  projects,
  workers,
  onChange,
  onSubmit,
  onClose
}: TeamFormModalProps) {
  // 过滤可用的班组长：只能从本班组工人中选
  const availableLeaders = workers.filter(
  w => w.status !== 'left'
  && (!formData.projectId || w.projectId === formData.projectId)
  && (editingTeam ? w.teamId === editingTeam.id : true)
  )

  return (
  <Modal isOpen={visible} onClose={onClose} title={editingTeam ? '编辑班组' : '添加班组'} size="md"
  footer={
  <>
  <button type="button" onClick={onClose} className="btn btn-secondary">取消</button>
  <button type="submit" form="team-form" className="btn btn-warning">{editingTeam ? '保存' : '添加'}</button>
  </>
  }
  >
  <form id="team-form" onSubmit={onSubmit}>
  <div className="mb-4">
  <label className="block text-sm font-medium text-slate-700 mb-1">班组名称 *</label>
  <input
  type="text"
  value={formData.name}
  onChange={e => onChange({ name: e.target.value })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  placeholder="如：钢筋班、木工班"
  required
  />
  </div>

  <div className="mb-4">
  <label className="block text-sm font-medium text-slate-700 mb-1">所属项目*</label>
  <select
  value={formData.projectId || ''}
  onChange={e => onChange({ projectId: e.target.value ? Number(e.target.value) : undefined })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  required
  >
  <option value="">请选择项目</option>
  {projects.map(p => (
  <option key={p.id} value={p.id}>{p.name}</option>
  ))}
  </select>
  </div>

  <div className="mb-2">
  <label className="block text-sm font-medium text-slate-700 mb-1">班组长</label>
  <select
  value={formData.leaderId ?? ''}
  onChange={e => onChange({ leaderId: e.target.value ? Number(e.target.value) : null })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  >
  <option value="">暂无班组长</option>
  {availableLeaders.map(w => (
  <option key={w.id} value={w.id}>{w.name} - {w.teamName || '未分组'}</option>
  ))}
  </select>
  <p className="text-xs text-slate-500 mt-1">可以先创建班组，班组长可在之后从工人中选择指定</p>
  </div>
  </form>
  </Modal>
  )
}

interface TransferModalProps {
  visible: boolean
  worker: Member | null
  formData: TransferFormData
  workerTeams: WorkerTeam[]
  onChange: (data: Partial<TransferFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function TransferModal({
  visible,
  worker,
  formData,
  workerTeams,
  onChange,
  onSubmit,
  onClose
}: TransferModalProps) {
  return (
  <Modal isOpen={visible && !!worker} onClose={onClose} title="工人调组" size="md"
  footer={
  <>
  <button type="button" onClick={onClose} className="btn btn-secondary">取消</button>
  <button type="submit" form="transfer-form" className="btn btn-primary">确认调组</button>
  </>
  }
  >
  <form id="transfer-form" onSubmit={onSubmit}>
  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
  <div className="font-medium text-slate-800">{worker?.name}</div>
  <div className="text-sm text-slate-500">
  当前: {worker?.projectName} / {worker?.teamName}
  </div>
  </div>

  <div className="mb-4">
  <label className="block text-sm font-medium text-slate-700 mb-1">调入班组 *</label>
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
  .filter(t => worker && t.id !== worker.teamId)
  .map(t => (
  <option key={t.id} value={t.id}>{t.projectName} - {t.name}</option>
  ))
  }
  </select>
  </div>

  <div className="mb-4">
  <label className="block text-sm font-medium text-slate-700 mb-1">调动日期 *</label>
  <input
  type="date"
  value={formData.transferDate}
  onChange={e => onChange({ transferDate: e.target.value })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  required
  />
  </div>

  <div className="mb-2">
  <label className="block text-sm font-medium text-slate-700 mb-1">调动原因</label>
  <textarea
  value={formData.reason}
  onChange={e => onChange({ reason: e.target.value })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  rows={2}
  placeholder="如：项目完工调配、工作需要等"
  />
  </div>
  </form>
  </Modal>
  )
}


// WorkerSection 组件
