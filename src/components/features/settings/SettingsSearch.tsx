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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon name="Search" size={16} /></span>
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="搜索设置..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        {hasQuery && (
          <button onClick={() => onQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="清空搜索">
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="mt-2 space-y-1">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">未找到匹配的设置</div>
          ) : (
            results.map(item => {
              const cat = getCategoryMeta(item.category)
              return (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => onSelect(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
                    <Icon name={cat.icon} size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-700 truncate">{item.label}</span>
                    <span className="block text-micro text-slate-400 truncate">{cat.label}</span>
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
