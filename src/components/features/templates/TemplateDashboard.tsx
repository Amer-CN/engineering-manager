import React, { useMemo } from 'react'
import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig, categoryColors } from './config'
import { Icon } from '../../ui/Icon'

interface TemplateDashboardProps {
  templates: Template[]
  stats: Record<string, number>
  onCategoryClick: (category: TemplateCategory) => void
}

export default function TemplateDashboard({ templates, stats, onCategoryClick }: TemplateDashboardProps) {
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of templates) {
      map[t.category] = (map[t.category] || 0) + 1
    }
    return map
  }, [templates])

  return (
    <div>
      {/* Global stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">模板总数</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total || templates.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">Word 模板</p>
          <p className="text-2xl font-bold text-blue-600">{templates.filter(t => t.fileType === 'docx').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">Excel 模板</p>
          <p className="text-2xl font-bold text-emerald-600">{templates.filter(t => t.fileType === 'xlsx').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">模板分类</p>
          <p className="text-2xl font-bold text-slate-800">{Object.keys(categoryStats).length}</p>
        </div>
      </div>

      {/* Category cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">模板分类</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(Object.entries(categoryConfig) as [TemplateCategory, typeof categoryConfig[TemplateCategory]][]).map(([key, config]) => {
            const count = categoryStats[key] || 0
            return (
              <button
                key={key}
                onClick={() => onCategoryClick(key)}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryColors[key].split(' ').slice(0, 2).join(' ')}`}>
                    <Icon name={config.icon} size={24} />
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-2" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">{config.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{config.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                  <span className="text-xs text-slate-400">{count} 个模板</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.fileType === 'both' ? 'bg-slate-100 text-slate-500' : config.fileType === 'xlsx' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {config.fileType === 'both' ? 'Word/Excel' : config.fileType.toUpperCase()}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
