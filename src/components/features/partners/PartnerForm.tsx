import React, { useState, useEffect, useRef } from 'react'
import { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'
import { inferTaxTypeFromCreditCode, getTaxTypeLabel } from '../../../services/companyQuery'
import { useCompanyQuery } from './useCompanyQuery'
import { FileDropZone } from './FileDropZone'
import { useToastStore } from '@/store/toastStore'
import { useBusinessLicenseOCR } from '@/hooks/useBusinessLicenseOCR'
import { Icon } from '../../ui/Icon'

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
  const [businessLicenseLoading, setBusinessLicenseLoading] = useState(false)
  const { queryLoading, handleQueryCreditCode } = useCompanyQuery(formData.creditCode, setFormData)
  const licenseInputRef = useRef<HTMLInputElement>(null)
  const otherFilesInputRef = useRef<HTMLInputElement>(null)

  // 粘贴上传支持
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
    if (!allowedTypes.includes(file.type)) { showToast('只能上传 JPG、PNG、WebP 或 PDF 格式的文件', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (e) => onData(e.target?.result as string, file.type === 'application/pdf' ? 'pdf' : 'image')
    reader.readAsDataURL(file)
  }

  // 营业执照 OCR 识别
  const handleBusinessLicenseOCR = async () => {
    if (!formData.licenseFile) {
      showToast('请先上传营业执照图片', 'error')
      return
    }

    setBusinessLicenseLoading(true)
    try {
      // 将 base64 转为 File 对象
      const response = await fetch(formData.licenseFile)
      const blob = await response.blob()
      const file = new File([blob], 'license.jpg', { type: 'image/jpeg' })

      const result = await processBusinessLicenseFile(file)
      if (result) {
        setFormData(prev => ({
          ...prev,
          name: result.companyName || prev.name,
          creditCode: result.creditCode || prev.creditCode,
          address: result.address || prev.address,
          businessScope: result.businessScope || prev.businessScope,
        }))

        // 自动识别纳税资质
        if (result.creditCode && result.creditCode.length === 18) {
          const inferredTaxType = inferTaxTypeFromCreditCode(result.creditCode)
          if (inferredTaxType) {
            setFormData(prev => ({ ...prev, taxType: inferredTaxType }))
          }
        }
      }
    } finally {
      setBusinessLicenseLoading(false)
    }
  }

  // handleQueryCreditCode extracted to ./useCompanyQuery hook

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
          <label className="label">统一社会信用代码 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.creditCode}
              onChange={e => {
                const code = e.target.value.toUpperCase()
                setFormData(prev => {
                  const newData = { ...prev, creditCode: code }
                  if (code.length === 18) {
                    const inferredTaxType = inferTaxTypeFromCreditCode(code)
                    if (inferredTaxType) {
                      newData.taxType = inferredTaxType
                    }
                  }
                  return newData
                })
              }}
              className="input flex-1"
              placeholder="18位统一社会信用代码"
              maxLength={18}
              required
            />
            <button
              type="button"
              onClick={handleQueryCreditCode}
              disabled={queryLoading}
              className="btn btn-secondary"
            >
              {queryLoading ? '查询中...' : '联网填充'}
            </button>
          </div>
          {formData.taxType && (
            <p className="text-xs text-green-600 mt-1">
              已自动识别纳税资质：{getTaxTypeLabel(formData.taxType)}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">输入18位代码后自动识别纳税资质</p>
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
          <p className="text-xs text-slate-400 mt-1">输入统一社会信用代码后自动识别</p>
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
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
            {projects.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无项目，请先添加项目</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <label key={project.id} className="flex items-center cursor-pointer hover:bg-white dark:bg-slate-800 p-1 rounded transition-colors">
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">已选择 {formData.projectIds.length} 个项目</p>
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">银行账号</label>
          <input
            type="text"
            value={formData.bankAccount}
            onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 开户行 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">开户行</label>
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

        {/* 营业执照 OCR 识别按钮 */}
        {formData.licenseFile && formData.licenseFileType === 'image' && (
          <button
            type="button"
            onClick={handleBusinessLicenseOCR}
            disabled={businessLicenseLoading}
            className={`btn w-full flex items-center justify-center gap-2 transition-all duration-300 ${
              businessLicenseLoading
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0'
                : 'btn-primary'
            }`}
          >
            {businessLicenseLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span className="animate-pulse">AI 正在识别营业执照...</span>
              </>
            ) : (
              <>
                <Icon name="Sparkles" size={16} />
                AI 识别营业执照（自动填入公司信息）
              </>
            )}
          </button>
        )}

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
          onDrop={(e) => { e.preventDefault(); setOtherFilesDragOver(false); const files = e.dataTransfer.files; if (files.length > 0) processFile(files[0], (base64, fileType) => setFormData(prev => ({ ...prev, otherFiles: prev.otherFiles ? `${prev.otherFiles}|||${base64}` : base64, otherFilesType: prev.otherFilesType ? `${prev.otherFilesType}|||${fileType}` : fileType }))) }}
          onClickUpload={() => otherFilesInputRef.current?.click()}
        />

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          {partner ? '保存' : '添加'}
        </button>
      </div>
    </form>
  )
}

export default PartnerForm