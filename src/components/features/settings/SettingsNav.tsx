import { Icon } from '@/components/ui/Icon'
import { SETTING_CATEGORIES, type SettingCategory } from '@/constants/settingsIndex'

interface Props {
  active: SettingCategory
  onSelect: (id: SettingCategory) => void
}

/**
 * 设置左侧分类导航 (v0.83.0 → S33 Stitch 对齐)
 * 简洁行: icon + label, rounded-lg, active=panel-2 高亮
 */
export function SettingsNav({ active, onSelect }: Props) {
  return (
    <nav className="flex flex-col gap-1">
      {SETTING_CATEGORIES.map(cat => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-[color:var(--panel-2)] text-[color:var(--fg)]'
                : 'text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--fg)]'
            }`}
          >
            <Icon name={cat.icon} size={20} className={isActive ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted)]'} />
            <span className="text-sm font-medium truncate">{cat.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
