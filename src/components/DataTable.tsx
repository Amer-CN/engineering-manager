import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HoverScrollbar } from './ui/HoverScrollbar'
import { Icon } from './ui/Icon'
import { TABLE } from '@/constants/table'
import { useStatusStore } from '@/store/statusStore'
import { TableSkeleton, TableEmpty, TableRow } from './DataTable/TableParts'
import { ColFilterDropdown } from './DataTable/ColFilterDropdown'
import { TableCell } from './DataTable/TableCell'

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

// ═══════════════════════════════════════════════════════════════════════════════
// 空状态
// ═══════════════════════════════════════════════════════════════════════════════

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

  // v0.75.0: 抽出 sort / filter / pagination 状态管理到 useDataTableState hook
  const {
    sortKey, sortOrder, currentPage, pageSize, filters, setFilters,
    sortedData, filteredData, paginatedData, totalPages,
    setCurrentPage, setPageSize,
    handleSort, handleFilterChange,
  } = useDataTableState(
    data, columns, defaultSortKey, defaultSortOrder,
    enablePagination, defaultPageSize, onSortChange,
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