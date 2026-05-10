import { useState, useMemo, useCallback } from 'react'
import { formatMoney } from '@/utils/format'
import { DIRECTION_CONFIG, getCategoryLabel } from './config'
import { ColumnFilter } from './ColumnFilter'
import type { CostLedgerEntry } from '@/types'

interface CostLedgerListProps {
  entries: CostLedgerEntry[]
  summary: { totalExpense: number; totalIncome: number } | null
  loading: boolean
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
}

export function CostLedgerList({ entries, summary, loading, onEdit, onDelete }: CostLedgerListProps) {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('voucherNo')
  const [sortAsc, setSortAsc] = useState(true)

  const [checkedCounterparties, setCheckedCounterparties] = useState<Set<string>>(new Set())
  const [checkedChannels, setCheckedChannels] = useState<Set<string>>(new Set())
  const [searchVoucherNo, setSearchVoucherNo] = useState('')
  const [searchSummary, setSearchSummary] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  // Derive unique values
  const colValues = useMemo(() => {
    const base = entries
      .filter(e => filter === 'all' || e.direction === filter)
      .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
    return {
      counterparties: [...new Set(base.map(e => e.counterparty).filter(Boolean))].sort() as string[],
      channels: [...new Set(base.map(e => e.channel).filter(Boolean))].sort() as string[],
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
    return entries
      .filter(e => filter === 'all' || e.direction === filter)
      .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
      .filter(e => !searchVoucherNo || String(e.voucherNo).includes(searchVoucherNo))
      .filter(e => checkedCounterparties.size === 0 || checkedCounterparties.has(e.counterparty))
      .filter(e => checkedChannels.size === 0 || checkedChannels.has(e.channel))
      .filter(e => !searchSummary || e.summary.toLowerCase().includes(searchSummary.toLowerCase()))
      .filter(e => !dateFrom || e.date >= dateFrom)
      .filter(e => !dateTo || e.date <= dateTo)
      .filter(e => {
        if (!amountMin && !amountMax) return true
        const min = amountMin ? parseFloat(amountMin) : -Infinity
        const max = amountMax ? parseFloat(amountMax) : Infinity
        return e.amount >= min && e.amount <= max
      })
      .sort((a: any, b: any) => {
        const va = a[sortField]; const vb = b[sortField]
        if (typeof va === 'number') return sortAsc ? va - vb : vb - va
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
      })
  }, [entries, filter, categoryFilter, searchVoucherNo, checkedCounterparties, checkedChannels, searchSummary, dateFrom, dateTo, amountMin, amountMax, sortField, sortAsc])

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
    searchVoucherNo, searchSummary, dateFrom, dateTo, amountMin, amountMax,
    checkedCounterparties.size > 0, checkedChannels.size > 0,
  ].filter(Boolean).length

  const clearAll = () => {
    setSearchVoucherNo(''); setSearchSummary(''); setDateFrom(''); setDateTo('')
    setAmountMin(''); setAmountMax('')
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

  const filterCols = ['voucherNo', 'date', 'counterparty', 'channel', 'amount', 'summary']

  return (
    <div>
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
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
          <option value="all">全部分类</option>
          {filter !== 'income' && <optgroup label="支出">
            {['labor','material','equipment','pre_project','business_expense','advance','salary','tax','other'].map(c =>
              <option key={c} value={c}>{getCategoryLabel(c)}</option>
            )}
          </optgroup>}
          {filter !== 'expense' && <optgroup label="收入">
            {['shareholder_investment','financing','advance_recovery'].map(c =>
              <option key={c} value={c}>{getCategoryLabel(c)}</option>
            )}
          </optgroup>}
        </select>
        {activeFilters > 0 && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:text-blue-800">清除 {activeFilters} 个筛选</button>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length === entries.length ? `共 ${entries.length} 条` : `筛选 ${filtered.length} / ${entries.length} 条`}
        </span>
      </div>

      {/* 表格 */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <table className="w-full table-fixed border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs">
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
                        searchVoucherNo={searchVoucherNo}
                        searchSummary={searchSummary}
                        dateFrom={dateFrom} dateTo={dateTo}
                        amountMin={amountMin} amountMax={amountMax}
                        onToggleCounterparty={makeToggle(setCheckedCounterparties)}
                        onToggleChannel={makeToggle(setCheckedChannels)}
                        onSetAllCounterparties={makeSetAll(setCheckedCounterparties)}
                        onSetAllChannels={makeSetAll(setCheckedChannels)}
                        onClearCounterparties={makeClear(setCheckedCounterparties)}
                        onClearChannels={makeClear(setCheckedChannels)}
                        onSearchVoucherNo={setSearchVoucherNo}
                        onSearchSummary={setSearchSummary}
                        onDateFrom={setDateFrom} onDateTo={setDateTo}
                        onAmountMin={setAmountMin} onAmountMax={setAmountMax}
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
            ) : filtered.map(entry => {
              const dir = DIRECTION_CONFIG[entry.direction]
              return (
                <tr key={entry.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-mono font-semibold text-slate-600 truncate">{entry.voucherNo || '-'}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{entry.date}</td>
                  <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${dir.bg} ${dir.color}`}>{dir.label}</span></td>
                  <td className="px-3 py-2 text-slate-600 truncate">{getCategoryLabel(entry.category)}</td>
                  <td className="px-3 py-2 font-medium text-slate-700 truncate">{entry.counterparty}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate" title={entry.channel}>{entry.channel}</td>
                  <td className={`px-3 py-2 text-right font-mono font-medium whitespace-nowrap ${entry.direction === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {entry.direction === 'expense' ? '-' : '+'}{formatMoney(entry.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate" title={entry.summary}>
                    {entry.summary}
                    {entry.linkedInvoiceStatus === 'deleted' && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 text-[10px]">已删发票</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 truncate" title={entry.notes || ''}>
                    {entry.notes || '-'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(entry)} className="mr-1 text-xs text-blue-600 hover:text-blue-800">编辑</button>
                    <button onClick={() => onDelete(entry.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 汇总行 */}
      <div className="sticky bottom-0 border-t-2 border-slate-300 bg-white">
        <div className="flex items-center justify-between px-6 py-3 text-sm">
          <span className="text-xs text-slate-400">
            {activeFilters > 0 ? `筛选结果: ${filterSummary.count} 条` : `合计 ${entries.length} 条`}
          </span>
          <div className="flex gap-6 font-mono">
            <div className="text-right">
              <div className="text-xs text-slate-400">经营支出</div>
              <div className="font-semibold text-red-600">{formatMoney(filterSummary.totalExpense)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">资金收入</div>
              <div className="font-semibold text-emerald-600">{formatMoney(filterSummary.totalIncome)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">净{filterSummary.totalIncome - filterSummary.totalExpense >= 0 ? '流入' : '流出'}</div>
              <div className={`font-semibold ${filterSummary.totalIncome - filterSummary.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatMoney(filterSummary.totalIncome - filterSummary.totalExpense)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
