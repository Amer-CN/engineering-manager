import React, { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'
import { Input } from '../../ui/Input/Input'
import { workerTypeToCode } from './memberFormTypes'
import { recognizeIdCard } from '@/services/ocr'
import { Button } from '../../ui/Button'

export interface WorkerPoolFormData {
  name: string; phone: string; idCard: string
  idCardFront: string; idCardBack: string
  gender: string; ethnicity: string; birthDate: string; idCardAddress: string
  bankAccount: string; bankName: string; bankLineNo: string
  workerType: string; dailyWage: string
}

export const defaultWorkerPoolForm: WorkerPoolFormData = {
  name: '', phone: '', idCard: '',
  idCardFront: '', idCardBack: '',
  gender: '', ethnicity: '', birthDate: '', idCardAddress: '',
  bankAccount: '', bankName: '', bankLineNo: '',
  workerType: '', dailyWage: ''
}

interface Props {
  visible: boolean
  editing: any | null // existing Worker object or null
  onClose: () => void
  onSubmit: (data: WorkerPoolFormData) => Promise<void>
  onSwitchToFull?: (worker: any) => void // 切换到完整表单
}

export function WorkerPoolForm({ visible, editing, onClose, onSubmit, onSwitchToFull }: Props) {
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
  bankAccount: editing.bankAccount || '', bankName: editing.bankName || '', bankLineNo: editing.bankLineNo || '',
  workerType: workerTypeToCode(editing.workerType), dailyWage: editing.dailyWage ? String(editing.dailyWage) : ''
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
  // OCR: 身份证识别（通过 ocr.ts 调用主进程 IPC）
  setOcrBusy(true)
  recognizeIdCard(dataUrl).then((res) => {
  if (res?.success && res.idCard) {
  const d = res.idCard
  update({
  gender: d.gender || form.gender,
  ethnicity: d.ethnicity || form.ethnicity,
  birthDate: d.birthDate || form.birthDate,
  idCardAddress: d.address || form.idCardAddress,
  idCard: d.number || form.idCard,
  name: d.name || form.name
  })
  }
  }).catch(() => {}).finally(() => setOcrBusy(false))
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

  return (
  <Modal isOpen={visible} onClose={onClose} title={editing ? '编辑工人信息' : '添加工人'} size="lg"
  footer={
  <div className="flex items-center justify-between w-full">
  <div>
  {editing && onSwitchToFull && (
  <button type="button" onClick={() => onSwitchToFull(editing)} className="text-sm text-amber-600 hover:text-amber-700 hover:underline">填写完整信息 →</button>
  )}
  </div>
  <div className="flex gap-3">
  <Button onClick={onClose}  variant="secondary" className="btn text-sm">取消</Button>
  <Button onClick={handleSubmit} disabled={submitting || !form.name.trim()}  variant="warning" className="btn text-sm disabled:opacity-50">
  {submitting ? '提交中...' : editing ? '保存修改' : '添加'}
  </Button>
  </div>
  </div>
  }
  >
  <form onSubmit={handleSubmit} className="space-y-4">
  {/* Basic info */}
  <div className="grid grid-cols-2 gap-4">
  <div>
  <Input label="姓名" type="text" value={form.name} onChange={e => update({ name: e.target.value })} size="sm" required />
  </div>
  <div>
  <Input label="联系电话" type="text" value={form.phone} onChange={e => update({ phone: e.target.value })} size="sm" />
  </div>
  </div>
  <div>
  <Input label="身份证号" type="text" value={form.idCard} onChange={e => update({ idCard: e.target.value })} maxLength={18} size="sm" className="font-mono" />
  </div>

  {/* ID Card upload */}
  <div className="grid grid-cols-2 gap-4">
  <div>
  <label className="block text-sm font-medium text-slate-700 mb-1">身份证人像面</label>
  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-amber-400 transition-colors">
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
  <label className="block text-sm font-medium text-slate-700 mb-1">身份证国徽面</label>
  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-amber-400 transition-colors">
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
  <label className="block text-sm font-medium text-slate-700 mb-1">性别</label>
  <select value={form.gender} onChange={e => update({ gender: e.target.value })}
  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">
  <option value="">未知</option><option value="男">男</option><option value="女">女</option>
  </select>
  </div>
  <div>
  <Input label="民族" type="text" value={form.ethnicity} onChange={e => update({ ethnicity: e.target.value })} size="sm" />
  </div>
  </div>
  <div className="grid grid-cols-2 gap-4">
  <div>
  <Input label="出生日期" type="date" value={form.birthDate} onChange={e => update({ birthDate: e.target.value })} size="sm" />
  </div>
  <div />
  </div>
  <div>
  <Input label="身份证住址" type="text" value={form.idCardAddress} onChange={e => update({ idCardAddress: e.target.value })} size="sm" />
  </div>

  {/* Bank info */}
  <div className="grid grid-cols-3 gap-4">
  <div>
  <Input label="工资卡号" type="text" value={form.bankAccount} onChange={e => update({ bankAccount: e.target.value })} size="sm" className="font-mono" />
  </div>
  <div>
  <Input label="开户行" type="text" value={form.bankName} onChange={e => update({ bankName: e.target.value })} size="sm" />
  </div>
  <div>
  <Input label="联行号" type="text" value={form.bankLineNo} onChange={e => update({ bankLineNo: e.target.value })} size="sm" className="font-mono" />
  </div>
  </div>

  {/* Worker type & wage */}
  <div className="grid grid-cols-2 gap-4">
  <div>
  <label className="block text-sm font-medium text-slate-700 mb-1">默认工种</label>
  <select value={form.workerType} onChange={e => update({ workerType: e.target.value })}
  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500">
  <option value="">未设置</option>
  <option value="bricklayer">砌筑工</option>
  <option value="concreter">混凝土工</option>
  <option value="steel">钢筋工</option>
  <option value="formwork">模板工</option>
  <option value="carpenter">木工</option>
  <option value="painter">油漆工</option>
  <option value="plumber">水暖工</option>
  <option value="electrician">电工</option>
  <option value="welder">焊工</option>
  <option value="rigger">起重工</option>
  <option value="driver">驾驶员</option>
  <option value="mechanic">机械工</option>
  <option value="other">其他</option>
  </select>
  </div>
  <div>
  <Input label="默认日工资" type="number" value={form.dailyWage} onChange={e => update({ dailyWage: e.target.value })} size="sm" min={0} placeholder="元/天" />
  </div>
  </div>
  </form>
  </Modal>
  )
}

export default WorkerPoolForm
