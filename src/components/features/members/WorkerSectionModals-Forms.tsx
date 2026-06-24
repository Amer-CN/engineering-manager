import React from 'react'
import { Modal } from '../../ui/Modal/Modal'
import type { Member, WorkerTeam } from '@/types'
import type { TeamFormData, TransferFormData } from './WorkerSectionModals'
import { Button } from '../../ui/Button'

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
  const availableLeaders = workers.filter(
    w => w.status !== 'left'
      && (!formData.projectId || w.projectId === formData.projectId)
      && (editingTeam ? w.teamId === editingTeam.id : true)
  )

  return (
    <Modal isOpen={visible} onClose={onClose} title={editingTeam ? '编辑班组' : '添加班组'} size="md"
      footer={
        <>
          <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
          <Button type="submit" form="team-form"  variant="warning">{editingTeam ? '保存' : '添加'}</Button>
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
          <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
          <Button type="submit" form="transfer-form"  variant="primary">确认调组</Button>
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
