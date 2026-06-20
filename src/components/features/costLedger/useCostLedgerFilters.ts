import { useState, useMemo, useCallback } from 'react'
import { getLevel1ForCode } from '@/components/features/costLedger/config'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

export interface CostLedgerFiltersApi {
  checkedCounterparties: Set<string>
  checkedChannels: Set<string>
  checkedVoucherNos: Set<string>
  checkedSummaries: Set<string>
  checkedNotesSet: Set<string>
  checkedDates: Set<string>
  checkedAmounts: Set<string>
  filter: 'all' | 'expense' | 'income'
  categoryFilter: string
  categoryLevel: 'level1' | 'level2'
  sortField: string
  sortAsc: boolean
  colValues: {
    counterparties: string[]
    channels: string[]
    voucherNos: string[]
    summaries: string[]
    notesList: string[]
    dates: string[]
    amounts: string[]
  }
  filtered: CostLedgerEntry[]
  activeFilters: number
  setFilter: (f: 'all' | 'expense' | 'income') => void
  setCategoryFilter: (c: string) => void
  setCategoryLevel: (l: 'level1' | 'level2') => void
  toggleSort: (field: string) => void
  makeToggle: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (val: string) => void
  makeSetAll: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (vals: string[]) => void
  makeClear: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => () => void
  clearAll: () => void
  setCheckedCounterparties: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedChannels: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedVoucherNos: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedSummaries: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedNotesSet: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedDates: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedAmounts: React.Dispatch<React.SetStateAction<Set<string>>>
}

export function useCostLedgerFilters(entries: CostLedgerEntry[], categories?: CostLedgerCategory[] | null): CostLedgerFiltersApi {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('voucherNo')
  const [sortAsc, setSortAsc] = useState(true)
  const [checkedCounterparties, setCheckedCounterparties] = useState<Set<string>>(new Set())
  const [checkedChannels, setCheckedChannels] = useState<Set<string>>(new Set())
  const [checkedVoucherNos, setCheckedVoucherNos] = useState<Set<string>>(new Set())
  const [checkedSummaries, setCheckedSummaries] = useState<Set<string>>(new Set())
  const [checkedNotesSet, setCheckedNotesSet] = useState<Set<string>>(new Set())
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set())
  const [checkedAmounts, setCheckedAmounts] = useState<Set<string>>(new Set())
  const [categoryLevel, setCategoryLevel] = useState<'level1' | 'level2'>(() => {
    const stored = localStorage.getItem('costLedgerCategoryLevel')
    return stored === 'level1' ? 'level1' : 'level2'
  })

  const setCategoryLevelPersisted = useCallback((l: 'level1' | 'level2') => {
    setCategoryLevel(l)
    setCategoryFilter('all')
    localStorage.setItem('costLedgerCategoryLevel', l)
  }, [])

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

  const toggleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }, [sortField, sortAsc])

  const activeFilters = useMemo(() => [
    checkedVoucherNos.size > 0, checkedSummaries.size > 0, checkedNotesSet.size > 0,
    checkedDates.size > 0, checkedAmounts.size > 0,
    checkedCounterparties.size > 0, checkedChannels.size > 0,
  ].filter(Boolean).length, [checkedVoucherNos, checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts, checkedCounterparties, checkedChannels])

  const clearAll = useCallback(() => {
    setCheckedVoucherNos(new Set()); setCheckedSummaries(new Set()); setCheckedNotesSet(new Set())
    setCheckedDates(new Set()); setCheckedAmounts(new Set())
    setCheckedCounterparties(new Set()); setCheckedChannels(new Set())
    setFilter('all'); setCategoryFilter('all')
  }, [])

  return {
    checkedCounterparties, checkedChannels, checkedVoucherNos,
    checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts,
    filter, categoryFilter, categoryLevel, sortField, sortAsc,
    colValues, filtered, activeFilters,
    setFilter, setCategoryFilter, setCategoryLevel: setCategoryLevelPersisted,
    toggleSort, makeToggle, makeSetAll, makeClear, clearAll,
    setCheckedCounterparties, setCheckedChannels, setCheckedVoucherNos,
    setCheckedSummaries, setCheckedNotesSet, setCheckedDates, setCheckedAmounts,
  }
}
