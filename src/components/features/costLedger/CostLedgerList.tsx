import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { CostLedgerRow } from '@/components/features/costLedger/CostLedgerRow'
import { formatMoney } from '@/utils/format'
import { DIRECTION_CONFIG, getLevel1ForCode, getCategoriesByDirection, getLevel1GroupsMerged, getCategoryColor } from '@/components/features/costLedger/config'
import { ColumnFilter } from '@/components/features/costLedger/ColumnFilter'
import { printCostLedgerList, exportCostLedgerList } from '@/components/features/costLedger/printExport'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerListProps {
  entries: CostLedgerEntry[]
  summary: { totalExpense: number; totalIncome: number } | null
  loading: boolean
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
  /** 动态分类列表（从数据库加载），用于显示标签和筛选下拉。不传则回退到硬编码常量。 */
  categories?: CostLedgerCategory[] | null
}

export function CostLedgerList({ entries, summary, loading, onEdit, onDelete, categories }: CostLedgerListProps) {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('voucherNo')
  const [sortAsc, setSortAsc] = useState(true)
  const zoomRef = useRef(parseFloat(localStorage.getItem('costLedgerZoom') || '1.1'))
  const tableRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(zoomRef.current)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    let timer: any
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const next = Math.max(0.5, Math.min(2, +(zoomRef.current - e.deltaY * 0.005).toFixed(2)))
      zoomRef.current = next
      el.style.zoom = String(next)
      clearTimeout(timer)
      timer = setTimeout(() => { setZoom(next); localStorage.setItem('costLedgerZoom', String(next)) }, 120)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const [checkedCounterparties, setCheckedCounterparties] = useState<Set<string>>(new Set())
  const [checkedChannels, setCheckedChannels] = useState<Set<string>>(new Set())
  const [checkedVoucherNos, setCheckedVoucherNos] = useState<Set<string>>(new Set())
  const [checkedSummaries, setCheckedSummaries] = useState<Set<string>>(new Set())
  const [checkedNotesSet, setCheckedNotesSet] = useState<Set<string>>(new Set())
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set())
  const [checkedAmounts, setCheckedAmounts] = useState<Set<string>>(new Set())

  // 分类列显示层级：二级 / 一级切换，localStorage 持久化
  const [categoryLevel, setCategoryLevel] = useState<'level1' | 'level2'>(() => {
    const stored = localStorage.getItem('costLedgerCategoryLevel')
    return stored === 'level1' ? 'level1' : 'level2'
  })

  // Derive unique values
  const colValues = useMemo(() => {
    const base = entries
      .filter(e => filter === 'all' || e.direction === filter)
      .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
    return {
      counterparties: [...new Set(base.map(e => e.counterparty).filter(Boolean))].sort() as string[],
      channels: [...new Set(base.map(e => e.channel).filter(Boolean))].sort() as string[],
      voucherNos: [...new Set(base.map(e => String(e.voucherNo)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true })) as string[],
      summaries: [...new Set(base.map(e => e.summary).filter(Boolean))].sort() as string[],
      notesList: [...new Set(base.map(e => e.notes).filter(Boolean))].sort() as string[],
      dates: [...new Set(base.map(e => e.date).filter(Boolean))].sort() as string[],
      amounts: [...new Set(base.map(e => e.amount.toFixed(2)).filter(Boolean))].sort((a, b) => Number(a) - Number(b)) as string[],
    }
  }, [entries, filter, categoryFilter])

  // Toggle helpers
  const makeToggle = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (val: string) => {
    setter(prev => { const n = new Set(prev); if (n.has(val)) n.delete(val); else n.add(val); return n })
  }, [])
  const makeSetAll = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (vals: string[]) => {
    setter(new Set(vals))
  }, [])
  const makeClear = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>) => () => {
    setter(new Set())
  }, [])

  const filtered = useMemo(() => {
    const list = entries
      .filter(e => filter === 'all' || e.direction === filter)
      .filter(e => {
        if (categoryFilter === 'all') return true
        if (categoryFilter.startsWith('level1:')) {
          return getLevel1ForCode(e.category, categories) === categoryFilter.slice(7)
        }
        return e.category === categoryFilter
      })
      .filter(e => checkedVoucherNos.size === 0 || checkedVoucherNos.has(String(e.voucherNo)))
      .filter(e => checkedCounterparties.size === 0 || checkedCounterparties.has(e.counterparty))
      .filter(e => checkedChannels.size === 0 || checkedChannels.has(e.channel))
      .filter(e => checkedSummaries.size === 0 || checkedSummaries.has(e.summary))
      .filter(e => checkedNotesSet.size === 0 || checkedNotesSet.has(e.notes || ''))
      .filter(e => checkedDates.size === 0 || checkedDates.has(e.date))
      .filter(e => checkedAmounts.size === 0 || checkedAmounts.has(e.amount.toFixed(2)))
    return [...list].sort((a: any, b: any) => {
      const va = a[sortField]; const vb = b[sortField]
      if (va == null) return sortAsc ? 1 : -1
      if (vb == null) return sortAsc ? -1 : 1
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va
      return sortAsc ? String(va).localeCompare(String(vb), 'zh-CN', { numeric: true }) : String(vb).localeCompare(String(va), 'zh-CN', { numeric: true })
    })
  }, [entries, filter, categoryFilter, checkedVoucherNos, checkedCounterparties, checkedChannels, checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts, sortField, sortAsc, categories])

  const filterSummary = useMemo(() => {
    let totalExpense = 0, totalIncome = 0
    for (const e of filtered) {
      if (e.direction === 'expense') totalExpense += e.amount
      else totalIncome += e.amount
    }
    return { totalExpense, totalIncome, count: filtered.length }
  }, [filtered])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const activeFilters = [
    checkedVoucherNos.size > 0, checkedSummaries.size > 0, checkedNotesSet.size > 0,
    checkedDates.size > 0, checkedAmounts.size > 0,
    checkedCounterparties.size > 0, checkedChannels.size > 0,
  ].filter(Boolean).length

  const clearAll = () => {
    setCheckedVoucherNos(new Set()); setCheckedSummaries(new Set()); setCheckedNotesSet(new Set())
    setCheckedDates(new Set()); setCheckedAmounts(new Set())
    setCheckedCounterparties(new Set()); setCheckedChannels(new Set())
    setFilter('all'); setCategoryFilter('all')
  }

  if (loading) {
    return <div className="space-y-2 p-6"><div className="h-8 w-full animate-pulse rounded bg-slate-100" /><div className="h-8 w-full animate-pulse rounded bg-slate-100" /><div className="h-8 w-full animate-pulse rounded bg-slate-100" /></div>
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-lg">暂无台账记录</p>
        <p className="mt-1 text-sm">点击"新增"添加第一条成本台账</p>
      </div>
    )
  }

  const filterCols = ['voucherNo', 'date', 'counterparty', 'channel', 'amount', 'summary', 'notes']

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 顶部快捷筛选栏 */}
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
        {/* 分类列显示层级切换：一级 / 二级 — 下拉框联动，切换时重置筛选项 */}
        <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(['level1', 'level2'] as const).map(level => (
            <button key={level} onClick={() => { setCategoryLevel(level); setCategoryFilter('all'); localStorage.setItem('costLedgerCategoryLevel', level) }}
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
          {/* 方案一：下拉框跟随一级/二级切换联动 */}
          {categoryLevel === 'level1' ? (
            // 一级模式：只显示一级分组选项
            (['expense', 'income'] as const).map(dir => {
              if ((dir === 'expense' && filter === 'income') || (dir === 'income' && filter === 'expense')) return null
              const groups = getLevel1GroupsMerged(categories, dir)
              return groups.map(group => (
                <option key={group.name} value={`level1:${group.name}`} style={{ color: group.color, fontWeight: 500 }}>
                  {dir === 'expense' ? '支出' : '收入'} · {group.name}
                </option>
              ))
            })
          ) : (
            // 二级模式：只显示二级分类，按一级分组
            (['expense', 'income'] as const).map(dir => {
              if ((dir === 'expense' && filter === 'income') || (dir === 'income' && filter === 'expense')) return null
              const groups = getLevel1GroupsMerged(categories, dir)
              const dirCats = categories && categories.length > 0
                ? categories.filter(c => c.direction === dir && c.isEnabled !== false)
                : getCategoriesByDirection(dir)
              return groups.map(group => {
                const subs = dirCats.filter(c => group.codes.includes(c.code))
                if (subs.length === 0) return null
                return (
                  <optgroup key={group.name} label={`${dir === 'expense' ? '支出' : '收入'} · ${group.name}`}>
                    {subs.map(c => (
                      <option key={c.code} value={c.code} style={{ color: c.color || getCategoryColor(c.code, categories) }}>{c.label}</option>
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
            }} className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100" title="缩小">−</button>
            <span className="text-xs text-slate-500 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => {
              const n = Math.min(2, +(zoomRef.current + 0.1).toFixed(1))
              zoomRef.current = n; localStorage.setItem('costLedgerZoom', String(n)); setZoom(n)
              if (tableRef.current) tableRef.current.style.zoom = String(n)
            }} className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100" title="放大">+</button>
          </div>
          <span className="text-xs text-slate-400">
            {filtered.length === entries.length ? `共 ${entries.length} 条` : `筛选 ${filtered.length} / ${entries.length} 条`}
          </span>
        </div>
      </div>

      {/* 表格 */}
      <div ref={tableRef} className="flex-1 overflow-auto min-h-0" style={{ zoom }}>
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-xs">
            <tr>
              {[
                ['voucherNo', '凭证号', 'w-[96px] text-center'],
                ['date', '日期', 'w-[84px]'],
                ['direction', '方向', 'w-[60px]'],
                ['category', '分类', 'w-[96px]'],
                ['counterparty', '往来单位/个人', ''],
                ['channel', '渠道', 'w-[96px]'],
                ['amount', '金额', 'w-[136px] text-right'],
                ['summary', '摘要', ''],
                ['notes', '备注', ''],
              ].map(([field, label, width]) => (
                <th key={field} className={`border-b border-slate-200 px-3 py-2 text-slate-500 ${width}`}>
                  <div className="flex items-center">
                    <span className="cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort(field as string)}>
                      {label}{sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </span>
                    {filterCols.includes(field as string) && (
                      <ColumnFilter
                        col={field as string}
                        colValues={colValues}
                        checkedCounterparties={checkedCounterparties}
                        checkedChannels={checkedChannels}
                        checkedVoucherNos={checkedVoucherNos}
                        checkedSummaries={checkedSummaries}
                        checkedNotesSet={checkedNotesSet}
                        checkedDates={checkedDates}
                        checkedAmounts={checkedAmounts}
                        onToggleCounterparty={makeToggle(setCheckedCounterparties)}
                        onToggleChannel={makeToggle(setCheckedChannels)}
                        onToggleVoucherNo={makeToggle(setCheckedVoucherNos)}
                        onToggleSummary={makeToggle(setCheckedSummaries)}
                        onToggleNote={makeToggle(setCheckedNotesSet)}
                        onToggleDate={makeToggle(setCheckedDates)}
                        onToggleAmount={makeToggle(setCheckedAmounts)}
                        onSetAllCounterparties={makeSetAll(setCheckedCounterparties)}
                        onSetAllChannels={makeSetAll(setCheckedChannels)}
                        onSetAllVoucherNos={makeSetAll(setCheckedVoucherNos)}
                        onSetAllSummaries={makeSetAll(setCheckedSummaries)}
                        onSetAllNotes={makeSetAll(setCheckedNotesSet)}
                        onSetAllDates={makeSetAll(setCheckedDates)}
                        onSetAllAmounts={makeSetAll(setCheckedAmounts)}
                        onClearCounterparties={makeClear(setCheckedCounterparties)}
                        onClearChannels={makeClear(setCheckedChannels)}
                        onClearVoucherNos={makeClear(setCheckedVoucherNos)}
                        onClearSummaries={makeClear(setCheckedSummaries)}
                        onClearNotes={makeClear(setCheckedNotesSet)}
                        onClearDates={makeClear(setCheckedDates)}
                        onClearAmounts={makeClear(setCheckedAmounts)}
                      />
                    )}
                  </div>
                </th>
              ))}
              <th className="border-b border-slate-200 px-3 py-2 text-right text-slate-500 w-[64px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                  无匹配结果，请调整筛选条件
                </td>
              </tr>
            ) : filtered.map(entry => (
              <CostLedgerRow
                key={entry.id}
                entry={entry}
                categoryLevel={categoryLevel}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 汇总行 */}
      <div className="sticky bottom-0 border-t-2 border-slate-300 bg-white">
        <div className="flex items-center justify-between px-6 py-4 text-sm">
          <span className="text-sm text-slate-600">
            {activeFilters > 0 ? `筛选结果: ${filterSummary.count} 条` : `合计 ${entries.length} 条`}
          </span>
          <div className="flex gap-8 font-mono">
            <div className="text-right">
              <div className="text-xs text-slate-600">经营支出</div>
              <div className="text-lg font-bold text-red-600">{formatMoney(filterSummary.totalExpense)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600">资金收入</div>
              <div className="text-lg font-bold text-emerald-600">{formatMoney(filterSummary.totalIncome)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600">净{filterSummary.totalIncome - filterSummary.totalExpense >= 0 ? '流入' : '流出'}</div>
              <div className={`text-lg font-bold ${filterSummary.totalIncome - filterSummary.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatMoney(filterSummary.totalIncome - filterSummary.totalExpense)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
