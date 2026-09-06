import { Icon } from '@/components/ui/Icon'
import { SETTING_CATEGORIES, type SettingCategory } from '@/constants/settingsIndex'
import { useSlidePill } from '@/hooks/useSlidePill'

interface Props {
  active: SettingCategory
  onSelect: (id: SettingCategory) => void
}

/**
 * 设置左侧分类导航 (v0.83.0 → S33 Stitch 对齐)
 * 简洁行: icon + label, rounded-lg
 * 动效批 1: active/hover 高亮改为滑动胶囊（useSlidePill，220ms 滑到目标项）
 */
export function SettingsNav({ active, onSelect }: Props) {
  const pill = useSlidePill(active)

  return (
    <nav className="relative flex flex-col gap-1" ref={pill.containerRef}>
      {/* 滑动胶囊层 — hover 优先，离开回落 active */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-lg"
        style={{ ...pill.pillStyle, background: 'var(--panel-2)' }}
      />
      {SETTING_CATEGORIES.map(cat => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            ref={pill.registerItem(cat.id)}
            onClick={() => onSelect(cat.id)}
            onMouseEnter={() => pill.setHovered(cat.id)}
            onMouseLeave={() => pill.setHovered(null)}
            className={`relative z-10 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive
                ? 'text-[color:var(--fg)]'
                : 'text-[color:var(--fg-2)] hover:text-[color:var(--fg)]'
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
