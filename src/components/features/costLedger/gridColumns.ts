import type { ColumnDef } from '@tanstack/react-table'
import type { Column } from '@/components/DataTable/types'
import { formatMoney } from '@/utils/format'

// ── 用 module augmentation 给 meta / tableMeta 补类型 ──
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
    editable?: boolean
    editType?: 'text' | 'number' | 'date' | 'select'
    /**
     * 标记金额列。
     *
     * ⚠️ CostLedger 的 amount 字段以「元」存储（SQLite REAL / C# double?），
     *    而非项目其余模块的 INTEGER(分)。这是历史遗留，迁移到分不在本阶段范围。
     *    money=true 时：
     *    - 显示：调用 formatMoney(value)（与旧表格 formatMoney(entry.amount) 完全一致）
     *    - 编辑：输入框直接显示/输入元值，parseFloat 直通，不做任何 ×100 / ÷100
     *    - 聚合：TanStack aggregationFn='sum' 对原始元值求和，再 formatMoney 显示
     */
    money?: boolean
    cellClass?: (value: unknown, row: TData) => string
  }
  interface TableMeta<TData> {
    updateCell: (rowId: string, columnId: string, value: unknown) => void
  }
}

// ── 金额格式化（元 → 显示文本）──
// 直接复用 utils/format.ts 的 formatMoney，确保新旧表格显示完全一致。
export const fmtMoney = (yuan: unknown) => formatMoney(Number(yuan) || 0)

// ── 现有 Column<T> → TanStack ColumnDef<T> 适配 ──
export function toColumnDef<T>(col: Column<T>): ColumnDef<T> {
  return {
    id: col.key,
    accessorKey: col.key as never,
    header: () => col.headerRender ?? col.title,
    cell: col.render
      ? (info) => col.render!(info.row.original, info.row.index)
      : (info) => String(info.getValue() ?? '-'),
    enableSorting: !!col.sortable,
    sortingFn: col.sorter ? (a, b) => col.sorter!(a.original, b.original) : 'auto',
    size: col.width && /^\d+/.test(col.width) ? parseInt(col.width) : undefined,
    meta: { align: col.align },
  }
}
