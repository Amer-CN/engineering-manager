import React from 'react'
import { Modal } from '../../ui/Modal/Modal'
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
  <Modal isOpen onClose={onClose} title="工人离场" size="md"
  footer={
  <>
  <Button type="button" onClick={onClose}  variant="secondary" className="btn">取消</Button>
  <Button type="button" onClick={onSubmit}  variant="primary" className="btn">确认离场</Button>
  </>
  }>
  <form onSubmit={onSubmit}>
  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
  <div className="font-medium text-slate-800">{worker.name}</div>
  <div className="text-sm text-slate-500">
  进场日期: {worker.entryDate || '未知'}
  </div>
  </div>

  <div className="mb-4">
  <label className="block text-sm font-medium text-slate-700 mb-1">实际离场日期 *</label>
  <input
  type="date"
  value={formData.actualLeaveDate}
  onChange={e => onChange({ actualLeaveDate: e.target.value })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
  required
  />
  </div>

  <div className="mb-6">
  <label className="block text-sm font-medium text-slate-700 mb-1">备注（离场原因等）</label>
  <textarea
  value={formData.remarks}
  onChange={e => onChange({ remarks: e.target.value })}
  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
  rows={3}
  placeholder="如：项目完工、个人原因等"
  />
  </div>
  </form>
  </Modal>
  )
}
