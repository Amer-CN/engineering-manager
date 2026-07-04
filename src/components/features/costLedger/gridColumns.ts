import type { ColumnDef } from '@tanstack/react-table'
import type { Column } from '@/components/DataTable/types'

// ── 用 module augmentation 给 meta / tableMeta 补类型 ──
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
    editable?: boolean
    editType?: 'text' | 'number' | 'date' | 'select'
    money?: boolean                       // 值以「分」存储；编辑/显示用「元」
    cellClass?: (value: unknown, row: TData) => string   // 条件格式
  }
  interface TableMeta<TData> {
    updateCell: (rowId: string, columnId: string, value: unknown) => void
  }
}

// ── 金额：分 → 元显示 ──
export const fmtMoney = (fen: unknown) =>
  ((Number(fen) || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── 现有 Column<T> → TanStack ColumnDef<T> 适配 ──
// 迁移期用它把旧列定义直接搬过来；需要冻结/编辑/聚合的列再单独手写覆盖 meta。
export function toColumnDef<T>(col: Column<T>): ColumnDef<T> {
  return {
    id: col.key,
    accessorKey: col.key as never,
    header: () => col.headerRender ?? col.title,
    // 保留你原来的 render；没有就默认取值
    cell: col.render
      ? (info) => col.render!(info.row.original, info.row.index)
      : (info) => String(info.getValue() ?? '-'),
    enableSorting: !!col.sortable,
    sortingFn: col.sorter ? (a, b) => col.sorter!(a.original, b.original) : 'auto',
    // ⚠️ Column.width 是 CSS 字符串，TanStack size 要 number(px)；无法解析就留空走默认
    size: col.width && /^\d+/.test(col.width) ? parseInt(col.width) : undefined,
    meta: { align: col.align },
  }
}
