import React, { useState, useEffect, useRef } from 'react'
import { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'
import { validateCreditCode, isOnline, queryCompanyByCreditCode, inferTaxTypeFromCreditCode, getTaxTypeLabel } from '../../../services/companyQuery'
import { Icon } from '../../ui/Icon'
import { useCompanyQuery } from './useCompanyQuery'

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
  const [formData, setFormData] = useState(defaultFormData)
  const [licenseDragOver, setLicenseDragOver] = useState(false)
  const [otherFilesDragOver, setOtherFilesDragOver] = useState(false)
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
            processLicenseFile(file)
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

  // 处理营业执照上传
  const processLicenseFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('只能上传 JPG、PNG、WebP 或 PDF 格式的文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      setFormData(prev => ({ ...prev, licenseFile: base64, licenseFileType: fileType }))
    }
    reader.readAsDataURL(file)
  }

  // 处理其他附件上传
  const processOtherFiles = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('只能上传 JPG、PNG、WebP 或 PDF 格式的文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      setFormData(prev => ({
        ...prev,
        otherFiles: prev.otherFiles ? `${prev.otherFiles}|||${base64}` : base64,
        otherFilesType: prev.otherFilesType ? `${prev.otherFilesType}|||${fileType}` : fileType
      }))
    }
    reader.readAsDataURL(file)
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
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">营业执照</label>
          <input
            ref={licenseInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) processLicenseFile(file)
              e.target.value = ''
            }}
            className="hidden"
          />
          {formData.licenseFile ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">
                    {formData.licenseFileType === 'pdf' ? <Icon name="FileText" size={20} /> : <Icon name="Building2" size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">营业执照已上传</p>
                    <p className="text-xs text-slate-400">
                      {formData.licenseFileType === 'pdf' ? 'PDF文件' : '图片文件'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, licenseFile: '', licenseFileType: '' }))}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                licenseDragOver
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }`}
              onClick={() => licenseInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setLicenseDragOver(true) }}
              onDragLeave={() => setLicenseDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setLicenseDragOver(false)
                const files = e.dataTransfer.files
                if (files.length > 0) processLicenseFile(files[0])
              }}
            >
              <div className="text-slate-400">
                <div className="text-3xl mb-2"><Icon name="Building2" size={32} /></div>
                <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
                <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* 其他附件上传 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">其他公司信息附件</label>
          <input
            ref={otherFilesInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) processOtherFiles(file)
              e.target.value = ''
            }}
            className="hidden"
          />
          {formData.otherFiles ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">
                    📎
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">附件已上传</p>
                    <p className="text-xs text-slate-400">可上传多个附件</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => otherFilesInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    继续添加
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, otherFiles: '', otherFilesType: '' }))}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                otherFilesDragOver
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }`}
              onClick={() => otherFilesInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOtherFilesDragOver(true) }}
              onDragLeave={() => setOtherFilesDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setOtherFilesDragOver(false)
                const files = e.dataTransfer.files
                if (files.length > 0) processOtherFiles(files[0])
              }}
            >
              <div className="text-slate-400">
                <div className="text-3xl mb-2"><Icon name="Paperclip" size={32} /></div>
                <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
                <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB（非必填）</p>
              </div>
            </div>
          )}
        </div>

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