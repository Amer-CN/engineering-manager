import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Column } from '../DataTable'

/**
 * ColFilterDropdown 筛选下拉框（v1.1.0 拆分自 DataTable.tsx，177 行）
 * - 通过 createPortal 渲染到 body，避免被 overflow:hidden 父级裁剪
 * - 支持搜索框、全选/清除、checkbox 多选
 * - 列可指定 filterOptions 提供 label，或自动从 data 提取唯一值
 */

interface ColFilterDropdownProps {
  /** 列配置 */
  col: Column<unknown>
  /** 所有数据（用于自动提取唯一值） */
  data: unknown[]
  /** 当前已选中的值集合 */
  checked: Set<string>
  /** 切换单个值 */
  onToggle: (value: string) => void
  /** 全选 */
  onSelectAll: () => void
  /** 清除全部 */
  onClear: () => void
  /** 是否激活（有筛选条件） */
  isActive: boolean
}

export function ColFilterDropdown({
  col,
  data,
  checked,
  onToggle,
  onSelectAll,
  onClear,
  isActive,
}: ColFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // 计算可选项列表
  const options = useMemo(() => {
    if (col.filterable === 'select' && col.filterOptions) {
      return col.filterOptions.map(o => o.value)
    }
    // filterable === true，自动从 data 中提取唯一值
    const accessor = col.filterAccessor || ((item: unknown) => String((item as Record<string, unknown>)[col.key] ?? ''))
    const unique = new Set<string>()
    for (const item of data) {
      const val = accessor(item)
      if (val) unique.add(val)
    }
    return Array.from(unique).sort()
  }, [col, data])

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (!open) {
      setSearch('')
      updatePos()
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [open, updatePos])

  // 点击外部关闭 (mousedown)
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

  // 搜索过滤
  const q = search.trim().toLowerCase()
  const filteredOptions = q ? options.filter(v => v.toLowerCase().includes(q)) : options
  const allChecked = filteredOptions.length > 0 && filteredOptions.every(v => checked.has(v))

  const handleSelectAll = () => {
    if (allChecked) {
      for (const v of filteredOptions) {
        if (checked.has(v)) onToggle(v)
      }
    } else {
      for (const v of filteredOptions) {
        if (!checked.has(v)) onToggle(v)
      }
    }
  }

  const handleLabel = (value: string) => {
    if (col.filterable === 'select' && col.filterOptions) {
      const opt = col.filterOptions.find(o => o.value === value)
      return opt?.label ?? value
    }
    return value
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); handleToggle() }}
        className={`ml-1 shrink-0 rounded p-0.5 transition-colors ${isActive ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'text-[color:var(--border-strong)] hover:text-[color:var(--muted)]'}`}
        title={`筛选${col.title}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M0 0h10L6 4.5V9L4 10V4.5L0 0z" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[100] w-52 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* 搜索框 */}
          <div className="p-1.5 border-b border-[color:var(--border)]">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full rounded border border-[color:var(--border)] px-2 py-1 text-xs text-[color:var(--fg-2)] focus:border-[color:var(--accent)] focus:outline-none"
            />
          </div>
          {/* 全选/清除按钮 */}
          <div className="flex gap-1 border-b border-[color:var(--border)] px-1.5 py-1">
            <button type="button" onClick={handleSelectAll}
              className="text-caption text-[color:var(--accent)] hover:opacity-80">
              {allChecked ? '取消全选' : '全选'}
            </button>
            <button type="button" onClick={onClear}
              className="text-caption text-[color:var(--muted)] hover:text-[color:var(--fg-2)]">
              清除
            </button>
            {search.trim() && (
              <span className="ml-auto text-caption text-[color:var(--muted)]">
                {filteredOptions.length}/{options.length}
              </span>
            )}
          </div>
          {/* checkbox 列表 */}
          <div className="max-h-48 overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-2 py-1 text-xs text-[color:var(--muted)]">无可用值</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-2 py-1 text-xs text-[color:var(--muted)]">无匹配结果</p>
            ) : (
              filteredOptions.map(v => (
                <label
                  key={v}
                  className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 text-xs text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(v)}
                    onChange={() => onToggle(v)}
                    className="h-3 w-3 rounded border-[color:var(--border)] shrink-0"
                  />
                  <span className="truncate">{handleLabel(v)}</span>
                </label>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}