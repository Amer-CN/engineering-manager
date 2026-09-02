import React from 'react'
import { Template } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'
import { Tooltip } from '../../ui/Tooltip/Tooltip'
import { Button } from '../../ui/Button'

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
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[color:var(--border)] transition-[box-shadow,border-color] duration-200">
      {/* Header: icon + type + filename */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${template.fileType === 'xlsx' ? 'bg-success-50 text-success-600' : 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'}`}>
            <Icon name={config.icon} size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[color:var(--fg)] truncate">{template.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[color:var(--muted)]">{config.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)] font-medium">
                {(template.fileType || '').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-xs text-[color:var(--muted)] mb-3 line-clamp-2">{template.description}</p>
      )}

      {/* Variables */}
      {Array.isArray(template.variables) && template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.variables.slice(0, 4).map(v => (
            <span key={v.key} className="px-1.5 py-0.5 rounded text-caption bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]">
              {v.label}
            </span>
          ))}
          {template.variables.length > 4 && (
            <span className="text-caption text-[color:var(--muted)]">+{template.variables.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-[color:var(--border)]">
        <Tooltip content="预览" position="top" delay={300}>
          <Button onClick={() => onPreview(template)}  variant="secondary" size="sm">
            <Icon name="Eye" size={14} /> 预览
          </Button>
        </Tooltip>
        <Tooltip content="生成文档" position="top" delay={300}>
          <Button onClick={() => onGenerate(template)}  variant="ghost" size="sm" className="text-[color:var(--accent)]">
            <Icon name="FileText" size={14} /> 生成
          </Button>
        </Tooltip>
        <div className="flex-1" />
        <Tooltip content="编辑" position="top" delay={300}>
          <Button onClick={() => onEdit(template)}  variant="ghost" size="sm" className="text-[color:var(--muted)]">
            <Icon name="Edit3" size={14} />
          </Button>
        </Tooltip>
        <Tooltip content="删除" position="top" delay={300}>
          <Button onClick={() => { if (confirm('确定删除此模板？')) onDelete(template.id) }}  variant="danger" size="sm">
            <Icon name="Trash2" size={14} />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
})

export default TemplateCard
