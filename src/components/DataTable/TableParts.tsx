import React from 'react'
import { Icon } from '../ui/Icon'
import { TABLE } from '@/constants/table'
import type { Column } from '../DataTable'

/**
 * DataTable 辅助组件（v1.1.0 拆分自 DataTable.tsx）
 * - TableSkeleton: 加载骨架屏
 * - TableEmpty: 空状态
 * - TableRow: 记忆化行组件
 */

/** 加载骨架屏 */
export function TableSkeleton({ columns, rows = 5 }: { columns: Column<never>[]; rows?: number }) {
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

/** 空状态 */
export function TableEmpty({
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

const alignMap: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

interface TableRowProps<T> {
  item: T
  index: number
  columns: Column<T>[]
  onClick?: (item: T) => void
  rowKeyStr: string
}

/** 记忆化行组件 */
export const TableRow = React.memo(function TableRow<T>({
  item,
  index,
  columns,
  onClick,
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
