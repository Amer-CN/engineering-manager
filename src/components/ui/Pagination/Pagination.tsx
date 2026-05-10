import React from 'react'
import { Icon } from '../Icon'

export interface PaginationProps {
  current: number
  total: number
  pageSize?: number
  onChange: (page: number) => void
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
  showTotal?: boolean
  showQuickJumper?: boolean
  simple?: boolean
  className?: string
}

export function Pagination({
  current,
  total,
  pageSize = 10,
  onChange,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  showTotal = true,
  showQuickJumper = false,
  simple = false,
  className = '',
}: PaginationProps) {
  const getPaginationNumbers = () => {
    const numbers: (number | 'ellipsis')[] = []
    const maxVisible = 7
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) numbers.push(i)
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) numbers.push(i)
        numbers.push('ellipsis')
        numbers.push(total)
      } else if (current >= total - 3) {
        numbers.push(1)
        numbers.push('ellipsis')
        for (let i = total - 4; i <= total; i++) numbers.push(i)
      } else {
        numbers.push(1)
        numbers.push('ellipsis')
        for (let i = current - 1; i <= current + 1; i++) numbers.push(i)
        numbers.push('ellipsis')
        numbers.push(total)
      }
    }
    return numbers
  }

  const paginationNumbers = getPaginationNumbers()

  const btnBase = 'flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
  const btnActive = 'bg-primary-600 text-white shadow-sm'
  const btnInactive = 'text-slate-600 hover:bg-slate-100:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'

  if (simple) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => current > 1 && onChange(current - 1)}
          disabled={current === 1}
          className={`${btnBase} ${btnInactive}`}
          aria-label="上一页"
        >
          <Icon name="ChevronLeft" size={16} />
        </button>
        <span className="text-sm text-slate-600">
          {current} / {total}
        </span>
        <button
          onClick={() => current < total && onChange(current + 1)}
          disabled={current === total}
          className={`${btnBase} ${btnInactive}`}
          aria-label="下一页"
        >
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 flex-wrap ${className}`}>
      {showTotal && (
        <span className="text-sm text-slate-500">
          共 {total} 条
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => current > 1 && onChange(current - 1)}
          disabled={current === 1}
          className={`${btnBase} ${btnInactive}`}
          aria-label="上一页"
        >
          <Icon name="ChevronLeft" size={16} />
        </button>

        {paginationNumbers.map((num, index) => {
          if (num === 'ellipsis') {
            return <span key={`e-${index}`} className="px-2 text-slate-400">...</span>
          }
          const isActive = current === num
          return (
            <button
              key={num}
              onClick={() => onChange(num)}
              className={`${btnBase} ${isActive ? btnActive : btnInactive}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {num}
            </button>
          )
        })}

        <button
          onClick={() => current < total && onChange(current + 1)}
          disabled={current === total}
          className={`${btnBase} ${btnInactive}`}
          aria-label="下一页"
        >
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>

      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}

      {showQuickJumper && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">跳至</span>
          <input
            type="number"
            min={1}
            max={total}
            onBlur={(e) => {
              const page = Number(e.target.value)
              if (page >= 1 && page <= total) onChange(page)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = Number((e.target as HTMLInputElement).value)
                if (page >= 1 && page <= total) onChange(page)
              }
            }}
            className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-slate-500">页</span>
        </div>
      )}
    </div>
  )
}
