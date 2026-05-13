import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

export interface WorkerPoolFormData {
  name: string; phone: string; idCard: string
  idCardFront: string; idCardBack: string
  gender: string; ethnicity: string; birthDate: string; idCardAddress: string
  bankAccount: string; bankName: string
}

export const defaultWorkerPoolForm: WorkerPoolFormData = {
  name: '', phone: '', idCard: '',
  idCardFront: '', idCardBack: '',
  gender: '', ethnicity: '', birthDate: '', idCardAddress: '',
  bankAccount: '', bankName: ''
}

interface Props {
  visible: boolean
  editing: any | null  // existing Worker object or null
  onClose: () => void
  onSubmit: (data: WorkerPoolFormData) => Promise<void>
}

export function WorkerPoolForm({ visible, editing, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<WorkerPoolFormData>(defaultWorkerPoolForm)
  const [submitting, setSubmitting] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (editing) {
      setForm({
        name: editing.name || '', phone: editing.phone || '',
        idCard: editing.idCard || '', idCardFront: '', idCardBack: '',
        gender: editing.gender || '', ethnicity: editing.ethnicity || '',
        birthDate: editing.birthDate || '', idCardAddress: editing.address || '',
        bankAccount: editing.bankAccount || '', bankName: editing.bankName || ''
      })
    } else {
      setForm(defaultWorkerPoolForm)
    }
  }, [visible, editing])

  const update = (patch: Partial<WorkerPoolFormData>) => setForm(prev => ({ ...prev, ...patch }))

  const handleFileUpload = (field: 'idCardFront' | 'idCardBack') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      update({ [field]: dataUrl })
      // OCR: recognize ID card
      if ((window as any).electronAPI?.recognizeIdCard) {
        setOcrBusy(true)
        ;(window as any).electronAPI.recognizeIdCard(dataUrl).then((res: any) => {
          if (res?.success && res.data) {
            const d = res.data
            update({
              gender: d.gender || form.gender,
              ethnicity: d.ethnicity || form.ethnicity,
              birthDate: d.birthDate || form.birthDate,
              idCardAddress: d.address || form.idCardAddress,
              idCard: d.idCard || form.idCard,
              name: d.name || form.name
            })
          }
        }).catch(() => {}).finally(() => setOcrBusy(false))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try { await onSubmit(form) }
    finally { setSubmitting(false) }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {editing ? '编辑工人信息' : '添加工人'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Icon name="X" size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">姓名 *</label>
              <input type="text" value={form.name} onChange={e => update({ name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">联系电话</label>
              <input type="text" value={form.phone} onChange={e => update({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">身份证号</label>
            <input type="text" value={form.idCard} onChange={e => update({ idCard: e.target.value })} maxLength={18}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono" />
          </div>

          {/* ID Card upload */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">身份证人像面</label>
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                {form.idCardFront ? (
                  <img src={form.idCardFront} className="h-full object-contain rounded" alt="" />
                ) : (
                  <div className="text-xs text-slate-400 text-center">
                    <Icon name="Upload" size={18} className="mx-auto mb-1" />
                    {ocrBusy ? '识别中...' : '点击上传'}
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload('idCardFront')} />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">身份证国徽面</label>
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                {form.idCardBack ? (
                  <img src={form.idCardBack} className="h-full object-contain rounded" alt="" />
                ) : (
                  <div className="text-xs text-slate-400 text-center">
                    <Icon name="Upload" size={18} className="mx-auto mb-1" />
                    {ocrBusy ? '识别中...' : '点击上传'}
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload('idCardBack')} />
              </label>
            </div>
          </div>

          {/* Auto-filled from OCR */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">性别</label>
              <select value={form.gender} onChange={e => update({ gender: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                <option value="">未知</option><option value="男">男</option><option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">民族</label>
              <input type="text" value={form.ethnicity} onChange={e => update({ ethnicity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">出生日期</label>
              <input type="date" value={form.birthDate} onChange={e => update({ birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
            </div>
            <div />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">身份证住址</label>
            <input type="text" value={form.idCardAddress} onChange={e => update({ idCardAddress: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" />
          </div>

          {/* Bank info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">工资卡号</label>
              <input type="text" value={form.bankAccount} onChange={e => update({ bankAccount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">开户行</label>
              <input type="text" value={form.bankName} onChange={e => update({ bankName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">取消</button>
          <button onClick={handleSubmit} disabled={submitting || !form.name.trim()}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {submitting ? '提交中...' : editing ? '保存修改' : '添加'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default WorkerPoolForm
