import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig } from './config'
import { Icon } from '../../ui/Icon'

interface TemplateDashboardProps {
  templates: Template[]
  stats: Record<string, number>
  onCategoryClick: (category: TemplateCategory) => void
}

// 看板 = 分类卡片墙：每个分类一张卡（含空分类，数量显示 0），点击一律进该分类列表页
export default function TemplateDashboard({ templates, onCategoryClick }: TemplateDashboardProps) {
  const categories = Object.entries(categoryConfig) as [TemplateCategory, typeof categoryConfig[TemplateCategory]][]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {categories.map(([key, config]) => {
        const count = templates.filter(t => t.category === key).length
        return (
          <button
            key={key}
            onClick={() => onCategoryClick(key)}
            className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-5 text-left shadow-sm hover:shadow-lift hover:-translate-y-0.5 hover:border-[color:var(--accent)] transition-[transform,opacity,box-shadow,background-color,border-color] duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center">
                <Icon name={config.icon} size={20} className="text-[color:var(--fg-2)] group-hover:text-[color:var(--accent)] transition-colors" />
              </div>
              <span className="text-caption text-[color:var(--muted)] font-mono tabular-nums">{count} 个模板</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[color:var(--fg)] group-hover:text-[color:var(--accent)] transition-colors truncate">{config.label}</h3>
          </button>
        )
      })}
    </div>
  )
}
