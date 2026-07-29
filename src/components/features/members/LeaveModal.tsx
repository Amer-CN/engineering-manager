import React from 'react'
import { Drawer } from '../../ui/Drawer'
import type { Member } from '@/types'
import { Button } from '../../ui/Button'

export interface LeaveFormData {
  actualLeaveDate: string
  remarks: string
}

export const defaultLeaveFormData: LeaveFormData = {
  actualLeaveDate: new Date().toISOString().split('T')[0],
  remarks: ''
}

interface LeaveModalProps {
  visible: boolean
  worker: Member | null
  formData: LeaveFormData
  onChange: (data: Partial<LeaveFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function LeaveModal({
  visible, worker, formData, onChange, onSubmit, onClose
}: LeaveModalProps) {
  if (!visible || !worker) return null

  return (
  <Drawer open onClose={onClose} icon="LogOut" title="工人离场"
  footer={
  <div className="flex items-center justify-end gap-3">
  <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
  <Button type="button" onClick={onSubmit}  variant="primary">确认离场</Button>
  </div>
  }>
  <form onSubmit={onSubmit} className="px-6 py-4">
  <div className="mb-4 p-3 bg-[color:var(--panel-2)] rounded-lg">
  <div className="font-medium text-[color:var(--fg)]">{worker.name}</div>
  <div className="text-sm text-[color:var(--muted)]">
  进场日期: {worker.entryDate || '未知'}
  </div>
  </div>

  <div className="mb-4">
  <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">实际离场日期 *</label>
  <input
  type="date"
  value={formData.actualLeaveDate}
  onChange={e => onChange({ actualLeaveDate: e.target.value })}
  className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--border-strong)]"
  required
  />
  </div>

  <div className="mb-6">
  <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">备注（离场原因等）</label>
  <textarea
  value={formData.remarks}
  onChange={e => onChange({ remarks: e.target.value })}
  className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--border-strong)]"
  rows={3}
  placeholder="如：项目完工、个人原因等"
  />
  </div>
  </form>
  </Drawer>
  )
}
