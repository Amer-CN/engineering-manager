/**
 * ProjectForm - 玻璃态模态框表单
 */
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Project, Member } from '@/types'
import { Icon } from '../../ui/Icon'

const statusOptions = [
  { value: 'planning', label: '筹备中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
]

const glassInput = 'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white/90 placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200'

export interface ProjectFormData {
  name: string; description: string; address: string
  startDate: string; endDate: string; status: Project['status']
  budget: number; projectManagerId: number | null
}

export interface ProjectFormProps {
  project?: Project | null
  members: Member[]
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ project, members, onSubmit, onCancel }: ProjectFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '', description: '', address: '',
    startDate: '', endDate: '', status: 'planning',
    budget: 0, projectManagerId: null,
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name, description: project.description || '',
        address: project.address || '', startDate: project.startDate || '',
        endDate: project.endDate || '', status: project.status,
        budget: project.budget || 0, projectManagerId: project.projectManagerId || null,
      })
    } else {
      setFormData({ name: '', description: '', address: '', startDate: '', endDate: '', status: 'planning', budget: 0, projectManagerId: null })
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.projectManagerId) { alert('请选择项目负责人'); return }
    setLoading(true)
    try { await onSubmit(formData) } finally { setLoading(false) }
  }

  const handleChange = (field: keyof ProjectFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const staffMembers = members.filter(m => m.memberType === 'staff')

  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <motion.div className="bg-white dark:bg-slate-900 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-primary-600 to-primary-500 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-white">{project ? '编辑项目' : '新建项目'}</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)}
                className={glassInput} required placeholder="请输入项目名称" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">
                项目负责人 <span className="text-red-500">*</span>
              </label>
              <select value={formData.projectManagerId || ''}
                onChange={e => handleChange('projectManagerId', e.target.value ? Number(e.target.value) : null)}
                className={glassInput} required>
                <option value="">请选择项目负责人</option>
                {staffMembers.map(m => <option key={m.id} value={m.id}>{m.name} - {m.role}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">项目描述</label>
              <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)}
                className={glassInput} rows={3} placeholder="请输入项目描述" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">项目地址</label>
              <input type="text" value={formData.address} onChange={e => handleChange('address', e.target.value)}
                className={glassInput} placeholder="请输入项目地址" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">开工日期</label>
                <input type="date" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} className={glassInput} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">竣工日期</label>
                <input type="date" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} className={glassInput} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">项目状态</label>
                <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className={glassInput}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">合同价 (元)</label>
                <input type="number" value={formData.budget} onChange={e => handleChange('budget', Number(e.target.value))}
                  className={glassInput} min="0" step="0.01" placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : project ? <><Icon name="Save" size={14} /> 保存</> : <><Icon name="Plus" size={14} /> 创建</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
