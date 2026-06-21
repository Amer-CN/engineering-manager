import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { CostLedgerRow } from '@/components/features/costLedger/CostLedgerRow'
import { ColumnFilter, type ColValues } from '@/components/features/costLedger/ColumnFilter'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'
import { TABLE } from '@/constants/table'

interface CostLedgerTableProps {
  filtered: CostLedgerEntry[]
  entries: CostLedgerEntry[]
  categoryLevel: 'level1' | 'level2'
  categories: CostLedgerCategory[] | null | undefined
  onEdit: (entry: CostLedgerEntry) => void
  onDelete: (id: number) => void
  toggleSort: (field: string) => void
  sortField: string
  sortAsc: boolean
  filterCols: string[]
  colValues: ColValues
  checkedCounterparties: Set<string>
  checkedChannels: Set<string>
  checkedVoucherNos: Set<string>
  checkedSummaries: Set<string>
  checkedNotesSet: Set<string>
  checkedDates: Set<string>
  checkedAmounts: Set<string>
  makeToggle: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (val: string) => void
  makeSetAll: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (vals: string[]) => void
  makeClear: (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => () => void
  setCheckedCounterparties: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedChannels: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedVoucherNos: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedSummaries: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedNotesSet: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedDates: React.Dispatch<React.SetStateAction<Set<string>>>
  setCheckedAmounts: React.Dispatch<React.SetStateAction<Set<string>>>
  tableRef: React.RefObject<HTMLDivElement>
  zoom: number
}

export function CostLedgerTable({
  filtered, entries, categoryLevel, categories, onEdit, onDelete,
  toggleSort, sortField, sortAsc, filterCols, colValues,
  checkedCounterparties, checkedChannels, checkedVoucherNos,
  checkedSummaries, checkedNotesSet, checkedDates, checkedAmounts,
  makeToggle, makeSetAll, makeClear,
  setCheckedCounterparties, setCheckedChannels, setCheckedVoucherNos,
  setCheckedSummaries, setCheckedNotesSet, setCheckedDates, setCheckedAmounts,
  tableRef, zoom,
}: CostLedgerTableProps) {
  return (
    <HoverScrollbar className="flex-1 min-h-0">
    <div ref={tableRef} style={{ zoom }}>
      <table className="w-full table-fixed">
        <thead className={`${TABLE.headerRow} ${TABLE.stickyHeader} text-xs`}>
          <tr>
            {[
              ['voucherNo', '凭证号', 'w-[96px] text-center'],
              ['date', '日期', 'w-[84px]'],
              ['direction', '方向', 'w-[60px]'],
              ['category', '分类', 'w-[96px]'],
              ['counterparty', '往来单位/个人', ''],
              ['channel', '渠道', 'w-[96px]'],
              ['amount', '金额', 'w-[136px] text-right'],
              ['summary', '摘要', ''],
              ['notes', '备注', ''],
            ].map(([field, label, width]) => (
              <th key={field} className={`${TABLE.headerCell} ${width}`}>
                <div className="flex items-center">
                  <span className="cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort(field as string)}>
                    {label}{sortField === field ? (sortAsc ? ' ↑' : ' ↓') : ''}
                  </span>
                  {filterCols.includes(field as string) && (
                    <ColumnFilter
                      col={field as string}
                      colValues={colValues}
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
            ))}
            <th className={`${TABLE.headerCell} text-right w-[64px]`}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                无匹配结果，请调整筛选条件
              </td>
            </tr>
          ) : filtered.map(entry => (
            <CostLedgerRow
              key={entry.id}
              entry={entry}
              categoryLevel={categoryLevel}
              categories={categories}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
    </HoverScrollbar>
  )
}




