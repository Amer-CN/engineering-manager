import { Icon } from '@/components/ui/Icon'
import { SETTING_CATEGORIES, type SettingCategory } from '@/constants/settingsIndex'

interface Props {
  active: SettingCategory
  onSelect: (id: SettingCategory) => void
}

/**
 * 设置左侧分类导航 (v0.83.0)
 * 药丸式按钮 + 激活项左侧竖条指示 + 图标/描述, 呼应主侧边栏设计语言
 */
export function SettingsNav({ active, onSelect }: Props) {
  return (
    <nav className="space-y-1">
      {SETTING_CATEGORIES.map(cat => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary-500" />}
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'}`}>
              <Icon name={cat.icon} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{cat.label}</span>
              <span className="block text-micro text-slate-400 truncate">{cat.description}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
