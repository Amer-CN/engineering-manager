import React from 'react'
import { Icon } from '../../ui/Icon'
import { motion } from 'framer-motion'
import type { Member } from '@/types'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
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
