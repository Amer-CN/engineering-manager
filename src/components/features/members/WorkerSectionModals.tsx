import React from 'react'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '@/types'
export { TeamFormModal, TransferModal } from './WorkerSectionModals-Forms'
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


