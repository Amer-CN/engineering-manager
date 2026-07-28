import { useState, useMemo } from 'react'
import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig, categoryColors } from './config'
import { Icon } from '../../ui/Icon'

interface TemplateDashboardProps {
  templates: Template[]
  stats: Record<string, number>
  onCategoryClick: (category: TemplateCategory) => void
}

export default function TemplateDashboard({ templates, stats, onCategoryClick }: TemplateDashboardProps) {
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | ''>('')

  const filtered = useMemo(() => {
    if (!filterCategory) return templates
    return templates.filter(t => t.category === filterCategory)
  }, [templates, filterCategory])

  const categories = Object.entries(categoryConfig) as [TemplateCategory, typeof categoryConfig[TemplateCategory]][]

  return (
    <div>
      {/* S28 Stitch: category pill-tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !filterCategory ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
          }`}
        >
          全部模板
        </button>
        {categories.map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === key ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]' : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* S28 Stitch: template card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(t => {
          const config = categoryConfig[t.category]
          return (
            <button
              key={t.id}
              onClick={() => onCategoryClick(t.category)}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-sm hover:shadow-lift hover:-translate-y-0.5 hover:border-[color:var(--accent)] transition-all duration-200 text-left group"
            >
              {/* Document preview placeholder */}
              <div className="h-32 bg-[color:var(--panel-2)] border-b border-[color:var(--border)] flex items-center justify-center">
                <Icon name={config?.icon || 'FileText'} size={32} className="text-[color:var(--border-strong)]" />
              </div>
              {/* Card body */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[color:var(--fg)] group-hover:text-[color:var(--accent)] transition-colors truncate">{t.name}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-caption px-1.5 py-0.5 rounded ${categoryColors[t.category] || 'bg-[color:var(--panel-2)] text-[color:var(--muted)]'}`}>
                    {config?.label || t.category}
                  </span>
                  <span className="text-caption text-[color:var(--muted)] font-mono tabular-nums">
                    <Icon name="Eye" size={12} className="inline mr-0.5" />
                    {(t as any).usageCount || 0} 次使用
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[color:var(--muted)]">
          <Icon name="FileText" size={32} className="mx-auto mb-2 text-[color:var(--border-strong)]" />
          <p className="text-sm">暂无模板</p>
        </div>
      )}
    </div>
  )
}
