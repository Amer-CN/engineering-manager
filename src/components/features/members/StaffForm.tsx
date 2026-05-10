import React from 'react'
import type { Member } from '@/types'
import { Icon } from '../../ui/Icon'
import { staffRoles, calculateAge, type StaffFormData } from './memberFormTypes'
import { IdCardUploadArea, FileUploadArea as _FileUploadArea } from './FormUploadWidgets'
const FileUploadArea = _FileUploadArea as any

interface StaffFormProps {
  formData: StaffFormData
  setFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  editingMember: Member | null | undefined
  dragOverField: string | null
  onDragOver: (e: React.DragEvent, field: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>, isIdCard?: boolean) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>, isIdCard?: boolean, ref?: React.RefObject<HTMLInputElement>) => void
  onDeleteFile: (field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>) => void
  refs: { frontInputRef: React.RefObject<HTMLInputElement>; backInputRef: React.RefObject<HTMLInputElement>; contractInputRef: React.RefObject<HTMLInputElement> }
}

export default function StaffForm({ formData, setFormData, editingMember, dragOverField, onDragOver, onDragLeave, onDrop, onFileChange, onDeleteFile, refs }: StaffFormProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">姓名 *</label>
          <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">职位 *</label>
          <select value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" required>
            <option value="">请选择职位</option>
            {staffRoles.map(role => <option key={role.value} value={role.value}>{role.icon} {role.value}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">入职时间</label>
          <input type="date" value={formData.entryDate} onChange={e => setFormData(prev => ({ ...prev, entryDate: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
          <input type="tel" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">电子邮箱</label>
          <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">身份证号</label>
        <input type="text" value={formData.idCard} onChange={e => setFormData(prev => ({ ...prev, idCard: e.target.value }))}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="18位身份证号" maxLength={18} />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <IdCardUploadArea label="人像面 - 支持拖拽/粘贴上传" image={formData.idCardFront} field="idCardFront"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange} onDelete={() => onDeleteFile('idCardFront', setFormData)}
            inputRef={refs.frontInputRef} onInputChange={e => onFileChange(e, 'idCardFront', setFormData, true, refs.frontInputRef)} />
          <IdCardUploadArea label="国徽面" image={formData.idCardBack} field="idCardBack"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange} onDelete={() => onDeleteFile('idCardBack', setFormData)}
            inputRef={refs.backInputRef} onInputChange={e => onFileChange(e, 'idCardBack', setFormData, true, refs.backInputRef)} />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">性别</label>
            <select value={formData.gender} onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="">请选择</option>
              <option value="male">男</option><option value="female">女</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">民族</label>
            <input type="text" value={formData.ethnicity} onChange={e => setFormData(prev => ({ ...prev, ethnicity: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm" placeholder="如：汉族" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">出生日期</label>
            <input type="date" value={formData.birthDate} onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">年龄</label>
            <input type="text" value={calculateAge(formData.birthDate)}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500" disabled placeholder="自动计算" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs text-slate-600 mb-1">身份证住址</label>
          <input type="text" value={formData.idCardAddress} onChange={e => setFormData(prev => ({ ...prev, idCardAddress: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm" placeholder="身份证上的住址信息" />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">劳动合同</label>
        <FileUploadArea file={formData.contractFile} fileType={formData.contractFileType} field="contractFile"
          dragOverField={dragOverField} onDragOver={onDragOver as any} onDragLeave={onDragLeave as any} onDrop={onDrop as any}
          onFileChange={onFileChange as any} onDelete={(() => onDeleteFile('contractFile', setFormData)) as any}
          inputRef={refs.contractInputRef as any} onInputChange={(e => onFileChange(e as any, 'contractFile', setFormData, false, refs.contractInputRef)) as any} />
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-slate-800 mb-3"><Icon name="DollarSign" size={16} className="inline-block mr-1" />薪酬信息（元/月）</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['基本工资', 'baseSalary'],
            ['社保（个人）', 'socialSecurityPersonal'],
            ['社保（单位）', 'socialSecurityCompany'],
            ['公积金（单位）', 'housingFund'],
            ['公积金（个人）', 'housingFundPersonal'],
            ['其他补贴', 'otherAllowances'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-slate-600 mb-1">{label}</label>
              <input type="number" value={(formData as any)[key] ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="0.00" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input type="checkbox" id="companyCoversSocial" checked={formData.companyCoversSocial ?? false}
            onChange={e => setFormData(prev => ({ ...prev, companyCoversSocial: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="companyCoversSocial" className="text-sm text-slate-600 cursor-pointer">公司承担社保公积金个人部分（不扣工资）</label>
        </div>
      </div>
    </>
  )
}
