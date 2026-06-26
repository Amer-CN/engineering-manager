import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { HoverScrollbar } from './ui/HoverScrollbar'
import { TABLE } from '@/constants/table'
import { TableSkeleton, TableEmpty, TableRow } from './DataTable/TableParts'
import { ColFilterDropdown } from './DataTable/ColFilterDropdown'
import { useDataTableState } from '@/hooks/useDataTableState'
import { useDataTableFilters } from '@/hooks/useDataTableFilters'

// v0.77.0: 类型和常量已拆到 DataTable/types.ts + DataTable/consts.ts
import type { Column, DataTableProps, TableRowProps, ColFilterDropdownProps } from './DataTable/types'
export type { Column, DataTableProps, TableRowProps, ColFilterDropdownProps }
import { alignMap } from './DataTable/consts'

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
  // 内部 helper: rowKey 可能是 string (字段名) 或 function, 统一返回 string
  const getRowKey = (item: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(item)
    return String(item[rowKey as keyof T] ?? index)
  }


  // v0.75.0: 抽出 sort / filter / pagination 状态管理到 useDataTableState hook
  const {
    sortKey, sortOrder, currentPage, pageSize, filters, setFilters,
    paginatedData, totalPages,
    setCurrentPage, setPageSize,
    handleSort,
  } = useDataTableState(
    data, columns, defaultSortKey, defaultSortOrder,
    enablePagination, defaultPageSize, onSortChange,
  )

  // v0.75.0: 抽出筛选操作回调到 useDataTableFilters hook
  const {
    handleFilterToggle,
    handleFilterSelectAll,
    handleFilterClear,
  } = useDataTableFilters(setFilters)

  // 虚拟化: 行数 > 50 时启用
  const ROW_HEIGHT = 44
  const parentRef = useRef<HTMLDivElement>(null)
  const enableVirtualization = paginatedData.length > 50
  const virtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })


  // 重置页码
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1)
  }, [data.length, totalPages, currentPage])

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
        {enableVirtualization ? (
          <tr>
            <td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
              <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '60vh' }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map(virtualRow => {
                    const item = paginatedData[virtualRow.index]
                    return (
                      <div
                        key={getRowKey(item, virtualRow.index)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: ROW_HEIGHT,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className={`${TABLE.bodyRow} ${onRowClick ? 'cursor-pointer' : ''}`}
                        onClick={() => onRowClick?.(item)}
                      >
                        <div className="flex">
                          {columns.map(col => (
                            <div
                              key={col.key}
                              className={`${TABLE.bodyCell} ${col.align ? alignMap[col.align] : ''}`}
                              style={{ width: col.width, minWidth: col.width ? undefined : 0, flex: col.width ? undefined : 1 }}
                            >
                              {col.render ? col.render(item, virtualRow.index) : String((item as Record<string, unknown>)[col.key] ?? '-')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </td>
          </tr>
        ) : (
          paginatedData.length > 0 ? (
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
          )
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