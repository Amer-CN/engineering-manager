import { useMemo, useState, type CSSProperties } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getGroupedRowModel, getExpandedRowModel, flexRender,
  type ColumnDef, type Column as TCol, type SortingState, type GroupingState,
} from '@tanstack/react-table'
import { getAPI } from '@/services/api-adapter'
import { fmtMoney } from './gridColumns'
import { EditableCell } from './EditableCell'
import type { CostLedgerEntry } from '@/types'

// 冻结列 sticky 定位
function pinStyle<T>(column: TCol<T, unknown>): CSSProperties {
  const p = column.getIsPinned()
  if (!p) return {}
  return {
    position: 'sticky',
    left:  p === 'left'  ? column.getStart('left')  : undefined,
    right: p === 'right' ? column.getAfter('right') : undefined,
    zIndex: 1,
    background: 'var(--card, #fff)',
  }
}

export function CostLedgerGrid({ rows, onChanged }: { rows: CostLedgerEntry[]; onChanged: () => void }) {
  const [data, setData] = useState<CostLedgerEntry[]>(rows)
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])  // 例：['direction'] 或 ['category']

  const columns = useMemo<ColumnDef<CostLedgerEntry>[]>(() => [
    { id: 'voucherNo', accessorKey: 'voucherNo', header: '凭证号', enableSorting: true },
    { id: 'date', accessorKey: 'date', header: '日期', enableSorting: true, meta: { editable: true, editType: 'date' } },
    { id: 'direction', accessorKey: 'direction', header: '方向',
      cell: (i) => (i.getValue() === 'expense' ? '支出' : '收入'), enableGrouping: true },
    { id: 'category', accessorKey: 'category', header: '分类', enableGrouping: true, meta: { editable: true } },
    { id: 'counterparty', accessorKey: 'counterparty', header: '往来单位/个人', meta: { editable: true } },
    { id: 'channel', accessorKey: 'channel', header: '渠道', meta: { editable: true } },
    { id: 'amount', accessorKey: 'amount', header: '金额',
      aggregationFn: 'sum',                                   // 按「分」求和
      aggregatedCell: (i) => <strong>{fmtMoney(i.getValue())}</strong>,
      meta: { align: 'right', editable: true, money: true,
        cellClass: (_v, row) => (row.direction === 'expense' ? 'text-red-600' : 'text-emerald-600') } }, // 条件格式
    { id: 'summary', accessorKey: 'summary', header: '摘要', meta: { editable: true } },
    { id: 'notes', accessorKey: 'notes', header: '备注', meta: { editable: true } },
    { id: 'actions', header: '操作', cell: (i) => <RowActions row={i.row.original} /> },
  ], [])

  const table = useReactTable({
    data, columns,
    getRowId: (row) => String(row.id),   // 让 row.id === 业务 id，updateCell 的 findIndex 才能命中
    state: { sorting, grouping },
    initialState: { columnPinning: { left: ['voucherNo', 'date'], right: ['actions'] } }, // 冻结列
    defaultColumn: { cell: EditableCell as ColumnDef<CostLedgerEntry>['cell'] },                    // 默认走可编辑单元格
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    meta: {
      // 内联保存：合并成完整 CostLedgerEntry → PUT /api/cost-ledger
      updateCell: async (rowId, columnId, value) => {
        const idx = data.findIndex(r => String(r.id) === rowId)
        if (idx < 0) return
        const prev = data[idx]
        const updated = { ...prev, [columnId]: value } as CostLedgerEntry
        setData(d => d.map((r, i) => (i === idx ? updated : r)))     // 乐观更新
        const api = await getAPI()
        const res = await api?.updateCostLedger?.(updated)           // api-adapter: updateCostLedger(entry: CostLedgerEntry)
        if (!res?.success) { setData(d => d.map((r, i) => (i === idx ? prev : r))) /* + toast 回滚 */ }
        else onChanged()                                            // 刷新小计/合计/dashboard
      },
    },
  })

  return (
    <div className="overflow-auto h-full">
      {/* 分组切换按钮：setGrouping(['direction']) / ['category'] / [] */}
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} style={pinStyle(h.column)}
                    className="px-2 py-2 text-left border-b border-slate-200 select-none">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getCanSort() && (
                    <button onClick={h.column.getToggleSortingHandler()} className="ml-1 text-slate-400">
                      {{ asc: '↑', desc: '↓' }[h.column.getIsSorted() as string] ?? '↕'}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className={row.getIsGrouped() ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} style={pinStyle(cell.column)}
                    className={`px-2 py-1.5 border-b border-slate-100 ${cell.column.columnDef.meta?.align === 'right' ? 'text-right' : ''}`}>
                  {cell.getIsGrouped() ? (
                    // 分组表头行：展开按钮 + 组值 + 组内条数
                    <button onClick={row.getToggleExpandedHandler()} className="inline-flex items-center gap-1">
                      {row.getIsExpanded() ? '▾' : '▸'}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                    </button>
                  ) : cell.getIsAggregated() ? (
                    flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext()) // 小计
                  ) : cell.getIsPlaceholder() ? null
                    : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {/* 总合计：用 footer 位，按分求和再 fmtMoney */}
        <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
          <tr>
            <td className="px-2 py-2" colSpan={6}>合计</td>
            <td className="px-2 py-2 text-right">{fmtMoney(data.reduce((s, r) => s + (r.amount || 0), 0))}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function RowActions({ row }: { row: CostLedgerEntry }) { /* 编辑弹窗/删除，沿用现有逻辑 */ return null }
