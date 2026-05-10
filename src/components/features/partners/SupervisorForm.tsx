import React, { useState, useEffect } from 'react'
import { Supervisor, Project } from '../../../types/electron'
import { supervisorCategories, getProvinces, getCities, getDistricts } from '../../../data/regions'

interface SupervisorFormProps {
  supervisor?: Supervisor | null
  projects: Project[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  name: '',
  category: 'quality' as Supervisor['category'],
  contact: '',
  phone: '',
  address: '',
  projectIds: [] as number[],
  remarks: ''
}

export const SupervisorForm: React.FC<SupervisorFormProps> = ({
  supervisor,
  projects,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState(defaultFormData)
  const [regionName, setRegionName] = useState<{ province: string; city: string; district: string }>({
    province: '',
    city: '',
    district: ''
  })

  // 初始化表单
  useEffect(() => {
    if (supervisor) {
      const regionParts = supervisor.regionName?.split(' / ') || []
      setRegionName({
        province: regionParts[0] || '',
        city: regionParts[1] || '',
        district: regionParts[2] || ''
      })
      setFormData({
        name: supervisor.name,
        category: supervisor.category,
        contact: supervisor.contact || '',
        phone: supervisor.phone || '',
        address: supervisor.address || '',
        projectIds: supervisor.projectIds || [],
        remarks: supervisor.remarks || ''
      })
    } else {
      setFormData(defaultFormData)
      setRegionName({ province: '', city: '', district: '' })
    }
  }, [supervisor])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fullRegionName = [regionName.province, regionName.city, regionName.district].filter(Boolean).join(' / ')
    onSubmit({
      ...formData,
      regionName: fullRegionName,
      projectIds: formData.projectIds
    })
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

        {/* 单位类型 */}
        <div className="form-group">
          <label className="label">单位类型 *</label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value as Supervisor['category'] })}
            className="select"
          >
            {supervisorCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* 地区选择 */}
        <div className="form-group">
          <label className="label">所在地区</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={regionName.province}
              onChange={e => {
                setRegionName(prev => ({ ...prev, province: e.target.value, city: '', district: '' }))
              }}
              className="select"
            >
              <option value="">省份</option>
              {getProvinces().map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={regionName.city}
              onChange={e => {
                setRegionName(prev => ({ ...prev, city: e.target.value, district: '' }))
              }}
              disabled={!regionName.province}
              className="select disabled:bg-slate-100"
            >
              <option value="">城市</option>
              {regionName.province && getCities(regionName.province).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={regionName.district}
              onChange={e => setRegionName(prev => ({ ...prev, district: e.target.value }))}
              disabled={!regionName.city}
              className="select disabled:bg-slate-100"
            >
              <option value="">区县</option>
              {regionName.city && getDistricts(regionName.province, regionName.city).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
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

        {/* 地址 */}
        <div className="form-group">
          <label className="label">地址</label>
          <input
            type="text"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="input"
          />
        </div>

        {/* 关联项目 */}
        <div className="form-group">
          <label className="label">关联项目</label>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
            {projects.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无项目</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <label key={project.id} className="flex items-center cursor-pointer hover:bg-white dark:bg-slate-800 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.projectIds.includes(project.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, projectIds: [...prev.projectIds, project.id] }))
                        } else {
                          setFormData(prev => ({ ...prev, projectIds: prev.projectIds.filter(id => id !== project.id) }))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">{project.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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
          {supervisor ? '保存' : '添加'}
        </button>
      </div>
    </form>
  )
}

export default SupervisorForm