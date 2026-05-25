import React from 'react'
import { Template } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'

interface TemplateCardProps {
  template: Template
  onEdit: (t: Template) => void
  onDelete: (id: number) => void
  onPreview: (t: Template) => void
  onGenerate: (t: Template) => void
}

export const TemplateCard = React.memo(function TemplateCard({ template, onEdit, onDelete, onPreview, onGenerate }: TemplateCardProps) {
  const config = categoryConfig[template.category]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      {/* Header: icon + type + filename */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${template.fileType === 'xlsx' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            <Icon name={config.icon} size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{template.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{config.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                {template.fileType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{template.description}</p>
      )}

      {/* Variables */}
      {template.variables && template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.variables.slice(0, 4).map(v => (
            <span key={v.key} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
              {v.label}
            </span>
          ))}
          {template.variables.length > 4 && (
            <span className="text-[10px] text-slate-400">+{template.variables.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
        <button onClick={() => onPreview(template)} className="btn btn-secondary btn-sm" title="预览">
          <Icon name="Eye" size={14} /> 预览
        </button>
        <button onClick={() => onGenerate(template)} className="btn btn-ghost btn-sm text-primary-600" title="生成文档">
          <Icon name="FileText" size={14} /> 生成
        </button>
        <div className="flex-1" />
        <button onClick={() => onEdit(template)} className="btn btn-ghost btn-sm text-slate-500" title="编辑">
          <Icon name="Edit3" size={14} />
        </button>
        <button onClick={() => { if (confirm('确定删除此模板？')) onDelete(template.id) }} className="btn btn-danger btn-sm" title="删除">
          <Icon name="Trash2" size={14} />
        </button>
      </div>
    </div>
  )
})

export default TemplateCard
