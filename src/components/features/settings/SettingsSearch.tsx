import { Icon } from '@/components/ui/Icon'
import { type SettingItem, getCategoryMeta } from '@/constants/settingsIndex'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  results: SettingItem[]
  onSelect: (item: SettingItem) => void
}

/**
 * 设置内搜索 (v0.83.0 头号亮点)
 * 输入关键词即时过滤 → 命中项按分类展示 → 点击跳转到对应面板并高亮 (由父级处理)
 */
export function SettingsSearch({ query, onQueryChange, results, onSelect }: Props) {
  const hasQuery = query.trim().length > 0
  return (
    <div className="mb-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] pointer-events-none"><Icon name="Search" size={16} /></span>
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="搜索设置..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
        />
        {hasQuery && (
          <button onClick={() => onQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--fg-2)]" aria-label="清空搜索">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="mt-2 space-y-1">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[color:var(--muted)]">未找到匹配的设置</div>
          ) : (
            results.map(item => {
              const cat = getCategoryMeta(item.category)
              return (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[color:var(--panel-2)] transition-colors"
                >
                  <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-[color:var(--panel-2)] text-[color:var(--muted)]">
                    <Icon name={cat.icon} size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[color:var(--fg-2)] truncate">{item.label}</span>
                    <span className="block text-micro text-[color:var(--muted)] truncate">{cat.label}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
