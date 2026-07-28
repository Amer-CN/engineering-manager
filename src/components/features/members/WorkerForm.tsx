import React, { useState, useRef } from 'react'
import type { Member } from '@/types'
import { Input } from '../../ui/Input/Input'
import { Icon } from '../../ui/Icon'
import { calculateAge, inferGenderFromIdCard, type WorkerFormData } from './memberFormTypes'
import { IdCardUploadArea, FileUploadArea as _FileUploadArea, SmallFileUpload as _SmallFileUpload } from './FormUploadWidgets'
import { useBankCardOCR } from '@/hooks/useBankCardOCR'
const FileUploadArea = _FileUploadArea;
const SmallFileUpload = _SmallFileUpload;

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
  const { processBankCardFile } = useBankCardOCR()
  const [bankCardLoading, setBankCardLoading] = useState(false)
  const bankCardInputRef = useRef<HTMLInputElement>(null)

  // 身份证号变化时自动推断性别
  React.useEffect(() => {
    const gender = inferGenderFromIdCard(formData.idCard)
    if (gender && formData.gender !== gender) {
      setFormData(prev => ({ ...prev, gender }))
    }
  }, [formData.idCard])

  // 银行卡 OCR 识别
  const handleBankCardOCR = async (file: File) => {
    setBankCardLoading(true)
    try {
      const result = await processBankCardFile(file)
      if (result) {
        setFormData(prev => ({
          ...prev,
          wageBankAccount: result.cardNumber || prev.wageBankAccount,
          wageBankName: result.bankName || prev.wageBankName,
        }))
      }
    } finally {
      setBankCardLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="姓名" size="sm" required value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
        <Input label="联系电话" size="sm" type="tel" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
        <Input label="工种" size="sm" value={formData.workerType} onChange={e => setFormData(prev => ({ ...prev, workerType: e.target.value }))}
          placeholder="如：钢筋工、木工" />
        <div>
          <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">所属项目</label>
          <select value={formData.projectId || ''}
            onChange={e => { const newProjectId = e.target.value ? Number(e.target.value) : undefined; setFormData(prev => ({ ...prev, projectId: newProjectId, teamId: undefined })) }}
            className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--accent)]" required>
            <option value="">请选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Input label="日工资" size="sm" type="number" value={formData.dailyWage || ''}
          onChange={e => setFormData(prev => ({ ...prev, dailyWage: e.target.value ? Number(e.target.value) : undefined }))}
          placeholder="0.00" required />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">所属班组</label>
          <select value={formData.teamId || ''}
            onChange={e => setFormData(prev => ({ ...prev, teamId: e.target.value ? Number(e.target.value) : undefined }))}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] ${!formData.projectId ? 'border-[color:var(--border)] bg-[color:var(--panel-2)] cursor-not-allowed' : 'border-[color:var(--border)]'}`}
            required disabled={!formData.projectId}>
            <option value="">{formData.projectId ? '请选择班组' : '请先选择项目'}</option>
            {availableTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {!formData.projectId && <p className="text-xs text-warning-500 mt-1">请先选择项目</p>}
          {formData.projectId && availableTeams.length === 0 && <p className="text-xs text-danger-500 mt-1">该项目下暂无班组，请先添加班组</p>}
        </div>
      </div>

      <div className="mb-4">
        <Input label="身份证号" size="sm" value={formData.idCard} onChange={e => {
          const v = e.target.value
          const gender = inferGenderFromIdCard(v)
          setFormData(prev => ({ ...prev, idCard: v, gender: gender || prev.gender }))
        }}
          placeholder="18位身份证号" maxLength={18} />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <IdCardUploadArea label={ocrLoading ? '人像面 - 识别中..' : '人像面 - 支持拖拽/粘贴上传'} image={formData.idCardFront} field="idCardFront"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange} onDelete={() => onDeleteFile('idCardFront', setFormData)}
            inputRef={refs.frontInputRef} onInputChange={e => onFileChange(e, 'idCardFront', setFormData, true, refs.frontInputRef)} />
          <IdCardUploadArea label="国徽面" image={formData.idCardBack} field="idCardBack"
            dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onFileChange={onFileChange} onDelete={() => onDeleteFile('idCardBack', setFormData)}
            inputRef={refs.backInputRef} onInputChange={e => onFileChange(e, 'idCardBack', setFormData, true, refs.backInputRef)} />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div><label className="block text-xs text-[color:var(--fg-2)] mb-1">性别</label>
            <select value={formData.gender} onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] text-sm">
              <option value="">请选择</option><option value="male">男</option><option value="female">女</option>
            </select></div>
          <Input label="民族" size="sm" value={formData.ethnicity} onChange={e => setFormData(prev => ({ ...prev, ethnicity: e.target.value }))}
            placeholder="如：汉族" />
          <Input label="出生日期" size="sm" type="date" value={formData.birthDate} onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))} />
          <Input label="年龄" size="sm" value={calculateAge(formData.birthDate)} disabled placeholder="自动计算" />
        </div>
        <div className="mt-4">
          <Input label="身份证住址" size="sm" value={formData.idCardAddress} onChange={e => setFormData(prev => ({ ...prev, idCardAddress: e.target.value }))}
            placeholder="身份证上的住址信息" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">劳动合同</label>
        <FileUploadArea file={formData.contractFile} fileType={formData.contractFileType} field="contractFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onDelete={() => onDeleteFile('contractFile', setFormData)}
          inputRef={refs.contractInputRef} onInputChange={((e: any) => onFileChange(e, 'contractFile', setFormData, false, refs.contractInputRef))} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="进场日期" size="sm" type="date" value={formData.entryDate} onChange={e => setFormData(prev => ({ ...prev, entryDate: e.target.value }))} />
        <Input label="预计退场日期" size="sm" type="date" value={formData.expectedLeaveDate} onChange={e => setFormData(prev => ({ ...prev, expectedLeaveDate: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="银行卡号" size="sm" value={formData.wageBankAccount} onChange={e => setFormData(prev => ({ ...prev, wageBankAccount: e.target.value }))} />
        <Input label="开户行" size="sm" value={formData.wageBankName} onChange={e => setFormData(prev => ({ ...prev, wageBankName: e.target.value }))}
          placeholder="如：XX银行XX支行" />
      </div>

      {/* 银行卡 OCR 识别 */}
      <div className="mb-4">
        <input
          ref={bankCardInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) await handleBankCardOCR(file)
            if (bankCardInputRef.current) bankCardInputRef.current.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => bankCardInputRef.current?.click()}
          disabled={bankCardLoading}
          className={`w-full flex items-center justify-center gap-2 transition-all duration-300 ${
            bankCardLoading
              ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)] border-0'
              : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] rounded-lg font-medium'
          }`}
        >
          {bankCardLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span className="animate-pulse">AI 正在识别银行卡...</span>
            </>
          ) : (
            <>
              <Icon name="Sparkles" size={16} />
              AI 识别银行卡（自动填入卡号和开户行）
            </>
          )}
        </button>
      </div>

      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" checked={formData.threeLevelEducation}
            onChange={e => setFormData(prev => ({ ...prev, threeLevelEducation: e.target.checked }))}
            className="w-4 h-4 text-[color:var(--accent)] rounded focus:ring-[color:var(--accent)]" />
          <span className="ml-2 text-sm text-[color:var(--fg-2)]">已完成三级安全教育</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SmallFileUpload label="安全培训记录" file={formData.safetyTrainingFile} field="safetyTrainingFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onDelete={() => onDeleteFile('safetyTrainingFile', setFormData)}
          inputRef={refs.safetyInputRef} onInputChange={((e: any) => onFileChange(e, 'safetyTrainingFile', setFormData, false, refs.safetyInputRef))} />
        <SmallFileUpload label="健康报告" file={formData.healthReportFile} field="healthReportFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onDelete={() => onDeleteFile('healthReportFile', setFormData)}
          inputRef={refs.healthInputRef} onInputChange={((e: any) => onFileChange(e, 'healthReportFile', setFormData, false, refs.healthInputRef))} />
        <SmallFileUpload label="特种作业证" file={formData.specialCertificateFile} field="specialCertificateFile"
          dragOverField={dragOverField} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onDelete={() => onDeleteFile('specialCertificateFile', setFormData)}
          inputRef={refs.certInputRef} onInputChange={((e: any) => onFileChange(e, 'specialCertificateFile', setFormData, false, refs.certInputRef))} />
      </div>
    </>
  )
}
