import { DIRECTION_CONFIG, getLevel1GroupsMerged, getCategoriesByDirection, getCategoryColor } from '@/components/features/costLedger/config'
import { printCostLedgerList, exportCostLedgerList } from '@/components/features/costLedger/printExport'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'
import { Button } from '../../ui/Button'

interface CostLedgerListToolbarProps {
  filter: 'all' | 'expense' | 'income'
  categoryFilter: string
  categoryLevel: 'level1' | 'level2'
  setFilter: (f: 'all' | 'expense' | 'income') => void
  setCategoryFilter: (v: string) => void
  setCategoryLevelAndReset: (level: 'level1' | 'level2') => void
  clearAll: () => void
  activeFilters: number
  categories: CostLedgerCategory[] | null | undefined
  filtered: CostLedgerEntry[]
  entries: CostLedgerEntry[]
  filterSummary: { totalExpense: number; totalIncome: number; count: number }
  zoomRef: React.MutableRefObject<number>
  tableRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  setZoom: (z: number) => void
  /** Beta 模式下隐藏打印/导出按钮（未接线能力降级） */
  betaMode?: boolean
}

export function CostLedgerListToolbar({
  filter, categoryFilter, categoryLevel,
  setFilter, setCategoryFilter, setCategoryLevelAndReset,
  clearAll, activeFilters, categories,
  filtered, entries, filterSummary,
  zoomRef, tableRef, zoom, setZoom, betaMode,
}: CostLedgerListToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b px-6 py-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--panel-2)' }}>
        {(['all', 'expense', 'income'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            style={filter === f ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}
          >
            {f === 'all' ? '全部' : DIRECTION_CONFIG[f].label}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--panel-2)' }}>
        {(['level1', 'level2'] as const).map(level => (
          <button key={level} onClick={() => setCategoryLevelAndReset(level)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={categoryLevel === level ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}
          >
            {level === 'level1' ? '一级' : '二级'}
          </button>
        ))}
      </div>
      <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
        className="rounded-lg border px-2 py-1 text-xs max-w-[160px] bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--fg-2)]">
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
        <button onClick={clearAll} className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent)]">清除 {activeFilters} 个筛选</button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {betaMode ? (
          <span className="text-xs text-[color:var(--muted)]" title="新表格 Beta 暂不支持打印/导出，请切回经典表格使用">Beta 模式不支持打印/导出</span>
        ) : (<>
        <button
          onClick={() => printCostLedgerList(filtered, categories, categoryLevel, { expense: filterSummary.totalExpense, income: filterSummary.totalIncome, count: filterSummary.count })}
          className="rounded-lg border border-[color:var(--border)] px-2.5 py-1 text-xs text-[color:var(--muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] transition-colors"
        >
          打印
        </button>
        <button
          onClick={() => exportCostLedgerList(filtered, categories, categoryLevel)}
          className="rounded-lg border border-[color:var(--border)] px-2.5 py-1 text-xs text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-colors"
        >
          导出Excel
        </button>
        </>)}
        <div className="flex items-center gap-1 border-l border-[color:var(--border)] pl-3">
          <Button onClick={() => {
            const n = Math.max(0.5, +(zoomRef.current - 0.1).toFixed(1))
            zoomRef.current = n; localStorage.setItem('costLedgerZoom', String(n)); setZoom(n)
            if (tableRef.current) tableRef.current.style.zoom = String(n)
          }}  variant="secondary" size="sm">−</Button>
          <span className="text-xs text-[color:var(--muted)] w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <Button onClick={() => {
            const n = Math.min(2, +(zoomRef.current + 0.1).toFixed(1))
            zoomRef.current = n; localStorage.setItem('costLedgerZoom', String(n)); setZoom(n)
            if (tableRef.current) tableRef.current.style.zoom = String(n)
          }}  variant="secondary" size="sm">+</Button>
        </div>
        <span className="text-xs text-[color:var(--muted)]">
          {filtered.length === entries.length ? `共 ${entries.length} 条` : `筛选 ${filtered.length} / ${entries.length} 条`}
        </span>
      </div>
    </div>
  )
}
