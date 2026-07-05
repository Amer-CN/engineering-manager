// TODO（重新上线前必须补齐）：
//   1. 列宽拖拽（当前走 table-fixed + size 粗略值）
//   2. 导入/导出/打印接线（Toolbar 已含按钮，Grid 需对接 printExport）
//   3. 大规模数据虚拟滚动（当前全量渲染）
//
// 本阶段（internal-qa）已补齐：
//   ✓ 金额口径统一（元，与旧表格 formatMoney 完全一致）
//   ✓ 旧版筛选体系接回（useCostLedgerFilters + Toolbar + ColumnFilter）
//   ✓ 操作列恢复（编辑 → onEdit 弹窗 / 删除 → confirm + API + toast）
//   ✓ 分组 UI（方向/分类/取消 + 展开收起 + 小计）
//   ✓ 状态反馈（loading / empty / 筛选无结果 / error / 保存删除失败 toast）
//   ✓ 冻结列修复（z-index 分层 / CSS 变量背景 / 表头正文层级）
//   ✓ 三主题适配（White / Graphite / Sandstone 全走 CSS 变量）

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
import { GridLoading, GridError, GridEmpty, GridNoResult } from './GridStates'
import { DIRECTION_CONFIG, getCategoryDisplayLabel, getLevel1Color, isCategoryMissing } from './config'
import { normalizeDate } from '@/utils/date'
import { formatMoney } from '@/utils/format'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { TABLE } from '@/constants/table'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Icon } from '@/components/ui/Icon'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

// 冻结列 sticky — z-index 分层：thead 冻结格 z-21，tbody 冻结格 z-11
function pinStyle<T>(column: TCol<T, unknown>, inHeader: boolean): CSSProperties {
  const p = column.getIsPinned()
  if (!p) return {}
  return {
    position: 'sticky',
    left: p === 'left' ? column.getStart('left') : undefined,
    right: p === 'right' ? column.getAfter('right') : undefined,
    zIndex: inHeader ? 21 : 11,
    background: 'var(--card)',
  }
}

const GROUP_BG: CSSProperties = { background: 'var(--panel-2)' }

interface CostLedgerGridProps {
  rows: CostLedgerEntry[]
  loading?: boolean
  error?: string | null
  categories?: CostLedgerCategory[] | null
  onEdit: (entry: CostLedgerEntry) => void
  onChanged: () => void
}

export function CostLedgerGrid({ rows, loading, error, categories, onEdit, onChanged }: CostLedgerGridProps) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [data, setData] = useState<CostLedgerEntry[]>(rows)
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])

  useEffect(() => { setData(rows) }, [rows])

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

  const zoomRef = useRef(parseFloat(localStorage.getItem('costLedgerZoom') || '1.1'))
  const tableRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(zoomRef.current)

  const filterSummary = useMemo(() => {
    let totalExpense = 0, totalIncome = 0
    for (const e of filtered) {
      if (e.direction === 'expense') totalExpense += e.amount
      else totalIncome += e.amount
    }
    return { totalExpense, totalIncome, count: filtered.length }
  }, [filtered])

  const filterCols = ['voucherNo', 'date', 'counterparty', 'channel', 'amount', 'summary', 'notes']

  const toggleGrouping = useCallback((colId: string) => {
    setGrouping(prev => prev.includes(colId) ? [] : [colId])
  }, [])

  const handleRowDelete = useCallback(async (id: number) => {
    const ok = await confirm({ title: '确认删除', content: '确认删除这条台账记录？', confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api?.deleteCostLedger?.(id)
    if (res?.success) { showToast('已删除', 'success'); onChanged() }
    else { showToast(res?.error || '删除失败', 'error') }
  }, [confirm, showToast, onChanged])

  const columns = useMemo<ColumnDef<CostLedgerEntry>[]>(() => [
    { id: 'voucherNo', accessorKey: 'voucherNo', header: '凭证号', enableSorting: true },
    { id: 'date', accessorKey: 'date', header: '日期', enableSorting: true, meta: { editable: true, editType: 'date' },
      cell: (i) => normalizeDate(i.getValue() as string) },
    { id: 'direction', accessorKey: 'direction', header: '方向', enableGrouping: true,
      cell: (i) => { const d = DIRECTION_CONFIG[i.getValue() as string]; return d ? <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${d.bg} ${d.color}`}>{d.label}</span> : '-' } },
    { id: 'category', accessorKey: 'category', header: '分类', enableGrouping: true, meta: { editable: true },
      cell: (i) => (
        <span className="line-clamp-2">
          {categoryLevel === 'level1' && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: getLevel1Color(i.row.original.category, categories) }} />}
          {getCategoryDisplayLabel(i.row.original.category, categoryLevel, categories)}
          {isCategoryMissing(i.row.original.category, categories) && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700 text-caption">已删</span>}
        </span>
      ) },
    { id: 'counterparty', accessorKey: 'counterparty', header: '往来单位/个人', meta: { editable: true } },
    { id: 'channel', accessorKey: 'channel', header: '渠道', meta: { editable: true } },
    { id: 'amount', accessorKey: 'amount', header: '金额', aggregationFn: 'sum',
      aggregatedCell: (i) => <strong>{fmtMoney(i.getValue())}</strong>,
      cell: (i) => { const v = i.getValue() as number; const ex = i.row.original.direction === 'expense'
        return <span className={ex ? 'text-red-600' : 'text-emerald-600'}>{ex ? '-' : '+'}{formatMoney(v)}</span> },
      meta: { align: 'right', editable: true, money: true, cellClass: (_v, r) => r.direction === 'expense' ? 'text-red-600' : 'text-emerald-600' } },
    { id: 'summary', accessorKey: 'summary', header: '摘要', meta: { editable: true } },
    { id: 'notes', accessorKey: 'notes', header: '备注', meta: { editable: true } },
    { id: 'actions', header: '操作', cell: (i) => <RowActions row={i.row.original} onEdit={onEdit} onDelete={handleRowDelete} /> },
  ], [categories, categoryLevel, onEdit, handleRowDelete])

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting, grouping },
    initialState: { columnPinning: { left: ['voucherNo', 'date'], right: ['actions'] } },
    defaultColumn: { cell: EditableCell as ColumnDef<CostLedgerEntry>['cell'] },
    onSortingChange: setSorting, onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(), getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => String(row.id),
    meta: {
      updateCell: async (rowId, columnId, value) => {
        const idx = data.findIndex(r => String(r.id) === rowId)
        if (idx < 0) return
        const prev = data[idx]
        const updated = { ...prev, [columnId]: value } as CostLedgerEntry
        setData(d => d.map((r, i) => (i === idx ? updated : r)))
        const api = await getAPI()
        const res = await api?.updateCostLedger?.(updated)
        if (!res?.success) { setData(d => d.map((r, i) => (i === idx ? prev : r))); showToast(res?.error || '保存失败', 'error') }
        else { showToast('已保存', 'success'); onChanged() }
      },
    },
  })

  const toolbarProps = { filter, categoryFilter, categoryLevel, setFilter, setCategoryFilter,
    setCategoryLevelAndReset, clearAll, activeFilters, categories,
    filtered, entries: data, filterSummary, zoomRef, tableRef, zoom, setZoom }
  const emptySummary = { totalExpense: 0, totalIncome: 0, count: 0 }

  if (error) return <div className="flex-1 flex flex-col min-h-0"><CostLedgerListToolbar {...toolbarProps} filtered={[]} entries={[]} filterSummary={emptySummary} /><GridError error={error} onRetry={onChanged} /></div>
  if (loading) return <div className="flex-1 flex flex-col min-h-0"><CostLedgerListToolbar {...toolbarProps} filtered={[]} entries={[]} filterSummary={emptySummary} /><GridLoading /></div>
  if (data.length === 0) return <div className="flex-1 flex flex-col min-h-0"><CostLedgerListToolbar {...toolbarProps} filtered={[]} entries={[]} filterSummary={emptySummary} /><GridEmpty /></div>

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {ConfirmDialog}
      <CostLedgerListToolbar {...toolbarProps} />
      {/* 分组切换栏 — 全 CSS 变量，三主题兼容 */}
      <div className="flex items-center gap-2 border-b px-6 py-2" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <span className="text-xs" style={{ color: 'var(--fg-2)' }}>分组：</span>
        {[{ id: 'direction', label: '按方向', icon: 'ArrowLeftRight' as const }, { id: 'category', label: '按分类', icon: 'FolderTree' as const }].map(btn => (
          <button key={btn.id} onClick={() => toggleGrouping(btn.id)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={grouping.includes(btn.id)
              ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
              : { border: '1px solid var(--border)', color: 'var(--fg-2)' }}>
            <Icon name={btn.icon} size={12} />{btn.label}
          </button>
        ))}
        {grouping.length > 0 && (<>
          <button onClick={() => setGrouping([])} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors" style={{ color: 'var(--muted)' }}>
            <Icon name="X" size={12} />取消分组
          </button>
          <div className="ml-auto flex gap-1">
            <button onClick={() => table.toggleAllRowsExpanded(true)} className="rounded-md px-2 py-1 text-xs transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>全部展开</button>
            <button onClick={() => table.toggleAllRowsExpanded(false)} className="rounded-md px-2 py-1 text-xs transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}>全部收起</button>
          </div>
        </>)}
      </div>

      <HoverScrollbar className="flex-1 min-h-0">
        <div ref={tableRef} style={{ zoom }}>
          <table className="w-full table-fixed">
            <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader} text-xs`} style={{ zIndex: 20 }}>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => {
                    const colId = h.column.id
                    return (
                      <th key={h.id} style={pinStyle(h.column, true)}
                        className={`${TABLE.headerCell} ${h.column.columnDef.meta?.align === 'right' ? 'text-right' : ''}`}>
                        <div className="flex items-center">
                          {h.isPlaceholder ? null : (
                            <span className="cursor-pointer select-none" style={{ color: 'var(--fg-2)' }} onClick={h.column.getToggleSortingHandler()}>
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {h.column.getIsSorted() ? (h.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓') : ''}
                            </span>
                          )}
                          {filterCols.includes(colId) && (
                            <ColumnFilter col={colId} colValues={colValues as unknown as ColValues}
                              checkedCounterparties={checkedCounterparties} checkedChannels={checkedChannels} checkedVoucherNos={checkedVoucherNos}
                              checkedSummaries={checkedSummaries} checkedNotesSet={checkedNotesSet} checkedDates={checkedDates} checkedAmounts={checkedAmounts}
                              onToggleCounterparty={makeToggle(setCheckedCounterparties)} onToggleChannel={makeToggle(setCheckedChannels)} onToggleVoucherNo={makeToggle(setCheckedVoucherNos)}
                              onToggleSummary={makeToggle(setCheckedSummaries)} onToggleNote={makeToggle(setCheckedNotesSet)} onToggleDate={makeToggle(setCheckedDates)} onToggleAmount={makeToggle(setCheckedAmounts)}
                              onSetAllCounterparties={makeSetAll(setCheckedCounterparties)} onSetAllChannels={makeSetAll(setCheckedChannels)} onSetAllVoucherNos={makeSetAll(setCheckedVoucherNos)}
                              onSetAllSummaries={makeSetAll(setCheckedSummaries)} onSetAllNotes={makeSetAll(setCheckedNotesSet)} onSetAllDates={makeSetAll(setCheckedDates)} onSetAllAmounts={makeSetAll(setCheckedAmounts)}
                              onClearCounterparties={makeClear(setCheckedCounterparties)} onClearChannels={makeClear(setCheckedChannels)} onClearVoucherNos={makeClear(setCheckedVoucherNos)}
                              onClearSummaries={makeClear(setCheckedSummaries)} onClearNotes={makeClear(setCheckedNotesSet)} onClearDates={makeClear(setCheckedDates)} onClearAmounts={makeClear(setCheckedAmounts)} />
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
                <GridNoResult activeFilters={activeFilters} onClear={clearAll} />
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id} style={row.getIsGrouped() ? GROUP_BG : undefined}
                  className={`border-b text-sm table-row-hover ${row.getIsGrouped() ? 'font-medium' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}
                      style={cell.column.getIsPinned() ? pinStyle(cell.column, false) : (row.getIsGrouped() ? GROUP_BG : undefined)}
                      className={`px-3 py-2 ${cell.column.columnDef.meta?.align === 'right' ? 'text-right' : ''}`}>
                      {cell.getIsGrouped() ? (
                        <button onClick={row.getToggleExpandedHandler()} className="inline-flex items-center gap-1">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded" style={{ color: 'var(--fg-2)' }}>{row.getIsExpanded() ? '▾' : '▸'}</span>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          <span style={{ color: 'var(--muted)' }}>({row.subRows.length})</span>
                        </button>
                      ) : cell.getIsAggregated() ? flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                        : cell.getIsPlaceholder() ? null : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 font-semibold border-t-2" style={{ background: 'var(--bg-2)', borderColor: 'var(--border-strong)', zIndex: 20 }}>
              <tr>
                <td className="px-3 py-2" colSpan={6}>{activeFilters > 0 ? `筛选结果: ${filterSummary.count} 条` : `合计 ${data.length} 条`}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-red-600">-{formatMoney(filterSummary.totalExpense)}</span>
                  <span className="mx-1" style={{ color: 'var(--muted)' }}>/</span>
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

function RowActions({ row, onEdit, onDelete }: { row: CostLedgerEntry; onEdit: (e: CostLedgerEntry) => void; onDelete: (id: number) => void }) {
  return (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      <button onClick={() => onEdit(row)} className="text-xs" style={{ color: 'var(--accent)' }}>编辑</button>
      <button onClick={() => onDelete(row.id)} className="text-xs" style={{ color: 'var(--danger)' }}>删除</button>
    </div>
  )
}
