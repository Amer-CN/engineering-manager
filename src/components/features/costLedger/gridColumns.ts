import type { ColumnDef } from '@tanstack/react-table'
import type { Column } from '@/components/DataTable/types'
import { formatMoney } from '@/utils/format'

// ── 用 module augmentation 给 meta / tableMeta 补类型 ──
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
    editable?: boolean
    editType?: 'text' | 'number' | 'date' | 'select'
    /** 标记金额列。CostLedger amount 以「元」存储（SQLite REAL），非分。 */
    money?: boolean
    cellClass?: (value: unknown, row: TData) => string
  }
  interface TableMeta<TData> {
    updateCell: (rowId: string, columnId: string, value: unknown) => void
  }
}

// 金额格式化（元 → 显示文本），复用 utils/format.ts
export const fmtMoney = (yuan: unknown) => formatMoney(Number(yuan) || 0)

// 现有 Column<T> → TanStack ColumnDef<T> 适配
export function toColumnDef<T>(col: Column<T>): ColumnDef<T> {
  return {
    id: col.key, accessorKey: col.key as never,
    header: () => col.headerRender ?? col.title,
    cell: col.render ? (info) => col.render!(info.row.original, info.row.index) : (info) => String(info.getValue() ?? '-'),
    enableSorting: !!col.sortable,
    sortingFn: col.sorter ? (a, b) => col.sorter!(a.original, b.original) : 'auto',
    size: col.width && /^\d+/.test(col.width) ? parseInt(col.width) : undefined,
    meta: { align: col.align },
  }
}
