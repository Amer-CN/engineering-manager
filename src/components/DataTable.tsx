import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HoverScrollbar } from './ui/HoverScrollbar'
import { Icon } from './ui/Icon'
import { TABLE } from '@/constants/table'
import { useStatusStore } from '@/store/statusStore'

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface Column<T> {
  /** 数据字段名 */
  key: string
  /** 表头文字 */
  title: string
  /** 列宽（CSS 值） */
  width?: string
  /** 文本对齐 */
  align?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sortable?: boolean
  /** 自定义排序比较器 */
  sorter?: (a: T, b: T) => number
  /** 自定义单元格渲染 */
  render?: (item: T, index: number) => React.ReactNode
  /** 自定义表头渲染（覆盖 title） */
  headerRender?: React.ReactNode
  /** 列头筛选 */
  filterable?: boolean | 'select'
  /** 筛选选项（filterable='select' 时必填） */
  filterOptions?: { label: string; value: string }[]
  /** 筛选占位符 */
  filterPlaceholder?: string
  /** 获取筛选值的函数（默认读 item[key]） */
  filterAccessor?: (item: T) => string
}

export interface DataTableProps<T> {
  /** 数据列表 */
  data: T[]
  /** 列配置 */
  columns: Column<T>[]
  /** 行唯一标识 */
  rowKey: keyof T | ((item: T) => string)
  /** 行点击回调 */
  onRowClick?: (item: T) => void

  // ── 排序 ──
  /** 默认排序字段 */
  defaultSortKey?: string
  /** 默认排序方向 */
  defaultSortOrder?: 'asc' | 'desc'
  /** 排序变化回调 */
  onSortChange?: (sortKey: string | null, sortOrder: 'asc' | 'desc') => void

  // ── 分页 ──
  /** 启用分页（默认 true） */
  pagination?: boolean
  /** 每页条数选项 */
  pageSizeOptions?: number[]
  /** 默认每页条数 */
  defaultPageSize?: number

  // ── 状态 ──
  /** 加载中 — 显示骨架屏 */
  loading?: boolean
  /** 空状态文案 */
  emptyText?: string
  /** 空状态图标名称或 ReactNode */
  emptyIcon?: string | React.ReactNode

  // ── 滚动 ──
  /** 使用 HoverScrollbar 模式 */
  useHoverScrollbar?: boolean
  /** HoverScrollbar 容器 className */
  scrollClassName?: string

  // ── 外观 ──
  /** 外层容器 className（覆盖默认） */
  containerClassName?: string
  /** 是否显示外层容器（默认 true） */
  showContainer?: boolean
  /** sticky 表头（默认 true） */
  stickyHeader?: boolean

  // ── 工具栏 ──
  /** 表格上方额外操作区 */
  extraActions?: React.ReactNode
  /** 表格下方自定义内容（汇总条等） */
  footer?: React.ReactNode

}

// ═══════════════════════════════════════════════════════════════════════════════
// 对齐修饰映射
// ═══════════════════════════════════════════════════════════════════════════════

const alignMap = {
  left: TABLE.cellLeft,
  center: TABLE.cellCenter,
  right: TABLE.cellRight,
}

// ═══════════════════════════════════════════════════════════════════════════════
// 骨架屏
// ═══════════════════════════════════════════════════════════════════════════════

function TableSkeleton({ columns, rows = 5 }: { columns: Column<never>[]; rows?: number }) {
  return (
    <div className={TABLE.container}>
      <table className={TABLE.table}>
        <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader}`}>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={TABLE.headerCell} style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={TABLE.bodyRow}>
              {columns.map(col => (
                <td key={col.key} className={TABLE.bodyCell}>
                  <div className="h-4 bg-slate-200 rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 空状态
// ═══════════════════════════════════════════════════════════════════════════════

function TableEmpty({
  colSpan,
  text,
  iconName,
}: {
  colSpan: number
  text: string
  iconName?: string | React.ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          {typeof iconName === 'string' ? (
            <Icon name={iconName} size={32} />
          ) : iconName ? (
            <div className="text-4xl">{iconName}</div>
          ) : null}
          <span className="text-sm">{text}</span>
        </div>
      </td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memoized 行组件
// ═══════════════════════════════════════════════════════════════════════════════

interface TableRowProps<T> {
  item: T
  index: number
  columns: Column<T>[]
  onClick?: (item: T) => void
  rowKeyStr: string
}

const TableRow = React.memo(function TableRow<T>({
  item,
  index,
  columns,
  onClick,
  rowKeyStr,
}: TableRowProps<T>) {
  return (
    <tr
      onClick={onClick ? () => onClick(item) : undefined}
      className={`${TABLE.bodyRow} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {columns.map(col => (
        <td
          key={col.key}
          className={`${TABLE.bodyCell} ${col.align ? alignMap[col.align] : ''}`}
        >
          {col.render
            ? col.render(item, index)
            : String((item as Record<string, unknown>)[col.key] ?? '-')}
        </td>
      ))}
    </tr>
  )
}) as <T>(props: TableRowProps<T>) => React.ReactElement

// ═══════════════════════════════════════════════════════════════════════════════
// 列头筛选下拉框 (createPortal)
// ═══════════════════════════════════════════════════════════════════════════════

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

function ColFilterDropdown({
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
      // 如果当前搜索结果全选了，则取消搜索结果中的所有项
      for (const v of filteredOptions) {
        if (checked.has(v)) onToggle(v)
      }
    } else {
      // 选中搜索结果中未选中的项
      for (const v of filteredOptions) {
        if (!checked.has(v)) onToggle(v)
      }
    }
  }

  const handleLabel = (value: string) => {
    // 如果有 filterOptions，使用 label 显示
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
        className={`ml-1 shrink-0 rounded p-0.5 transition-colors ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
        title={`筛选${col.title}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M0 0h10L6 4.5V9L4 10V4.5L0 0z" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[100] w-52 rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* 搜索框 */}
          <div className="p-1.5 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
            />
          </div>
          {/* 全选/清除按钮 */}
          <div className="flex gap-1 border-b border-slate-100 px-1.5 py-1">
            <button type="button" onClick={handleSelectAll}
              className="text-caption text-blue-600 hover:text-blue-800">
              {allChecked ? '取消全选' : '全选'}
            </button>
            <button type="button" onClick={onClear}
              className="text-caption text-slate-400 hover:text-slate-600">
              清除
            </button>
            {search.trim() && (
              <span className="ml-auto text-caption text-slate-400">
                {filteredOptions.length}/{options.length}
              </span>
            )}
          </div>
          {/* checkbox 列表 */}
          <div className="max-h-48 overflow-y-auto p-1">
            {options.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400">无可用值</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-400">无匹配结果</p>
            ) : (
              filteredOptions.map(v => (
                <label
                  key={v}
                  className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(v)}
                    onChange={() => onToggle(v)}
                    className="h-3 w-3 rounded border-slate-300 shrink-0"
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

// ═══════════════════════════════════════════════════════════════════════════════
// DataTable 组件
// ═══════════════════════════════════════════════════════════════════════════════

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
  emptyIcon,
  loading = false,
  extraActions,
  pageSizeOptions = [20, 50, 100],
  defaultPageSize = 20,
  useHoverScrollbar = false,
  scrollClassName = '',
  containerClassName = '',
  showContainer = true,
  stickyHeader = true,
  pagination: paginationProp,
  footer,
  defaultSortKey,
  defaultSortOrder = 'asc',
  onSortChange,
}: DataTableProps<T>) {
  const enablePagination = paginationProp !== false

  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})

  // 获取行唯一标识
  const getRowKey = useCallback(
    (item: T, index: number): string => {
      if (typeof rowKey === 'function') return rowKey(item)
      return String(item[rowKey] ?? index)
    },
    [rowKey],
  )

  // 排序
  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    return [...data].sort((a, b) => {
      if (col?.sorter) return sortOrder === 'asc' ? col.sorter(a, b) : col.sorter(b, a)
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [data, sortKey, sortOrder, columns])

  // 筛选
  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, s]) => s.size > 0)
    if (activeFilters.length === 0) return sortedData
    return sortedData.filter(item => {
      return activeFilters.every(([key, valueSet]) => {
        const col = columns.find(c => c.key === key)
        const accessor = col?.filterAccessor || ((i: T) => String((i as Record<string, unknown>)[key] ?? ''))
        const itemVal = accessor(item)
        return valueSet.has(itemVal)
      })
    })
  }, [sortedData, filters, columns])

  // 分页
  const paginatedData = useMemo(() => {
    if (!enablePagination || pageSize === 0) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize, enablePagination])

  const totalPages = enablePagination && pageSize > 0 ? Math.ceil(data.length / pageSize) : 1

  // 排序处理
  const handleSort = useCallback(
    (key: string) => {
      setSortKey(prev => {
        const nextKey = prev === key ? null : key
        const nextOrder = prev === key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
        setSortOrder(nextOrder)
        onSortChange?.(nextKey, nextOrder)
        return nextKey
      })
    },
    [sortOrder, onSortChange],
  )

  // 重置页码
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1)
  }, [data.length, totalPages, currentPage])

  // 同步分页到状态栏
  const setStatusBarInfo = useStatusStore(s => s.setInfo)
  useEffect(() => {
    if (data.length > 0 && enablePagination) {
      const start = pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 1
      const end = pageSize > 0 ? Math.min(currentPage * pageSize, data.length) : data.length
      setStatusBarInfo({ total: data.length, start, end })
    } else if (data.length > 0) {
      setStatusBarInfo({ total: data.length, start: 1, end: data.length })
    } else {
      setStatusBarInfo(null)
    }
    return () => setStatusBarInfo(null)
  }, [data.length, currentPage, pageSize, enablePagination, setStatusBarInfo])

  // 筛选操作回调
  const handleFilterToggle = useCallback((colKey: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev }
      const set = new Set(next[colKey] || [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      next[colKey] = set
      return next
    })
  }, [])

  const handleFilterSelectAll = useCallback((colKey: string, allValues: string[]) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set(allValues),
    }))
  }, [])

  const handleFilterClear = useCallback((colKey: string) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set<string>(),
    }))
  }, [])

  // ── Loading 骨架屏 ──
  if (loading) return <TableSkeleton columns={columns} />

  // ── 表格主体 ──
  const theadClasses = `${TABLE.headerRow} ${stickyHeader ? TABLE.stickyHeader : ''}`

  const tableElement = (
    <table className={TABLE.table}>
      <thead className={theadClasses}>
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              className={`${TABLE.headerCell} ${col.align ? alignMap[col.align] : ''} ${col.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
              style={{ width: col.width }}
              onClick={() => col.sortable && handleSort(col.key)}
            >
              <span className="inline-flex items-center gap-1">
                {col.headerRender ?? col.title}
                {col.sortable && (
                  <span className="text-slate-400 text-caption">
                    {sortKey === col.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                )}
                {col.filterable && (
                  <ColFilterDropdown
                    col={col as Column<unknown>}
                    data={data as unknown[]}
                    checked={filters[col.key] || new Set<string>()}
                    onToggle={(v) => handleFilterToggle(col.key, v)}
                    onSelectAll={() => {
                      // 提取该列的所有唯一值
                      const accessor = col.filterAccessor || ((item: unknown) => String((item as Record<string, unknown>)[col.key] ?? ''))
                      const vals = new Set<string>()
                      for (const item of data) {
                        const v = accessor(item as T)
                        if (v) vals.add(v)
                      }
                      handleFilterSelectAll(col.key, Array.from(vals))
                    }}
                    onClear={() => handleFilterClear(col.key)}
                    isActive={(filters[col.key]?.size ?? 0) > 0}
                  />
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paginatedData.length > 0 ? (
          paginatedData.map((item, index) => (
            <TableRow
              key={getRowKey(item, index)}
              item={item}
              index={index}
              columns={columns}
              onClick={onRowClick}
              rowKeyStr={getRowKey(item, index)}
            />
          ))
        ) : (
          <TableEmpty colSpan={columns.length} text={emptyText} iconName={emptyIcon} />
        )}
      </tbody>
    </table>
  )

  // ── 包装层 ──
  const containerClasses = showContainer
    ? `${TABLE.container} ${containerClassName}`
    : containerClassName || 'overflow-hidden'

  return (
    <div className={`flex flex-col h-full ${containerClasses}`}>
      {/* 工具栏 */}
      {extraActions && (
        <div className="flex items-center justify-end px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">{extraActions}</div>
        </div>
      )}

      {/* 表格区域 */}
      <div className="flex-1 overflow-hidden min-h-0">
        {useHoverScrollbar ? (
          <HoverScrollbar className={`h-full ${scrollClassName}`}>
            <div className="min-h-full">{tableElement}</div>
          </HoverScrollbar>
        ) : (
          <div className="h-full overflow-auto">{tableElement}</div>
        )}
      </div>

      {/* 底部汇总 */}
      {footer && <div className="border-t border-slate-200">{footer}</div>}

      {/* 分页 */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">每页</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1 border border-slate-300 rounded text-sm bg-white"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-500">条</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            <span className="px-2 text-sm text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TableCell 辅助组件（Phase 2 迁移后移除）
// ═══════════════════════════════════════════════════════════════════════════════

export const TableCell = {
  Text: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Badge: ({
    children,
    color = 'primary',
  }: {
    children: React.ReactNode
    color?: string
  }) => {
    const colors: Record<string, string> = {
      primary: 'bg-primary-100 text-primary-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      gray: 'bg-slate-100 text-slate-700',
      blue: 'bg-blue-100 text-blue-700',
    }
    return (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[color] || colors.primary}`}
      >
        {children}
      </span>
    )
  },
  Actions: ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-1">{children}</div>
  ),
}
