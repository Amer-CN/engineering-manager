import React, { useState, useEffect } from 'react'
import { Template, TemplateCategory, TemplateVariable } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'
import { FILE_CATEGORIES, uploadFile } from '../../../services/fileService'
import { useToastStore } from '@/store/toastStore'

interface TemplateFormProps {
  template?: Template | null
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  name: '',
  category: 'contract' as TemplateCategory,
  description: '',
  fileName: '',
  storedFileName: '',
  fileType: 'docx' as 'docx' | 'xlsx',
  fileData: '',
  variables: [] as TemplateVariable[],
}

export default function TemplateForm({ template, onSubmit, onCancel }: TemplateFormProps) {
  const showToast = useToastStore(state => state.showToast)
  const [formData, setFormData] = useState(defaultFormData)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        category: template.category,
        description: template.description || '',
        fileName: template.fileName,
        storedFileName: template.storedFileName,
        fileType: template.fileType,
        fileData: '',
        variables: template.variables || [],
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [template])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx' && ext !== 'xlsx') {
      showToast('仅支持 .docx 和 .xlsx 文件', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setFormData(p => ({
        ...p,
        fileName: file.name,
        fileData: dataUrl,
        fileType: ext as 'docx' | 'xlsx',
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleAddVariable = () => {
    setFormData(p => ({
      ...p,
      variables: [...p.variables, { key: '', label: '', type: 'text', defaultValue: '', required: false }],
    }))
  }

  const handleUpdateVariable = (idx: number, field: keyof TemplateVariable, value: any) => {
    setFormData(p => {
      const vars = [...p.variables]
      vars[idx] = { ...vars[idx], [field]: value }
      if (field === 'label' && !vars[idx].key) {
        vars[idx].key = String(value).replace(/[^\w一-鿿]/g, '_')
      }
      return { ...p, variables: vars }
    })
  }

  const handleRemoveVariable = (idx: number) => {
    setFormData(p => ({ ...p, variables: p.variables.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showToast('请输入模板名称', 'error'); return }
    if (!formData.fileName && !template) { showToast('请上传模板文件', 'error'); return }

    try {
      let storedFileName = formData.storedFileName

      if (formData.fileData && formData.fileData.startsWith('data:')) {
        const result = await uploadFile(
          FILE_CATEGORIES.TEMPLATE_FILE.category,
          FILE_CATEGORIES.TEMPLATE_FILE.subCategory,
          formData.fileData,
          formData.fileName,
          null,
        )
        if (!result) { showToast('文件上传失败', 'error'); return }
        storedFileName = result
      }

      onSubmit({
        ...formData,
        storedFileName: storedFileName || formData.storedFileName,
        fileData: undefined,
      })
    } catch (error: any) {
      showToast(error?.message || '保存失败', 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">模板名称 *</label>
        <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300" placeholder="如：工程施工合同模板" />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">模板分类</label>
        <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value as TemplateCategory }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
          {Object.entries(categoryConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
        <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} placeholder="模板用途说明" />
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {template ? '替换模板文件（可选）' : '上传模板文件 (.docx / .xlsx) *'}
        </label>
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {formData.fileName ? (
            <div className="flex items-center justify-center gap-2">
              <Icon name={formData.fileType === 'xlsx' ? 'FileText' : 'FileText'} size={18} className="text-primary-500" />
              <span className="text-sm text-slate-700">{formData.fileName}</span>
              <button type="button" onClick={() => setFormData(p => ({ ...p, fileName: '', fileData: '', storedFileName: '' }))}
                className="text-slate-400 hover:text-red-500 ml-2">
                <Icon name="X" size={14} />
              </button>
            </div>
          ) : (
            <div>
              <Icon name="Upload" size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">拖拽文件到此处，或
                <label className="text-primary-500 cursor-pointer hover:text-primary-600"> 点击上传
                  <input type="file" accept=".docx,.xlsx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
                </label>
              </p>
              <p className="text-xs text-slate-400 mt-1">支持 .docx（Word文档）和 .xlsx（Excel表格）</p>
            </div>
          )}
        </div>
      </div>

      {/* Variables */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">模板变量</label>
          <button type="button" onClick={handleAddVariable}
            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1">
            <Icon name="Plus" size={12} /> 添加变量
          </button>
        </div>
        {formData.variables.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">上传模板文件并保存后，系统将自动识别文件中的 {'{{变量名}}'} 占位符为变量。</p>
        ) : (
          <div className="space-y-2">
            {formData.variables.map((v, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <input type="text" value={v.label} onChange={e => handleUpdateVariable(i, 'label', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-xs" placeholder="中文标签" />
                <input type="text" value={v.key} onChange={e => handleUpdateVariable(i, 'key', e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-200 rounded text-xs font-mono" placeholder="变量名" />
                <select value={v.type} onChange={e => handleUpdateVariable(i, 'type', e.target.value)}
                  className="w-20 px-2 py-1 border border-slate-200 rounded text-xs">
                  <option value="text">文本</option>
                  <option value="number">数字</option>
                  <option value="date">日期</option>
                  <option value="select">下拉</option>
                </select>
                <input type="text" value={v.defaultValue} onChange={e => handleUpdateVariable(i, 'defaultValue', e.target.value)}
                  className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs" placeholder="默认值" />
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <input type="checkbox" checked={v.required} onChange={e => handleUpdateVariable(i, 'required', e.target.checked)} />
                  必填
                </label>
                <button type="button" onClick={() => handleRemoveVariable(i)}
                  className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0">
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-ghost text-sm">取消</button>
        <button type="submit" className="btn btn-primary text-sm">
          {template ? '保存修改' : '创建模板'}
        </button>
      </div>
    </form>
  )
}
