import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DateFilterTree } from './DateFilterTree'

export interface ColValues {
  counterparties: string[]
  channels: string[]
  voucherNos: string[]
  summaries: string[]
  notesList: string[]
  dates: string[]
  amounts: string[]
}

interface ColumnFilterProps {
  col: string
  colValues: ColValues
  // Checked sets
  checkedCounterparties: Set<string>
  checkedChannels: Set<string>
  checkedVoucherNos: Set<string>
  checkedSummaries: Set<string>
  checkedNotesSet: Set<string>
  checkedDates: Set<string>
  checkedAmounts: Set<string>
  // Toggle
  onToggleCounterparty: (v: string) => void
  onToggleChannel: (v: string) => void
  onToggleVoucherNo: (v: string) => void
  onToggleSummary: (v: string) => void
  onToggleNote: (v: string) => void
  onToggleDate: (v: string) => void
  onToggleAmount: (v: string) => void
  // Set all
  onSetAllCounterparties: (v: string[]) => void
  onSetAllChannels: (v: string[]) => void
  onSetAllVoucherNos: (v: string[]) => void
  onSetAllSummaries: (v: string[]) => void
  onSetAllNotes: (v: string[]) => void
  onSetAllDates: (v: string[]) => void
  onSetAllAmounts: (v: string[]) => void
  // Clear
  onClearCounterparties: () => void
  onClearChannels: () => void
  onClearVoucherNos: () => void
  onClearSummaries: () => void
  onClearNotes: () => void
  onClearDates: () => void
  onClearAmounts: () => void
}

type CheckColumn = 'counterparty' | 'channel' | 'voucherNo' | 'summary' | 'notes' | 'date' | 'amount'

interface CheckMeta {
  values: string[]
  checked: Set<string>
  toggle: (v: string) => void
  setAll: (vals: string[]) => void
  clear: () => void
}

function resolveCheckMeta(col: CheckColumn, props: ColumnFilterProps): CheckMeta {
  const cv = props.colValues
  switch (col) {
    case 'counterparty':
      return { values: cv.counterparties, checked: props.checkedCounterparties, toggle: props.onToggleCounterparty, setAll: props.onSetAllCounterparties, clear: props.onClearCounterparties }
    case 'channel':
      return { values: cv.channels, checked: props.checkedChannels, toggle: props.onToggleChannel, setAll: props.onSetAllChannels, clear: props.onClearChannels }
    case 'voucherNo':
      return { values: cv.voucherNos, checked: props.checkedVoucherNos, toggle: props.onToggleVoucherNo, setAll: props.onSetAllVoucherNos, clear: props.onClearVoucherNos }
    case 'summary':
      return { values: cv.summaries, checked: props.checkedSummaries, toggle: props.onToggleSummary, setAll: props.onSetAllSummaries, clear: props.onClearSummaries }
    case 'notes':
      return { values: cv.notesList, checked: props.checkedNotesSet, toggle: props.onToggleNote, setAll: props.onSetAllNotes, clear: props.onClearNotes }
    case 'date':
      return { values: cv.dates, checked: props.checkedDates, toggle: props.onToggleDate, setAll: props.onSetAllDates, clear: props.onClearDates }
    case 'amount':
      return { values: cv.amounts, checked: props.checkedAmounts, toggle: props.onToggleAmount, setAll: props.onSetAllAmounts, clear: props.onClearAmounts }
  }
}

export function ColumnFilter(props: ColumnFilterProps) {
  const { col } = props

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [checkSearch, setCheckSearch] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const checkCols: CheckColumn[] = ['counterparty', 'channel', 'voucherNo', 'summary', 'notes', 'date', 'amount']

  const isActive = (() => {
    if (checkCols.includes(col as CheckColumn)) {
      return resolveCheckMeta(col as CheckColumn, props).checked.size > 0
    }
    return false
  })()

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (!open) { setCheckSearch(''); updatePos(); setOpen(true) }
    else setOpen(false)
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = () => updatePos()
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open, updatePos])

  const renderContent = () => {
    if (!checkCols.includes(col as CheckColumn)) return null

    const meta = resolveCheckMeta(col as CheckColumn, props)
    const q = checkSearch.trim().toLowerCase()
    const isDate = col === 'date'

    // Date quick select helpers
    const selectDateRange = (dates: string[]) => {
      meta.setAll(dates)
    }
    const getThisMonthDates = () => {
      const now = new Date()
      const y = now.getFullYear(); const m = now.getMonth()
      const start = `${y}-${String(m+1).padStart(2,'0')}-01`
      const end = `${y}-${String(m+1).padStart(2,'0')}-${String(new Date(y, m+1, 0).getDate()).padStart(2,'0')}`
      return meta.values.filter(d => d >= start && d <= end)
    }
    const getLast3MonthDates = () => {
      const d = new Date(); d.setMonth(d.getMonth() - 3)
      const from = d.toISOString().slice(0, 10)
      return meta.values.filter(d => d >= from)
    }
    const getThisYearDates = () => {
      const y = new Date().getFullYear()
      return meta.values.filter(d => d.startsWith(`${y}-`))
    }

    // Flat checkbox list (non-date columns, or date column with search)
    const renderFlatList = () => {
      const filteredValues = q ? meta.values.filter(v => v.toLowerCase().includes(q)) : meta.values

      return (
        <div className="max-h-48 overflow-y-auto p-1">
          {meta.values.length === 0 ? (
            <p className="px-2 py-1 text-xs text-slate-400">无可用值</p>
          ) : (
            <>
              <div className="flex gap-1 border-b border-slate-100 px-1 pb-1 mb-1">
                <button type="button" onClick={() => meta.setAll(meta.values)} className="text-[10px] text-blue-600 hover:text-blue-800">全选</button>
                <button type="button" onClick={meta.clear} className="text-[10px] text-slate-400 hover:text-slate-600">清除</button>
                {checkSearch.trim() && (
                  <span className="ml-auto text-[10px] text-slate-400">{filteredValues.length}/{meta.values.length}</span>
                )}
              </div>
              {filteredValues.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-400">无匹配结果</p>
              ) : (
                filteredValues.map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50">
                    <input type="checkbox" checked={meta.checked.has(v)} onChange={() => meta.toggle(v)}
                      className="h-3 w-3 rounded border-slate-300 shrink-0" />
                    <span className="truncate">{v}</span>
                  </label>
                ))
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <div className="w-52">
        {/* 搜索框 */}
        <div className="p-1.5 border-b border-slate-100">
          <input autoFocus type="text" value={checkSearch}
            onChange={e => setCheckSearch(e.target.value)}
            placeholder="搜索..."
            className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
          />
        </div>
        {/* 日期快捷按钮 */}
        {isDate && (
          <div className="flex gap-1 border-b border-slate-100 px-1.5 py-1.5">
            {[
              { label: '本月', getDates: getThisMonthDates },
              { label: '近3月', getDates: getLast3MonthDates },
              { label: '本年', getDates: getThisYearDates },
            ].map(p => (
              <button key={p.label} type="button" onClick={() => selectDateRange(p.getDates())}
                className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">{p.label}</button>
            ))}
          </div>
        )}
        {/* 内容区：日期无搜索→树形，其他→平铺 */}
        {isDate && !checkSearch.trim()
          ? <DateFilterTree values={meta.values} checked={meta.checked} toggle={meta.toggle} setAll={meta.setAll} clear={meta.clear} />
          : renderFlatList()
        }
      </div>
    )
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={e => { e.stopPropagation(); handleToggle() }}
        className={`ml-1 shrink-0 rounded p-0.5 transition-colors ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
        title="筛选"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h10L6 4.5V9L4 10V4.5L0 0z" /></svg>
      </button>
      {open && createPortal(
        <div ref={popRef} className="fixed z-[100] min-w-[180px] rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{ top: pos.top, left: pos.left }}>
          {renderContent()}
        </div>,
        document.body
      )}
    </>
  )
}
