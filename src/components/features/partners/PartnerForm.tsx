import React, { useState, useEffect, useRef } from 'react'
import { Partner, Project } from '../../../types/electron'
import { FileDropZone } from './FileDropZone'
import { useToastStore } from '@/store/toastStore'
import { BusinessLicenseOCRBlock } from './BusinessLicenseOCRBlock'
import { PartnerFormFields, type PartnerFormData } from './PartnerFormFields'
import { Button } from '../../ui/Button'

interface PartnerFormProps {
  partner?: Partner | null
  projects: Project[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData: PartnerFormData = {
  name: '',
  category: 'other' as Partner['category'],
  contact: '',
  phone: '',
  email: '',
  address: '',
  bankAccount: '',
  bankName: '',
  creditCode: '',
  registeredAddress: '',
  businessScope: '',
  taxType: '',
  licenseFile: '',
  licenseFileType: '',
  otherFiles: '',
  otherFilesType: '',
  projectIds: [] as number[],
  remarks: ''
}

export const PartnerForm: React.FC<PartnerFormProps> = ({
  partner,
  projects,
  onSubmit,
  onCancel
}) => {
  const showToast = useToastStore(state => state.showToast)
  const [formData, setFormData] = useState(defaultFormData)
  const [licenseDragOver, setLicenseDragOver] = useState(false)
  const [otherFilesDragOver, setOtherFilesDragOver] = useState(false)
  const licenseInputRef = useRef<HTMLInputElement>(null)
  const otherFilesInputRef = useRef<HTMLInputElement>(null)

  // 初始化 OCR 配置
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            processFile(file, (base64, fileType) => setFormData(prev => ({ ...prev, licenseFile: base64, licenseFileType: fileType })))
            return
          }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // 初始化表单
  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name,
        category: partner.category,
        contact: partner.contact || '',
        phone: partner.phone || '',
        email: partner.email || '',
        address: partner.address || '',
        bankAccount: partner.bankAccount || '',
        bankName: partner.bankName || '',
        creditCode: partner.creditCode || '',
        registeredAddress: partner.registeredAddress || '',
        businessScope: partner.businessScope || '',
        taxType: partner.taxType || '',
        licenseFile: partner.licenseFile || '',
        licenseFileType: partner.licenseFileType || '',
        otherFiles: partner.otherFiles || '',
        otherFilesType: partner.otherFilesType || '',
        projectIds: partner.projectIds || [],
        remarks: partner.remarks || ''
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [partner])

  const processFile = (file: File, onData: (base64: string, fileType: string) => void) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) { showToast('仅支持 JPG/PNG/WebP/PDF 格式', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (e) => onData(e.target?.result as string, file.type === 'application/pdf' ? 'pdf' : 'image')
    reader.readAsDataURL(file)
  }
  const toggleProject = (projectId: number) => {
    setFormData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <PartnerFormFields formData={formData} setFormData={setFormData} projects={projects} toggleProject={toggleProject} />

        {/* 营业执照上传 */}
        <FileDropZone
          label="营业执照"
          iconName="Building2"
          file={formData.licenseFile}
          fileType={formData.licenseFileType}
          fileLabel="营业执照已上传"
          dragOver={licenseDragOver}
          inputRef={licenseInputRef}
          iconBgClass="bg-blue-100"
          onFileSelect={file => processFile(file, (base64, fileType) => setFormData(prev => ({ ...prev, licenseFile: base64, licenseFileType: fileType })))}
          onRemove={() => setFormData(prev => ({ ...prev, licenseFile: '', licenseFileType: '' }))}
          onDragOver={(e) => { e.preventDefault(); setLicenseDragOver(true) }}
          onDragLeave={() => setLicenseDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setLicenseDragOver(false); const files = e.dataTransfer.files; if (files.length > 0) processFile(files[0], (base64, fileType) => setFormData(prev => ({ ...prev, licenseFile: base64, licenseFileType: fileType }))) }}
          onClickUpload={() => licenseInputRef.current?.click()}
        />

        { /* BusinessLicenseOCR (v1.1.0 extracted) */ }
        <BusinessLicenseOCRBlock
          licenseFile={formData.licenseFile}
          licenseFileType={formData.licenseFileType}
          onResult={fields => setFormData(prev => ({
            ...prev,
            name: fields.name || prev.name,
            creditCode: fields.creditCode || prev.creditCode,
            registeredAddress: fields.registeredAddress || prev.registeredAddress,
            businessScope: fields.businessScope || prev.businessScope
          }))}
        />

        {/* 其他附件上传 */}
        <FileDropZone
          label="其他公司信息附件"
          iconName="Paperclip"
          file={formData.otherFiles}
          fileType={formData.otherFilesType}
          fileLabel="附件已上传"
          dragOver={otherFilesDragOver}
          inputRef={otherFilesInputRef}
          iconBgClass="bg-purple-100"
          multiple
          onAddMore={() => otherFilesInputRef.current?.click()}
          onFileSelect={file => processFile(file, (base64, fileType) => setFormData(prev => ({ ...prev, otherFiles: prev.otherFiles ? `${prev.otherFiles}|||${base64}` : base64, otherFilesType: prev.otherFilesType ? `${prev.otherFilesType}|||${fileType}` : fileType })))}
          onRemove={() => setFormData(prev => ({ ...prev, otherFiles: '', otherFilesType: '' }))}
          onDragOver={(e) => { e.preventDefault(); setOtherFilesDragOver(true) }}
          onDragLeave={() => setOtherFilesDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setOtherFilesDragOver(false); const files = e.dataTransfer.files; for (let i = 0; i < files.length; i++) { processFile(files[i], (base64, fileType) => setFormData(prev => ({ ...prev, otherFiles: prev.otherFiles ? `${prev.otherFiles}|||${base64}` : base64, otherFilesType: prev.otherFilesType ? `${prev.otherFilesType}|||${fileType}` : fileType }))) } }}
          onClickUpload={() => otherFilesInputRef.current?.click()}
        />
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <Button type="button" onClick={onCancel}  variant="secondary">
          取消
        </Button>
        <Button type="submit"  variant="primary">
          {partner ? '保存修改' : '添加单位'}
        </Button>
      </div>
    </form>
  )
}

export default PartnerForm