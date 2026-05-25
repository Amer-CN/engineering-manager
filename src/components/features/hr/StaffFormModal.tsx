import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { DropZone } from '../../ui/DropZone'

export function calcAge(birthDate: string): string {
  if (!birthDate) return ''
  const b = new Date(birthDate)
  const t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
  return a >= 0 ? `${a}岁` : ''
}

export interface StaffFormData {
  name: string; phone: string; email: string; idCard: string; gender: string
  ethnicity: string; birthDate: string; idCardAddress: string
  departmentId: number | ''; position: string; entryDate: string
  baseSalary: number | ''; status: string; leaveDate: string; reentryDate: string; idCardFront: string
  idCardBack: string; contractFile: string; contractFileType: string
}

interface Props {
  editing: any
  formData: StaffFormData
  departments: any[]
  ocrLoading: boolean
  ocrMode: string
  dragOver: string | null
  onChange: (data: StaffFormData) => void
  onFileDrop: (field: string, file: File) => void
  onRemove: () => void
  onSubmit: (e: React.FormEvent) => void
  setDragOver: (v: string | null) => void
}

const StaffFormModal: React.FC<Props> = ({
  editing, formData, departments, ocrLoading, ocrMode, dragOver,
  onChange, onFileDrop, onRemove, onSubmit, setDragOver,
}) => {
  const set = (patch: Partial<StaffFormData>) => {
    const next = { ...formData, ...patch }
    if (patch.departmentId !== undefined && patch.departmentId !== formData.departmentId) {
      const dept = departments.find((d: any) => d.id === patch.departmentId)
      if (dept?.positions?.length && !dept.positions.includes(next.position)) {
        next.position = ''
      }
    }
    // 状态自动推导：
    //   有离职日期 且 无重新入职 → 离职
    //   其他情况 → 在职（包括未填离职、或已填离职+重新入职）
    if ('leaveDate' in patch || 'reentryDate' in patch) {
      const ld = 'leaveDate' in patch ? patch.leaveDate : formData.leaveDate
      const rd = 'reentryDate' in patch ? patch.reentryDate : formData.reentryDate
      next.status = (ld && !rd) ? 'left' : 'active'
    }
    onChange(next)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{editing ? '编辑人员' : '添加人员'}</h2>
          <button onClick={onRemove} className="btn btn-ghost p-1"><Icon name="X" size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-5">

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">姓名 *</label>
              <input type="text" value={formData.name} onChange={e => set({ name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">性别</label>
              <select value={formData.gender} onChange={e => set({ gender: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="男">男</option><option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">民族</label>
              <input type="text" value={formData.ethnicity} onChange={e => set({ ethnicity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="如：汉族" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">出生日期</label>
              <div className="flex gap-2 items-center">
                <input type="date" value={formData.birthDate} onChange={e => set({ birthDate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                {formData.birthDate && <span className="text-xs text-indigo-600 whitespace-nowrap">{calcAge(formData.birthDate)}</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">手机</label>
              <input type="text" value={formData.phone} onChange={e => set({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
              <input type="email" value={formData.email} onChange={e => set({ email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">身份证号</label>
            <input type="text" value={formData.idCard} onChange={e => set({ idCard: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">身份证住址</label>
            <input type="text" value={formData.idCardAddress} onChange={e => set({ idCardAddress: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="身份证上的户籍地址" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">部门</label>
              <select value={formData.departmentId} onChange={e => set({ departmentId: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">请选择</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">职位</label>
              {(() => {
                const dept = departments.find((d: any) => d.id === formData.departmentId)
                const deptPositions: string[] = dept?.positions || []
                if (deptPositions.length > 0) {
                  return (
                    <select value={formData.position} onChange={e => set({ position: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="">请选择</option>
                      {deptPositions.map((p: string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )
                }
                return (
                  <input type="text" value={formData.position} onChange={e => set({ position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder={formData.departmentId ? '该部门暂无预设职位，请手动输入' : '请先选择部门'} />
                )
              })()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">入职日期</label>
              <input type="date" value={formData.entryDate} onChange={e => set({ entryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">月基本工资</label>
              <input type="number" value={formData.baseSalary} onChange={e => set({ baseSalary: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="元/月" />
            </div>
            {editing && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    离职日期
                    {formData.leaveDate && !formData.reentryDate && (
                      <span className="ml-2 text-xs text-amber-600">已离职</span>
                    )}
                    {formData.leaveDate && formData.reentryDate && (
                      <span className="ml-2 text-xs text-emerald-600">已重新入职</span>
                    )}
                  </label>
                  <input type="date" value={formData.leaveDate} onChange={e => set({ leaveDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                {formData.leaveDate && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">重新入职日期</label>
                    <input type="date" value={formData.reentryDate} onChange={e => set({ reentryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="填写此日期表示该员工已重新入职" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              身份证照片
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${ocrMode === 'baidu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {ocrMode === 'baidu' ? '百度OCR' : '离线OCR'}
              </span>
              {ocrLoading && <span className="ml-1 text-xs text-amber-500">识别中...</span>}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(['idCardFront', 'idCardBack'] as const).map(field => (
                <DropZone key={field}
                  label={field === 'idCardFront' ? '人像面' : '国徽面'}
                  preview={formData[field] as string}
                  onFile={(file) => onFileDrop(field, file)}
                  onRemove={() => set({ [field]: '' } as any)}
                  dragOver={dragOver} setDragOver={setDragOver}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">劳动合同</label>
            <DropZone
              label="上传劳动合同（支持 JPG/PNG/PDF）"
              preview={formData.contractFile as string}
              onFile={(file) => onFileDrop('contractFile', file)}
              onRemove={() => set({ contractFile: '', contractFileType: '' } as any)}
              dragOver={dragOver} setDragOver={setDragOver}
              acceptPdf
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onRemove}
              className="btn btn-secondary">取消</button>
            <button type="submit"
              className="btn btn-primary">{editing ? '保存' : '创建'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default StaffFormModal
