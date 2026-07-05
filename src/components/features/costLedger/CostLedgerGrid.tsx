// TODO（重新上线前必须补齐）：
//   1. 分组入口 UI（当前 grouping state 存在但无切换按钮）
//   2. loading / 空状态 / 错误提示
//   3. 列宽自适应（当前走 table-fixed + size 粗略值）
//   4. 主题适配（三主题系统 White / Graphite / Sandstone）
//   5. 导入/导出/打印（Toolbar 已包含按钮，但 Grid 未接线 zoom → style.zoom 已通）
//
// 本阶段已补齐：
//   ✓ 金额口径统一（元，与旧表格 formatMoney 完全一致）
//   ✓ 旧版筛选体系接回（useCostLedgerFilters + CostLedgerListToolbar + ColumnFilter）
//   ✓ 操作列恢复（编辑 → onEdit 弹窗 / 删除 → confirm + API + toast）

import { useState, useMemo, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getGroupedRowModel, getExpandedRowModel, flexRender,
  type ColumnDef, type Column as TCol, type SortingState, type GroupingState,
} from '@tanstack/react-table'
import { getAPI } from '@/services/api-adapter'
import { fmtMoney } from './gridColumns'
import { EditableCell } from './EditableCell'
import { useCostLedgerFilters } from './useCostLedgerFilters'
import { CostLedgerListToolbar } from './CostLedgerListToolbar'
import { ColumnFilter, type ColValues } from './ColumnFilter'
import { DIRECTION_CONFIG, getCategoryDisplayLabel, getLevel1Color, isCategoryMissing } from './config'
import { normalizeDate } from '@/utils/date'
import { formatMoney } from '@/utils/format'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { TABLE } from '@/constants/table'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

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

interface CostLedgerGridProps {
  rows: CostLedgerEntry[]
  categories?: CostLedgerCategory[] | null
  onEdit: (entry: CostLedgerEntry) => void
  onChanged: () => void
}

export function CostLedgerGrid({ rows, categories, onEdit, onChanged }: CostLedgerGridProps) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()

  const [data, setData] = useState<CostLedgerEntry[]>(rows)
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])

  // 同步外部 rows → 内部 data（父组件 load() 后刷新）
  useEffect(() => { setData(rows) }, [rows])

  // ── 旧版筛选体系（复用 useCostLedgerFilters）──
  const {
    filter, categoryFilter, categoryLevel,
    checkedCounterparties, checkedChannels, checkedVoucherNos,
    checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts,
    colValues, filtered, activeFilters,
    setFilter, setCategoryFilter, setCategoryLevel: setCategoryLevelAndReset,
    makeToggle, makeSetAll, makeClear, clearAll,
    setCheckedCounterparties, setCheckedChannels, setCheckedVoucherNos,
    setCheckedSummaries, setCheckedNotesSet, setCheckedDates, setCheckedAmounts,
  } = useCostLedgerFilters(data, categories)

  // 缩放（与旧表格共用 localStorage key，确保切换时一致）
  const zoomRef = useRef(parseFloat(localStorage.getItem('costLedgerZoom') || '1.1'))
  const tableRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(zoomRef.current)

  // 筛选后的汇总（与旧表格 CostLedgerList 一致）
  const filterSummary = useMemo(() => {
    let totalExpense = 0, totalIncome = 0
    for (const e of filtered) {
      if (e.direction === 'expense') totalExpense += e.amount
      else totalIncome += e.amount
    }
    return { totalExpense, totalIncome, count: filtered.length }
  }, [filtered])

  const filterCols = ['voucherNo', 'date', 'counterparty', 'channel', 'amount', 'summary', 'notes']

  // 行删除（confirm + API + toast + 回调）
  const handleRowDelete = useCallback(async (id: number) => {
    const ok = await confirm({ title: '确认删除', content: '确认删除这条台账记录？', confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api?.deleteCostLedger?.(id)
    if (res?.success) {
      showToast('已删除', 'success')
      onChanged()
    } else {
      showToast(res?.error || '删除失败', 'error')
    }
  }, [confirm, showToast, onChanged])

  const columns = useMemo<ColumnDef<CostLedgerEntry>[]>(() => [
    { id: 'voucherNo', accessorKey: 'voucherNo', header: '凭证号', enableSorting: true },
    {
      id: 'date', accessorKey: 'date', header: '日期', enableSorting: true,
      meta: { editable: true, editType: 'date' },
      cell: (i) => normalizeDate(i.getValue() as string),
    },
    {
      id: 'direction', accessorKey: 'direction', header: '方向', enableGrouping: true,
      cell: (i) => {
        const dir = DIRECTION_CONFIG[i.getValue() as string]
        return dir ? <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${dir.bg} ${dir.color}`}>{dir.label}</span> : '-'
      },
    },
    {
      id: 'category', accessorKey: 'category', header: '分类', enableGrouping: true,
      meta: { editable: true },
      cell: (i) => (
        <span className="line-clamp-2">
          {categoryLevel === 'level1' && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: getLevel1Color(i.row.original.category, categories) }} />
          )}
          {getCategoryDisplayLabel(i.row.original.category, categoryLevel, categories)}
          {isCategoryMissing(i.row.original.category, categories) && (
            <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 text-caption">已删</span>
          )}
        </span>
      ),
    },
    { id: 'counterparty', accessorKey: 'counterparty', header: '往来单位/个人', meta: { editable: true } },
    { id: 'channel', accessorKey: 'channel', header: '渠道', meta: { editable: true } },
    {
      id: 'amount', accessorKey: 'amount', header: '金额',
      aggregationFn: 'sum',                                   // 按「元」求和（amount 以元存储，非分）
      aggregatedCell: (i) => <strong>{fmtMoney(i.getValue())}</strong>,
      cell: (i) => {
        const v = i.getValue() as number
        const isExpense = i.row.original.direction === 'expense'
        return <span className={isExpense ? 'text-red-600' : 'text-emerald-600'}>{isExpense ? '-' : '+'}{formatMoney(v)}</span>
      },
      meta: { align: 'right', editable: true, money: true,
        cellClass: (_v, row) => (row.direction === 'expense' ? 'text-red-600' : 'text-emerald-600') },
    },
    { id: 'summary', accessorKey: 'summary', header: '摘要', meta: { editable: true } },
    { id: 'notes', accessorKey: 'notes', header: '备注', meta: { editable: true } },
    {
      id: 'actions', header: '操作',
      cell: (i) => <RowActions row={i.row.original} onEdit={onEdit} onDelete={handleRowDelete} />,
    },
  ], [categories, categoryLevel, onEdit, handleRowDelete])

  const table = useReactTable({
    data: filtered,        // ← 使用筛选后的数据（而非原始 data）
    columns,
    state: { sorting, grouping },
    initialState: { columnPinning: { left: ['voucherNo', 'date'], right: ['actions'] } },
    defaultColumn: { cell: EditableCell as ColumnDef<CostLedgerEntry>['cell'] },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => String(row.id),
    meta: {
      // 内联保存：合并成完整 CostLedgerEntry → PUT /api/cost-ledger
      // amount 以「元」直通，不做任何 ×100 / ÷100 转换
      updateCell: async (rowId, columnId, value) => {
        const idx = data.findIndex(r => String(r.id) === rowId)
        if (idx < 0) return
        const prev = data[idx]
        const updated = { ...prev, [columnId]: value } as CostLedgerEntry
        setData(d => d.map((r, i) => (i === idx ? updated : r)))     // 乐观更新
        const api = await getAPI()
        // tauri-bridge: updateCostLedger(entry: CostLedgerEntry) → PUT /api/cost-ledger
        const res = await api?.updateCostLedger?.(updated)
        if (!res?.success) {
          setData(d => d.map((r, i) => (i === idx ? prev : r)))     // 回滚
          showToast(res?.error || '保存失败', 'error')
        } else {
          onChanged()                                                // 刷新小计/合计/dashboard
        }
      },
    },
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {ConfirmDialog}
      {/* 旧版 Toolbar：方向/分类/缩放/打印/导出 */}
      <CostLedgerListToolbar
        filter={filter} categoryFilter={categoryFilter} categoryLevel={categoryLevel}
        setFilter={setFilter} setCategoryFilter={setCategoryFilter} setCategoryLevelAndReset={setCategoryLevelAndReset}
        clearAll={clearAll} activeFilters={activeFilters} categories={categories}
        filtered={filtered} entries={data} filterSummary={filterSummary}
        zoomRef={zoomRef} tableRef={tableRef} zoom={zoom} setZoom={setZoom}
      />

      <HoverScrollbar className="flex-1 min-h-0">
        <div ref={tableRef} style={{ zoom }}>
          <table className="w-full table-fixed">
            <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader} text-xs`}>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => {
                    const colId = h.column.id
                    return (
                      <th key={h.id} style={pinStyle(h.column)}
                          className={`${TABLE.headerCell} ${h.column.columnDef.meta?.align === 'right' ? 'text-right' : ''}`}>
                        <div className="flex items-center">
                          {h.isPlaceholder ? null : (
                            <span className="cursor-pointer hover:text-slate-700 select-none"
                                  onClick={h.column.getToggleSortingHandler()}>
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {h.column.getIsSorted() ? (h.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓') : ''}
                            </span>
                          )}
                          {filterCols.includes(colId) && (
                            <ColumnFilter
                              col={colId}
                              colValues={colValues as unknown as ColValues}
                              checkedCounterparties={checkedCounterparties}
                              checkedChannels={checkedChannels}
                              checkedVoucherNos={checkedVoucherNos}
                              checkedSummaries={checkedSummaries}
                              checkedNotesSet={checkedNotesSet}
                              checkedDates={checkedDates}
                              checkedAmounts={checkedAmounts}
                              onToggleCounterparty={makeToggle(setCheckedCounterparties)}
                              onToggleChannel={makeToggle(setCheckedChannels)}
                              onToggleVoucherNo={makeToggle(setCheckedVoucherNos)}
                              onToggleSummary={makeToggle(setCheckedSummaries)}
                              onToggleNote={makeToggle(setCheckedNotesSet)}
                              onToggleDate={makeToggle(setCheckedDates)}
                              onToggleAmount={makeToggle(setCheckedAmounts)}
                              onSetAllCounterparties={makeSetAll(setCheckedCounterparties)}
                              onSetAllChannels={makeSetAll(setCheckedChannels)}
                              onSetAllVoucherNos={makeSetAll(setCheckedVoucherNos)}
                              onSetAllSummaries={makeSetAll(setCheckedSummaries)}
                              onSetAllNotes={makeSetAll(setCheckedNotesSet)}
                              onSetAllDates={makeSetAll(setCheckedDates)}
                              onSetAllAmounts={makeSetAll(setCheckedAmounts)}
                              onClearCounterparties={makeClear(setCheckedCounterparties)}
                              onClearChannels={makeClear(setCheckedChannels)}
                              onClearVoucherNos={makeClear(setCheckedVoucherNos)}
                              onClearSummaries={makeClear(setCheckedSummaries)}
                              onClearNotes={makeClear(setCheckedNotesSet)}
                              onClearDates={makeClear(setCheckedDates)}
                              onClearAmounts={makeClear(setCheckedAmounts)}
                            />
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                    无匹配结果，请调整筛选条件
                  </td>
                </tr>
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id}
                    className={`border-b border-slate-100 text-sm table-row-hover ${row.getIsGrouped() ? 'bg-slate-100 font-medium' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={pinStyle(cell.column)}
                        className={`px-3 py-2 ${cell.column.columnDef.meta?.align === 'right' ? 'text-right' : ''}`}>
                      {cell.getIsGrouped() ? (
                        <button onClick={row.getToggleExpandedHandler()} className="inline-flex items-center gap-1">
                          {row.getIsExpanded() ? '▾' : '▸'}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                        </button>
                      ) : cell.getIsAggregated() ? (
                        flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                      ) : cell.getIsPlaceholder() ? null
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {/* 总合计：按元求和再 formatMoney，与旧表格底部栏一致 */}
            <tfoot className="sticky bottom-0 bg-slate-50 font-semibold border-t-2 border-slate-300">
              <tr>
                <td className="px-3 py-2" colSpan={6}>
                  {activeFilters > 0 ? `筛选结果: ${filterSummary.count} 条` : `合计 ${data.length} 条`}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-red-600">-{formatMoney(filterSummary.totalExpense)}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-emerald-600">+{formatMoney(filterSummary.totalIncome)}</span>
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </HoverScrollbar>
    </div>
  )
}

function RowActions({ row, onEdit, onDelete }: {
  row: CostLedgerEntry
  onEdit: (e: CostLedgerEntry) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      <button onClick={() => onEdit(row)} className="text-xs text-blue-600 hover:text-blue-800">编辑</button>
      <button onClick={() => onDelete(row.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
    </div>
  )
}
