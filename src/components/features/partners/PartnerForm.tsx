import React, { useState, useEffect, useRef } from 'react'
import { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'
import { FileDropZone } from './FileDropZone'
import { useToastStore } from '@/store/toastStore'
import { BusinessLicenseOCRBlock } from './BusinessLicenseOCRBlock'

interface PartnerFormProps {
  partner?: Partner | null
  projects: Project[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
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
  const { processBusinessLicenseFile } = useBusinessLicenseOCR()
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
        bankName: (partner as any).bankName || '',
        creditCode: (partner as any).creditCode || '',
        registeredAddress: (partner as any).registeredAddress || '',
        businessScope: (partner as any).businessScope || '',
        taxType: (partner as any).taxType || '',
        licenseFile: (partner as any).licenseFile || '',
        licenseFileType: (partner as any).licenseFileType || '',
        otherFiles: (partner as any).otherFiles || '',
        otherFilesType: (partner as any).otherFilesType || '',
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
        {/* 单位名称 */}
        <div className="form-group">
          <label className="label">单位名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
          />
        </div>

        {/* 统一社会信用代码 */}
        <div className="form-group">
          <label className="label">统一社会信用代码</label>
          <input
            type="text"
            value={formData.creditCode}
            onChange={e => setFormData({ ...formData, creditCode: e.target.value.toUpperCase() })}
            className="input"
            placeholder="18位统一社会信用代码"
            maxLength={18}
          />
        </div>

        {/* 注册地址 */}
        <div className="form-group">
          <label className="label">注册地址</label>
          <input
            type="text"
            value={formData.registeredAddress}
            onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })}
            className="input"
            placeholder="企业注册地址"
          />
        </div>

        {/* 经营范围 */}
        <div className="form-group">
          <label className="label">经营范围</label>
          <textarea
            value={formData.businessScope}
            onChange={e => setFormData({ ...formData, businessScope: e.target.value })}
            className="input min-h-[80px]"
            placeholder="企业经营范围"
            rows={3}
          />
        </div>

        {/* 纳税资质 */}
        <div className="form-group">
          <label className="label">纳税资质</label>
          <select
            value={formData.taxType}
            onChange={e => setFormData({ ...formData, taxType: e.target.value })}
            className="select"
          >
            <option value="">请选择</option>
            <option value="general">一般纳税人</option>
            <option value="small">小规模纳税人</option>
          </select>
        </div>

        {/* 单位类型 */}
        <div className="form-group">
          <label className="label">单位类型 *</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value as Partner['category'] })}
            className="select"
          >
            {partnerCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* 关联项目 */}
        <div className="form-group">
          <label className="label">关联项目</label>
          <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
            {projects.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无项目，请先添加项目</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <label key={project.id} className="flex items-center cursor-pointer hover:bg-white p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.projectIds.includes(project.id)}
                      onChange={() => toggleProject(project.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">{project.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {formData.projectIds.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">已选择 {formData.projectIds.length} 个项目</p>
          )}
        </div>

        {/* 联系人和电话 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">联系人</label>
            <input
              type="text"
              value={formData.contact}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
              className="input"
            />
          </div>
          <div className="form-group">
            <label className="label">联系电话</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="input"
            />
          </div>
        </div>

        {/* 邮箱 */}
        <div className="form-group">
          <label className="label">电子邮箱</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="input"
          />
        </div>

        {/* 银行账号 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">银行账号</label>
          <input
            type="text"
            value={formData.bankAccount}
            onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 开户行 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">开户行</label>
          <input
            type="text"
            value={formData.bankName}
            onChange={e => setFormData({ ...formData, bankName: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="如：中国建设银行XX支行"
          />
        </div>

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

        {/* 备注 */}
        <div className="form-group">
          <label className="label">备注</label>
          <textarea
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            className="input min-h-[60px]"
            placeholder="其他备注信息"
            rows={2}
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          {partner ? '保存修改' : '添加单位'}
        </button>
      </div>
    </form>
  )
}

export default PartnerForm