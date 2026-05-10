import React from 'react'
import type { Member, WorkerType } from '@/types'
import { Icon } from '../../ui/Icon'
import { workerTypes, calculateAge, getWorkerTypeLabel, type WorkerFormData } from './memberFormTypes'
import { IdCardUploadArea, FileUploadArea as _FileUploadArea, SmallFileUpload as _SmallFileUpload } from './FormUploadWidgets'
const FileUploadArea = _FileUploadArea as any
const SmallFileUpload = _SmallFileUpload as any

interface WorkerFormProps {
  formData: WorkerFormData
  setFormData: React.Dispatch<React.SetStateAction<WorkerFormData>>
  projects: Array<{ id: number; name: string }>
  workerTeams: Array<{ id: number; name: string; projectId: number; projectName?: string }>
  editingMember: Member | null | undefined
  ocrLoading: boolean
  dragOverField: string | null
  onDragOver: (e: React.DragEvent, field: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>, isIdCard?: boolean) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>, isIdCard?: boolean, ref?: React.RefObject<HTMLInputElement>) => void
  onDeleteFile: (field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>) => void
  refs: {
    frontInputRef: React.RefObject<HTMLInputElement>; backInputRef: React.RefObject<HTMLInputElement>
    contractInputRef: React.RefObject<HTMLInputElement>; safetyInputRef: React.RefObject<HTMLInputElement>
    healthInputRef: React.RefObject<HTMLInputElement>; certInputRef: React.RefObject<HTMLInputElement>
  }
}

export default function WorkerForm({ formData, setFormData, projects, workerTeams, editingMember, ocrLoading, dragOverField, onDragOver, onDragLeave, onDrop, onFileChange, onDeleteFile, refs }: WorkerFormProps) {
  const availableTeams = workerTeams.filter(t => !formData.projectId || t.projectId === formData.projectId)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">姓名 *</label>
          <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
          <input type="tel" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">工种 *</label>
          <select value={formData.workerType} onChange={e => setFormData(prev => ({ ...prev, workerType: e.target.value as WorkerType }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500">
            {workerTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">所属项目*</label>
          <select value={formData.projectId || ''}
            onChange={e => { const newProjectId = e.target.value ? Number(e.target.value) : undefined; setFormData(prev => ({ ...prev, projectId: newProjectId, teamId: undefined })) }}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" required>
            <option value="">请选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">日工资*</label>
          <input type="number" value={formData.dailyWage || ''}
            onChange={e => setFormData(prev => ({ ...prev, dailyWage: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="0.00" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">所属班组*</label>
          <select value={formData.teamId || ''}
            onChange={e => setFormData(prev => ({ ...prev, teamId: e.target.value ? Number(e.target.value) : undefined }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${!formData.projectId ? 'border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-slate-300'}`}
            required disabled={!formData.projectId}>
            <option value="">{formData.projectId ? '请选择班组' : '请先选择项目'}</option>
            {availableTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {!formData.projectId && <p className="text-xs text-orange-500 mt-1">请先选择项目</p>}
          {formData.projectId && availableTeams.length === 0 && <p className="text-xs text-red-500 mt-1">该项目下暂无班组，请先添加班组</p>}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">身份证号</label>
        <input type="text" value={formData.idCard} onChange={e => setFormData(prev => ({ ...prev, idCard: e.target.value }))}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="18位身份证号" maxLength={18} />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <IdCardUploadArea label={ocrLoading ? '人像面 - 识别中..' : '人像面 - 支持拖拽/粘贴上传'} image={formData.idCardFront} field="idCardFront"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange as any} onDelete={() => onDeleteFile('idCardFront', setFormData)}
            inputRef={refs.frontInputRef} onInputChange={e => (onFileChange as any)(e, 'idCardFront', setFormData, true, refs.frontInputRef)} />
          <IdCardUploadArea label="国徽面" image={formData.idCardBack} field="idCardBack"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange as any} onDelete={() => onDeleteFile('idCardBack', setFormData)}
            inputRef={refs.backInputRef} onInputChange={e => (onFileChange as any)(e, 'idCardBack', setFormData, true, refs.backInputRef)} />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div><label className="block text-xs text-slate-600 mb-1">性别</label>
            <select value={formData.gender} onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm">
              <option value="">请选择</option><option value="male">男</option><option value="female">女</option>
            </select></div>
          <div><label className="block text-xs text-slate-600 mb-1">民族</label>
            <input type="text" value={formData.ethnicity} onChange={e => setFormData(prev => ({ ...prev, ethnicity: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" placeholder="如：汉族" /></div>
          <div><label className="block text-xs text-slate-600 mb-1">出生日期</label>
            <input type="date" value={formData.birthDate} onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" /></div>
          <div><label className="block text-xs text-slate-600 mb-1">年龄</label>
            <input type="text" value={calculateAge(formData.birthDate)}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500" disabled placeholder="自动计算" /></div>
        </div>
        <div className="mt-4">
          <label className="block text-xs text-slate-600 mb-1">身份证住址</label>
          <input type="text" value={formData.idCardAddress} onChange={e => setFormData(prev => ({ ...prev, idCardAddress: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" placeholder="身份证上的住址信息" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">劳动合同</label>
        <FileUploadArea file={formData.contractFile} fileType={formData.contractFileType} field="contractFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onFileChange={onFileChange as any} onDelete={() => onDeleteFile('contractFile', setFormData as any)}
          inputRef={refs.contractInputRef} onInputChange={e => (onFileChange as any)(e, 'contractFile', setFormData, false, refs.contractInputRef)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">进场日期</label>
          <input type="date" value={formData.entryDate} onChange={e => setFormData(prev => ({ ...prev, entryDate: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">预计退场日期</label>
          <input type="date" value={formData.expectedLeaveDate} onChange={e => setFormData(prev => ({ ...prev, expectedLeaveDate: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><label className="block text-sm font-medium text-slate-700 mb-1">工资卡号</label>
          <input type="text" value={formData.wageBankAccount} onChange={e => setFormData(prev => ({ ...prev, wageBankAccount: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">工资开户行</label>
          <input type="text" value={formData.wageBankName} onChange={e => setFormData(prev => ({ ...prev, wageBankName: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="如：XX银行XX支行" /></div>
      </div>

      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" checked={formData.threeLevelEducation}
            onChange={e => setFormData(prev => ({ ...prev, threeLevelEducation: e.target.checked }))}
            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
          <span className="ml-2 text-sm text-slate-700">已完成三级安全教育</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SmallFileUpload label="安全培训记录" file={formData.safetyTrainingFile} field="safetyTrainingFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onFileChange={onFileChange as any} onDelete={() => onDeleteFile('safetyTrainingFile', setFormData)}
          inputRef={refs.safetyInputRef} onInputChange={e => (onFileChange as any)(e, 'safetyTrainingFile', setFormData, false, refs.safetyInputRef)} />
        <SmallFileUpload label="健康报告" file={formData.healthReportFile} field="healthReportFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onFileChange={onFileChange as any} onDelete={() => onDeleteFile('healthReportFile', setFormData)}
          inputRef={refs.healthInputRef} onInputChange={e => (onFileChange as any)(e, 'healthReportFile', setFormData, false, refs.healthInputRef)} />
        <SmallFileUpload label="特种作业证" file={formData.specialCertificateFile} field="specialCertificateFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onFileChange={onFileChange as any} onDelete={() => onDeleteFile('specialCertificateFile', setFormData)}
          inputRef={refs.certInputRef} onInputChange={e => (onFileChange as any)(e, 'specialCertificateFile', setFormData, false, refs.certInputRef)} />
      </div>
    </>
  )
}
