import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface ColValues {
  counterparties: string[]
  channels: string[]
}

interface ColumnFilterProps {
  col: string
  colValues: ColValues
  // State
  checkedCounterparties: Set<string>
  checkedChannels: Set<string>
  searchVoucherNo: string
  searchSummary: string
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  // Setters
  onToggleCounterparty: (v: string) => void
  onToggleChannel: (v: string) => void
  onSetAllCounterparties: (v: string[]) => void
  onSetAllChannels: (v: string[]) => void
  onClearCounterparties: () => void
  onClearChannels: () => void
  onSearchVoucherNo: (v: string) => void
  onSearchSummary: (v: string) => void
  onDateFrom: (v: string) => void
  onDateTo: (v: string) => void
  onAmountMin: (v: string) => void
  onAmountMax: (v: string) => void
}

export function ColumnFilter({
  col, colValues,
  checkedCounterparties, checkedChannels,
  searchVoucherNo, searchSummary,
  dateFrom, dateTo, amountMin, amountMax,
  onToggleCounterparty, onToggleChannel,
  onSetAllCounterparties, onSetAllChannels,
  onClearCounterparties, onClearChannels,
  onSearchVoucherNo, onSearchSummary,
  onDateFrom, onDateTo, onAmountMin, onAmountMax,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const isActive = (() => {
    switch (col) {
      case 'counterparty': return checkedCounterparties.size > 0
      case 'channel': return checkedChannels.size > 0
      case 'voucherNo': return !!searchVoucherNo
      case 'date': return !!(dateFrom || dateTo)
      case 'amount': return !!(amountMin || amountMax)
      case 'summary': return !!searchSummary
      default: return false
    }
  })()

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (!open) { updatePos(); setOpen(true) }
    else setOpen(false)
  }, [open])

  // Close on outside click
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

  // Recalculate position on scroll
  useEffect(() => {
    if (!open) return
    const h = () => updatePos()
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open])

  const renderContent = () => {
    switch (col) {
      case 'counterparty':
      case 'channel': {
        const values = col === 'counterparty' ? colValues.counterparties : colValues.channels
        const checked = col === 'counterparty' ? checkedCounterparties : checkedChannels
        const toggle = col === 'counterparty' ? onToggleCounterparty : onToggleChannel
        const setAll = col === 'counterparty' ? () => onSetAllCounterparties(values) : () => onSetAllChannels(values)
        const clear = col === 'counterparty' ? onClearCounterparties : onClearChannels
        return (
          <div className="max-h-56 overflow-y-auto p-1">
            {values.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400">无可用值</p>
            ) : (
              <>
                <div className="flex gap-1 border-b border-slate-100 px-1 pb-1 mb-1">
                  <button type="button" onClick={setAll} className="text-[10px] text-blue-600 hover:text-blue-800">全选</button>
                  <button type="button" onClick={clear} className="text-[10px] text-slate-400 hover:text-slate-600">清除</button>
                </div>
                {values.map(v => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50">
                    <input type="checkbox" checked={checked.has(v)} onChange={() => toggle(v)} className="h-3 w-3 rounded border-slate-300" />
                    <span className="truncate">{v}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        )
      }
      case 'voucherNo':
        return (
          <div className="p-2">
            <input autoFocus type="text" value={searchVoucherNo} onChange={e => onSearchVoucherNo(e.target.value)}
              placeholder="凭证号搜索..." className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none" />
          </div>
        )
      case 'date': {
        const thisMonth = (() => {
          const d = new Date()
          return {
            from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
            to: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()).padStart(2,'0')}`,
          }
        })()
        const last3m = (() => {
          const d = new Date(); d.setMonth(d.getMonth() - 3)
          return { from: d.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }
        })()
        const thisYear = { from: `${new Date().getFullYear()}-01-01`, to: `${new Date().getFullYear()}-12-31` }
        return (
          <div className="space-y-2 p-2">
            <div className="flex gap-1">
              {[{ label: '本月', ...thisMonth }, { label: '近3月', ...last3m }, { label: '本年', ...thisYear }].map(p => (
                <button key={p.label} type="button" onClick={() => { onDateFrom(p.from); onDateTo(p.to) }}
                  className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">{p.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input type="text" value={dateFrom} onChange={e => onDateFrom(e.target.value)} placeholder="从 YYYY-MM-DD"
                className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-[10px] text-slate-600 focus:border-blue-400 focus:outline-none" />
              <span className="text-[10px] text-slate-300">—</span>
              <input type="text" value={dateTo} onChange={e => onDateTo(e.target.value)} placeholder="至 YYYY-MM-DD"
                className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-[10px] text-slate-600 focus:border-blue-400 focus:outline-none" />
            </div>
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { onDateFrom(''); onDateTo('') }} className="text-[10px] text-blue-600 hover:text-blue-800">清除日期</button>
            )}
          </div>
        )
      }
      case 'amount':
        return (
          <div className="space-y-1.5 p-2">
            <div className="flex items-center gap-1">
              <input type="number" value={amountMin} onChange={e => onAmountMin(e.target.value)} placeholder="≥ 最低"
                className="w-full rounded border border-slate-200 px-1.5 py-1 text-[10px] text-slate-600 focus:border-blue-400 focus:outline-none" style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }} />
              <span className="text-[10px] text-slate-300">—</span>
              <input type="number" value={amountMax} onChange={e => onAmountMax(e.target.value)} placeholder="≤ 最高"
                className="w-full rounded border border-slate-200 px-1.5 py-1 text-[10px] text-slate-600 focus:border-blue-400 focus:outline-none" style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }} />
            </div>
            {(amountMin || amountMax) && (
              <button type="button" onClick={() => { onAmountMin(''); onAmountMax('') }} className="text-[10px] text-blue-600 hover:text-blue-800">清除金额</button>
            )}
          </div>
        )
      case 'summary':
        return (
          <div className="p-2">
            <input autoFocus type="text" value={searchSummary} onChange={e => onSearchSummary(e.target.value)}
              placeholder="搜索摘要内容..." className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none" />
          </div>
        )
      default: return null
    }
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
