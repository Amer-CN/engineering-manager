import { useState, useMemo, useRef, useEffect } from 'react'
import { CostLedgerListToolbar } from '@/components/features/costLedger/CostLedgerListToolbar'
import { CostLedgerTable } from '@/components/features/costLedger/CostLedgerTable'
import { formatMoney } from '@/utils/format'
import { useCostLedgerFilters } from '@/components/features/costLedger/useCostLedgerFilters'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerListProps {
  entries: CostLedgerEntry[]
  summary: { totalExpense: number; totalIncome: number } | null
  loading: boolean
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
  categories?: CostLedgerCategory[] | null
}

export function CostLedgerList({ entries, summary, loading, onEdit, onDelete, categories }: CostLedgerListProps) {
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

  const {
    filter, categoryFilter, categoryLevel, sortField, sortAsc,
    checkedCounterparties, checkedChannels, checkedVoucherNos,
    checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts,
    colValues, filtered, activeFilters,
    setFilter, setCategoryFilter, setCategoryLevel: setCategoryLevelAndReset,
    toggleSort,
    makeToggle, makeSetAll, makeClear, clearAll,
    setCheckedCounterparties, setCheckedChannels, setCheckedVoucherNos,
    setCheckedSummaries, setCheckedNotesSet, setCheckedDates, setCheckedAmounts,
  } = useCostLedgerFilters(entries, categories)

  const filterSummary = useMemo(() => {
    let totalExpense = 0, totalIncome = 0
    for (const e of filtered) {
      if (e.direction === 'expense') totalExpense += e.amount
      else totalIncome += e.amount
    }
    return { totalExpense, totalIncome, count: filtered.length }
  }, [filtered])

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
      <CostLedgerListToolbar
        filter={filter} categoryFilter={categoryFilter} categoryLevel={categoryLevel}
        setFilter={setFilter} setCategoryFilter={setCategoryFilter} setCategoryLevelAndReset={setCategoryLevelAndReset}
        clearAll={clearAll} activeFilters={activeFilters} categories={categories}
        filtered={filtered} entries={entries} filterSummary={filterSummary}
        zoomRef={zoomRef} tableRef={tableRef} zoom={zoom} setZoom={setZoom}
      />

      <CostLedgerTable
        filtered={filtered} entries={entries} categoryLevel={categoryLevel} categories={categories}
        onEdit={onEdit} onDelete={onDelete}
        toggleSort={toggleSort} sortField={sortField} sortAsc={sortAsc}
        filterCols={filterCols} colValues={colValues}
        checkedCounterparties={checkedCounterparties} checkedChannels={checkedChannels}
        checkedVoucherNos={checkedVoucherNos} checkedSummaries={checkedSummaries}
        checkedNotesSet={checkedNotesSet} checkedDates={checkedDates} checkedAmounts={checkedAmounts}
        makeToggle={makeToggle} makeSetAll={makeSetAll} makeClear={makeClear}
        setCheckedCounterparties={setCheckedCounterparties} setCheckedChannels={setCheckedChannels}
        setCheckedVoucherNos={setCheckedVoucherNos} setCheckedSummaries={setCheckedSummaries}
        setCheckedNotesSet={setCheckedNotesSet} setCheckedDates={setCheckedDates}
        setCheckedAmounts={setCheckedAmounts}
        tableRef={tableRef} zoom={zoom}
      />

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
