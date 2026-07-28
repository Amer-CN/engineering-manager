import React from 'react'
import type { Partner, Project } from '../../../types/electron'
import { partnerCategories } from '../../../data/regions'

export interface PartnerFormData {
  name: string
  category: Partner['category']
  contact: string
  phone: string
  email: string
  address: string
  bankAccount: string
  bankName: string
  creditCode: string
  registeredAddress: string
  businessScope: string
  taxType: string
  licenseFile: string
  licenseFileType: string
  otherFiles: string
  otherFilesType: string
  projectIds: number[]
  remarks: string
}

interface PartnerFormFieldsProps {
  formData: PartnerFormData
  setFormData: React.Dispatch<React.SetStateAction<PartnerFormData>>
  projects: Project[]
  toggleProject: (projectId: number) => void
}

export const PartnerFormFields: React.FC<PartnerFormFieldsProps> = ({
  formData,
  setFormData,
  projects,
  toggleProject
}) => {
  return (
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
        <div className="border border-[color:var(--border)] rounded-lg p-3 max-h-40 overflow-y-auto bg-[color:var(--panel-2)]">
          {projects.length === 0 ? (
            <p className="text-[color:var(--muted)] text-sm">暂无项目，请先添加项目</p>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <label key={project.id} className="flex items-center cursor-pointer hover:bg-[color:var(--card)] p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.projectIds.includes(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="w-4 h-4 text-[color:var(--accent)] rounded focus:ring-[color:var(--accent-soft)]"
                  />
                  <span className="ml-2 text-sm text-[color:var(--fg-2)]">{project.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {formData.projectIds.length > 0 && (
          <p className="text-xs text-[color:var(--muted)] mt-1">已选择 {formData.projectIds.length} 个项目</p>
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
        <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">银行账号</label>
        <input
          type="text"
          value={formData.bankAccount}
          onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
          className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]"
        />
      </div>

      {/* 开户行 */}
      <div>
        <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">开户行</label>
        <input
          type="text"
          value={formData.bankName}
          onChange={e => setFormData({ ...formData, bankName: e.target.value })}
          className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]"
          placeholder="如：中国建设银行XX支行"
        />
      </div>

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
  )
}
