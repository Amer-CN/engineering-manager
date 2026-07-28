import { Dispatch, SetStateAction } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Icon } from '@/components/ui/Icon'
import type { CostLedgerCategory } from '@/types'

export interface ParsedRow {
  date: string; voucherNo: string; summary: string; counterparty: string
  channel: string; incomeAmount: number; expenseAmount: number; notes: string
  rowNum: number; skip: boolean; skipReason?: string
  _rowIdx?: number; _matchedDir?: string; _matchedCode?: string; _originalCode?: string
}

export interface CategorySummaryItem {
  code: string; count: number; label: string
  direction: 'expense' | 'income'; overriddenTo: string | null
}

export interface PreviewRows {
  valid: ParsedRow[]; skipped: ParsedRow[]; total: number; validCount: number; totalPages: number
}

// ── 分类映射覆盖面板 ──
export function CategoryOverridePanel({ categorySummary, categories, categoryOverrides, onChange, onReset }: {
  categorySummary: CategorySummaryItem[]; categories: CostLedgerCategory[]
  categoryOverrides: Record<string, string>
  onChange: Dispatch<SetStateAction<Record<string, string>>>
  onReset: (code: string) => void
}) {
  if (categorySummary.length === 0) return null
  return (
  <div>
  <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">
  分类映射调整
  <span className="text-xs text-[color:var(--muted)] ml-2 font-normal">（系统已从摘要+备注自动匹配，可下拉调整）</span>
  </label>
  <div className="flex flex-wrap gap-2">
  {categorySummary.map(s => {
  const isOverridden = s.overriddenTo !== null
  const currentCode = s.overriddenTo || s.code
  const currentCat = categories.find(c => c.code === currentCode)
  return (
  <div key={s.code} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isOverridden ? 'border-warning-300 bg-warning-50' : 'border-[color:var(--border)] bg-[color:var(--panel-2)]'}`}>
  <span className="text-xs text-[color:var(--muted)] shrink-0 w-6 text-right">{s.count}</span>
  <select value={currentCode}
  onChange={e => onChange(prev => ({ ...prev, [s.code]: e.target.value }))}
  className="px-2 py-1 border border-[color:var(--border)] rounded text-xs bg-[color:var(--card)] max-w-[150px]">
  <optgroup label="支出">
  {categories.filter(c => c.direction === 'expense' && c.isEnabled).map(c => (
  <option key={c.code} value={c.code}>{c.label}</option>))}
  </optgroup>
  <optgroup label="收入">
  {categories.filter(c => c.direction === 'income' && c.isEnabled).map(c => (
  <option key={c.code} value={c.code}>{c.label}</option>))}
  </optgroup>
  </select>
  <span className={`text-caption px-1.5 py-0.5 rounded font-medium ${currentCat?.direction === 'expense' ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'}`}>
  {currentCat?.direction === 'expense' ? '支出' : '收入'}
  </span>
  {isOverridden && (
  <button onClick={() => onReset(s.code)}
  className="text-xs text-[color:var(--muted)] hover:text-danger-500" title="恢复自动匹配">
  <Icon name="RotateCcw" size={12} />
  </button>
  )}
  </div>
  )
  })}
  </div>
  </div>
  )
}

// ── 数据预览表格 ──
export function PreviewTable({ previewRows, categories, rowOverrides, onRowOverrideChange }: {
  previewRows: PreviewRows; categories: CostLedgerCategory[]
  rowOverrides: Record<number, string>
  onRowOverrideChange: Dispatch<SetStateAction<Record<number, string>>>
}) {
  const data = previewRows.valid.map(r => ({
    ...r,
    _idx: (r as unknown as Record<string, unknown>)._rowIdx as number,
    _dir: (r as unknown as Record<string, unknown>)._matchedDir as 'expense' | 'income',
    _code: (r as unknown as Record<string, unknown>)._matchedCode as string,
  }))

  const columns: Column<typeof data[number]>[] = [
    { key: 'rowNum', title: '行', width: '48px', render: (item) => <span className="text-[color:var(--muted)]">{item.rowNum}</span> },
    { key: 'date', title: '日期', render: (item) => <span className="text-[color:var(--fg-2)]">{item.date}</span> },
    { key: 'summary', title: '摘要', render: (item) => <span className="text-[color:var(--fg-2)] max-w-[200px] truncate block">{item.summary}</span> },
    { key: 'counterparty', title: '往来单位', render: (item) => <span className="text-[color:var(--fg-2)] max-w-[150px] truncate block">{item.counterparty}</span> },
    { key: '_dir', title: '方向', render: (item) => (
      <span className={`text-xs px-1 py-0.5 rounded ${item._dir === 'expense' ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'}`}>
        {item._dir === 'expense' ? '支出' : '收入'}
      </span>
    )},
    { key: 'expenseAmount', title: '金额', align: 'right', render: (item) => <span className="font-mono text-[color:var(--fg-2)]">{item.expenseAmount || item.incomeAmount}</span> },
    { key: '_code', title: '分类', render: (item) => {
      const overrideCode = rowOverrides[item._idx]
      const currentCode = overrideCode || item._code
      return (
        <select value={currentCode}
          onChange={e => onRowOverrideChange(prev => ({ ...prev, [item._idx]: e.target.value }))}
          className="px-1 py-0.5 border border-[color:var(--border)] rounded text-xs bg-[color:var(--card)] max-w-[130px]">
          <optgroup label="支出">
            {categories.filter(c => c.direction === 'expense' && c.isEnabled).map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>))}
          </optgroup>
          <optgroup label="收入">
            {categories.filter(c => c.direction === 'income' && c.isEnabled).map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>))}
          </optgroup>
        </select>
      )
    }},
  ]

  return (
  <div>
  <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">
  数据预览
  <span className="text-xs text-[color:var(--muted)] ml-2 font-normal">
  共 {previewRows.total} 行，有效 {previewRows.validCount} 行
  {previewRows.total - previewRows.validCount > 0 && `（已跳过 ${previewRows.total - previewRows.validCount} 行汇总/空行）`}
  </span>
  </label>
  <DataTable
    data={data}
    columns={columns}
    rowKey={(item) => String(item._idx)}
    pagination={false}
    showContainer={true}
    stickyHeader={true}
    emptyText={previewRows.validCount === 0 ? '没有有效数据行，请检查列映射是否正确' : '暂无数据'}
  />
  {previewRows.skipped.length > 0 && (
    <p className="text-center text-xs text-[color:var(--muted)] mt-2">
      …… 已跳过 {previewRows.total - previewRows.validCount} 行汇总/空行 ……
    </p>
  )}
  </div>
  )
}
