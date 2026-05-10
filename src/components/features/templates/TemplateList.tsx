import React, { useState } from 'react'
import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig } from './config'
import { TemplateCard } from './TemplateCard'
import { Icon } from '../../ui/Icon'

interface TemplateListProps {
  category: TemplateCategory
  templates: Template[]
  onBack: () => void
  onEdit: (t: Template) => void
  onDelete: (id: number) => void
  onPreview: (t: Template) => void
  onGenerate: (t: Template) => void
  onCreate: () => void
}

export default function TemplateList({
  category, templates, onBack, onEdit, onDelete, onPreview, onGenerate, onCreate,
}: TemplateListProps) {
  const config = categoryConfig[category]
  const docxCount = templates.filter(t => t.fileType === 'docx').length
  const xlsxCount = templates.filter(t => t.fileType === 'xlsx').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.fileType === 'xlsx' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
          <Icon name={config.icon} size={22} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{config.label}</h1>
          <p className="text-sm text-slate-500">{config.description}</p>
        </div>
        <button onClick={onCreate} className="btn btn-primary">
          <Icon name="Plus" size={16} /> 新建模板
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-slate-400">模板总数</p>
          <p className="text-lg font-bold text-slate-800">{templates.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-slate-400">Word 文档</p>
          <p className="text-lg font-bold text-blue-600">{docxCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-slate-400">Excel 表格</p>
          <p className="text-lg font-bold text-emerald-600">{xlsxCount}</p>
        </div>
      </div>

      {/* Template cards */}
      {templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Icon name="FileText" size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-lg">此分类暂无模板</p>
          <p className="text-sm mt-1">点击「新建模板」上传 .docx 或 .xlsx 文件</p>
          <button onClick={onCreate} className="btn btn-primary mt-4 text-sm">创建第一个模板</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id}
              template={t}
              onEdit={onEdit}
              onDelete={onDelete}
              onPreview={onPreview}
              onGenerate={onGenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
