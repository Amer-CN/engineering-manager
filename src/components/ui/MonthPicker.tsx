import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ═══════════════════════════════════════════════════════════════════════════════
// MonthPicker - 替代 <input type="month"> 的自定义月份选择器
// ═══════════════════════════════════════════════════════════════════════════════

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

interface MonthPickerProps {
  /** "YYYY-MM" 格式 */
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MonthPicker({ value, onChange, className = '' }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // 解析当前值
  const [year, month] = value.split('-').map(Number)
  const [viewYear, setViewYear] = useState(year || new Date().getFullYear())

  // 今天的标记
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (!open) {
      setViewYear(year || new Date().getFullYear())
      updatePos()
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [open, year, updatePos])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // 滚动时更新位置
  useEffect(() => {
    if (!open) return
    const handler = () => updatePos()
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open, updatePos])

  // 选择月份
  const handleSelectMonth = (m: number) => {
    const mm = String(m).padStart(2, '0')
    onChange(`${viewYear}-${mm}`)
    setOpen(false)
  }

  // 上一年 / 下一年
  const prevYear = () => setViewYear(y => y - 1)
  const nextYear = () => setViewYear(y => y + 1)

  // 显示按钮文本
  const displayText = value || '选择月份'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white hover:border-slate-400 transition-colors focus:ring-2 focus:ring-primary-500 focus:outline-none ${className}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{displayText}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[100] w-[280px] rounded-xl border border-slate-200 bg-white shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* 年份切换 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button
              type="button"
              onClick={prevYear}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="上一年"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-700 select-none">{viewYear}年</span>
            <button
              type="button"
              onClick={nextYear}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="下一年"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* 月份网格 3×4 */}
          <div className="grid grid-cols-3 gap-1.5 p-3">
            {MONTH_LABELS.map((label, idx) => {
              const m = idx + 1
              const isSelected = viewYear === year && m === month
              const isToday = viewYear === todayYear && m === todayMonth

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={[
                    'h-9 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-primary-500 text-white shadow-sm'
                      : isToday
                        ? 'border-2 border-primary-400 text-primary-600 hover:bg-primary-50'
                        : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default MonthPicker
