import React, { useState, useEffect } from 'react'
import { Material, Project } from '../../../types/electron'

interface MaterialFormProps {
  material?: Material | null
  projects: Project[]
  materialCategories: string[]
  categoryIcons: Record<string, string>
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  projectId: '' as number | '',
  name: '',
  category: '',
  unit: '',
  quantity: 0,
  price: 0
}

export const MaterialForm: React.FC<MaterialFormProps> = ({
  material,
  projects,
  materialCategories,
  categoryIcons,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    if (material) {
      setFormData({
        projectId: material.projectId || '',
        name: material.name,
        category: material.category || '',
        unit: material.unit || '',
        quantity: material.quantity || 0,
        price: material.price || 0
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [material])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      projectId: formData.projectId || 0
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <div>
          <label className="label">材料名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="如: 钢筋"
            required
          />
        </div>
        <div>
          <label className="label">所属项目 *</label>
          <select
            value={formData.projectId}
            onChange={e => setFormData({ ...formData, projectId: Number(e.target.value) || '' })}
            className="input"
            required
          >
            <option value="">请选择项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">类别</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="input"
            >
              <option value="">请选择</option>
              {materialCategories.map(cat => (
                <option key={cat} value={cat}>{categoryIcons[cat]} {cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">单位</label>
            <input
              type="text"
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
              placeholder="如: 吨、立方米"
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">数量</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="input"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="label">单价 (元)</label>
            <input
              type="number"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
              className="input"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between text-lg">
            <span className="text-slate-600">预估总价值:</span>
            <span className="font-bold text-primary-600">
              ¥{Math.round(formData.quantity * formData.price * 100) / 100}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
        <button type="submit" className="btn btn-primary">{material ? '保存' : '添加'}</button>
      </div>
    </form>
  )
}

export default MaterialForm