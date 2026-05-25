import React, { useState, useMemo, useCallback } from 'react'

export type ViewMode = 'card' | 'table'

export interface Column<T> {
  key: string
  title: string
  width?: string
  sortable?: boolean
  render?: (item: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  /** 数据列表 */
  data: T[]
  /** 列配置 */
  columns: Column<T>[]
  /** 主键字段 */
  rowKey: keyof T | ((item: T) => string)
  /** 卡片渲染函数 */
  renderCard?: (item: T, index: number) => React.ReactNode
  /** 表格行点击 */
  onRowClick?: (item: T) => void
  /** 空状态文案 */
  emptyText?: string
  /** 空状态图标 */
  emptyIcon?: React.ReactNode
  /** 加载状态 */
  loading?: boolean
  /** 额外操作按钮（卡片模式） */
  extraActions?: React.ReactNode
  /** 每页条数选项 */
  pageSizeOptions?: number[]
  /** 默认每页条数 */
  defaultPageSize?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// Memoized 行组件 — 避免整表重渲染时每行都重建
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
      className={`table-row-hover ${onClick ? 'cursor-pointer' : ''}`}
    >
      {columns.map(col => (
        <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
          {col.render
            ? col.render(item, index)
            : String((item as any)[col.key] ?? '-')}
        </td>
      ))}
    </tr>
  )
}) as <T>(props: TableRowProps<T>) => React.ReactElement

// ═══════════════════════════════════════════════════════════════════════════════
// DataTable 组件
// ═══════════════════════════════════════════════════════════════════════════════

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  emptyText = '暂无数据',
  emptyIcon = '📭',
  loading = false,
  extraActions,
  pageSizeOptions = [20, 50, 100],
  defaultPageSize = 20
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 获取行唯一标识
  const getRowKey = useCallback((item: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(item)
    }
    return String(item[rowKey] ?? index)
  }, [rowKey])

  // 排序（useMemo 缓存，仅在 data/sortKey/sortOrder 变化时重算）
  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey]
      const bVal = (b as any)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data, sortKey, sortOrder])

  // 分页（useMemo 缓存）
  const paginatedData = useMemo(() => {
    if (pageSize === 0) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // 排序处理
  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
      } else {
        setSortOrder('asc')
      }
      return key
    })
  }, [])

  // 总页数
  const totalPages = pageSize > 0 ? Math.ceil(data.length / pageSize) : 1

  // 重置页码当数据变化时
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [data.length, totalPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-sm text-slate-500">
          共 {data.length} 条数据
          {pageSize > 0 && `，显示 ${Math.min((currentPage - 1) * pageSize + 1, data.length)}-${Math.min(currentPage * pageSize, data.length)} 条`}
        </div>
        <div className="flex items-center gap-3">
          {extraActions}
        </div>
      </div>

      {/* 表格视图 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                    }`}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.title}
                      {col.sortable && (
                        <span className="text-slate-400">
                          {sortKey === col.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
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
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                    {emptyIcon && <div className="text-4xl mb-2">{emptyIcon}</div>}
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">每页显示</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 border border-slate-300 rounded text-sm"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size} 条</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                首页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>

              <span className="px-3 py-1 text-sm">
                第 {currentPage} / {totalPages} 页
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                末页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 表格单元格组件
export const TableCell = {
  Text: ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Badge: ({ children, color = 'primary' }: { children: React.ReactNode; color?: string }) => {
    const colors: Record<string, string> = {
      primary: 'bg-primary-100 text-primary-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      gray: 'bg-slate-100 text-slate-700',
      blue: 'bg-blue-100 text-blue-700'
    }
    return (
      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[color] || colors.primary}`}>
        {children}
      </span>
    )
  },
  Icon: ({ icon }: { icon: string }) => <span className="mr-1">{icon}</span>,
  Actions: ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-1">{children}</div>
  ),
  Checkbox: ({
    checked,
    onChange
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 text-primary-600 rounded"
    />
  )
}
