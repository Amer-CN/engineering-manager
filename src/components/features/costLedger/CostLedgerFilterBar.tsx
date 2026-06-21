import { DIRECTION_CONFIG, getCategoriesByDirection, getLevel1GroupsMerged, getCategoryColor } from '@/components/features/costLedger/config'
import { printCostLedgerList, exportCostLedgerList } from '@/components/features/costLedger/printExport'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerFilterBarProps {
  filter: 'all' | 'expense' | 'income'
  setFilter: (f: 'all' | 'expense' | 'income') => void
  categoryLevel: 'level1' | 'level2'
  setCategoryLevel: (l: 'level1' | 'level2') => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  categories?: CostLedgerCategory[] | null
  activeFilters: number
  clearAll: () => void
  entries: CostLedgerEntry[]
  filtered: CostLedgerEntry[]
  filterSummary: { totalExpense: number; totalIncome: number; count: number }
  zoomRef: React.MutableRefObject<number>
  tableRef: React.RefObject<HTMLDivElement>
  zoom: number
  setZoom: (z: number) => void
}

export function CostLedgerFilterBar({
  filter, setFilter, categoryLevel, setCategoryLevel,
  categoryFilter, setCategoryFilter, categories,
  activeFilters, clearAll, entries, filtered, filterSummary,
  zoomRef, tableRef, zoom, setZoom,
}: CostLedgerFilterBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
        {(['all', 'expense', 'income'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'all' ? '全部' : DIRECTION_CONFIG[f].label}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {(['level1', 'level2'] as const).map(level => (
          <button key={level} onClick={() => setCategoryLevel(level)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              categoryLevel === level ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {level === 'level1' ? '一级' : '二级'}
          </button>
        ))}
      </div>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 max-w-[160px]">
        <option value="all">全部分类</option>
        {categoryLevel === 'level1' ? (
          (['expense', 'income'] as const).map(dir => {
            if ((dir === 'expense' && filter === 'income') || (dir === 'income' && filter === 'expense')) return null
            const groups = getLevel1GroupsMerged(categories, dir)
            return groups.map(group => (
              <option key={`${dir}-${group.name}`} value={`level1:${group.name}`} style={{ color: group.color, fontWeight: 500 }}>
                {dir === 'expense' ? '支出' : '收入'} · {group.name}
              </option>
            ))
          })
        ) : (
          (['expense', 'income'] as const).map(dir => {
            if ((dir === 'expense' && filter === 'income') || (dir === 'income' && filter === 'expense')) return null
            const groups = getLevel1GroupsMerged(categories, dir)
            const dirCatsAll = categories && categories.length > 0
              ? categories.filter(c => c.direction === dir && c.isEnabled !== false)
              : getCategoriesByDirection(dir)
            const dirCats = Array.from(new Map(dirCatsAll.map(c => [c.code, c])).values())
            return groups.map(group => {
              const subs = dirCats.filter(c => group.codes.includes(c.code))
              const uniqueSubs = Array.from(new Map(subs.map(c => [c.code, c])).values())
              if (uniqueSubs.length === 0) return null
              return (
                <optgroup key={`${dir}-${group.name}`} label={`${dir === 'expense' ? '支出' : '收入'} · ${group.name}`}>
                  {uniqueSubs.map(c => (
                    <option key={`${dir}-${c.code}`} value={c.code} style={{ color: c.color || getCategoryColor(c.code, categories) }}>{c.label}</option>
                  ))}
                </optgroup>
              )
            })
          })
        )}
      </select>
      {activeFilters > 0 && (
        <button onClick={clearAll} className="text-xs text-blue-600 hover:text-blue-800">清除 {activeFilters} 个筛选</button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => printCostLedgerList(filtered, categories, categoryLevel, { expense: filterSummary.totalExpense, income: filterSummary.totalIncome, count: filterSummary.count })}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          打印
        </button>
        <button
          onClick={() => exportCostLedgerList(filtered, categories, categoryLevel)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          导出Excel
        </button>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <button onClick={() => {
            const n = Math.max(0.5, +(zoomRef.current - 0.1).toFixed(1))
            zoomRef.current = n; localStorage.setItem('costLedgerZoom', String(n)); setZoom(n)
            if (tableRef.current) tableRef.current.style.zoom = String(n)
          }} className="btn btn-secondary btn-sm">−</button>
          <span className="text-xs text-slate-500 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={() => {
            const n = Math.min(2, +(zoomRef.current + 0.1).toFixed(1))
            zoomRef.current = n; localStorage.setItem('costLedgerZoom', String(n)); setZoom(n)
            if (tableRef.current) tableRef.current.style.zoom = String(n)
          }} className="btn btn-secondary btn-sm">+</button>
        </div>
        <span className="text-xs text-slate-400">
          {filtered.length === entries.length ? `共 ${entries.length} 条` : `筛选 ${filtered.length} / ${entries.length} 条`}
        </span>
      </div>
    </div>
  )
}
