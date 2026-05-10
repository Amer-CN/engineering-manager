import React from 'react'

export interface TableColumn<T> {
  key: string
  title: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, record: T, index: number) => React.ReactNode
  sortable?: boolean
  sorter?: (a: T, b: T) => number
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  rowKey: keyof T | ((record: T) => string | number)
  loading?: boolean
  bordered?: boolean
  hoverable?: boolean
  compact?: boolean
  size?: 'default' | 'compact' | 'spacious'
  stickyHeader?: boolean
  emptyText?: React.ReactNode
  onRowClick?: (record: T, index: number) => void
  className?: string
}

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const paddingStyles = {
  compact: 'px-3 py-2',
  default: 'px-4 py-3',
  spacious: 'px-5 py-4',
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading = false,
  bordered = false,
  hoverable = true,
  compact = false,
  size,
  stickyHeader = false,
  emptyText = '暂无数据',
  onRowClick,
  className = '',
}: TableProps<T>) {
  const resolvedSize = size || (compact ? 'compact' : 'default')

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return String(rowKey(record))
    }
    return String(record[rowKey] ?? index)
  }

  const renderCell = (column: TableColumn<T>, record: T, rowIndex: number) => {
    const value = record[column.key as keyof T]
    if (column.render) {
      return column.render(value, record, rowIndex)
    }
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return (
    <div className={`overflow-hidden rounded-xl ${bordered ? 'border border-slate-200' : 'border border-slate-200'} ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-slate-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${alignStyles[column.align || 'left']}
                    ${paddingStyles[resolvedSize]}
                    text-xs font-semibold text-slate-600 uppercase tracking-wider
                    border-b border-slate-200
                    whitespace-nowrap
                  `}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skel-${index}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`${alignStyles[column.align || 'left']} ${paddingStyles[resolvedSize]}`}
                    >
                      <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={`
                    ${hoverable ? 'hover:bg-slate-50:bg-slate-700/50' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    transition-colors
                  `}
                  onClick={() => onRowClick?.(record, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        ${alignStyles[column.align || 'left']}
                        ${paddingStyles[resolvedSize]}
                        text-sm text-slate-700
                      `}
                    >
                      {renderCell(column, record, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
