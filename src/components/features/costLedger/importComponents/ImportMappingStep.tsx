/**
 * 步骤二：列映射 + 分类调整 + 数据预览
 * Props 从 CostLedgerImportModal 主组件传入
 */
import { useState, Dispatch, SetStateAction } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Icon } from '@/components/ui/Icon'
import type { CostLedgerCategory, CostLedgerMatchRule } from '@/types'
import { IMPORT_FIELDS, autoMatchCategory, parseDate, parseNumber } from './importHelpers'

interface ParsedRow {
  date: string; voucherNo: string; summary: string; counterparty: string
  channel: string; incomeAmount: number; expenseAmount: number; notes: string
  rowNum: number; skip: boolean; skipReason?: string
  _rowIdx?: number; _matchedDir?: string; _matchedCode?: string; _originalCode?: string
}

interface Props {
  sheetNames: string[]
  activeSheet: string
  headers: string[]
  allRows: any[][]
  headerRow: number
  mapping: Record<string, number>
  onMappingChange: Dispatch<SetStateAction<Record<string, number>>>
  onSwitchSheet: (name: string) => void
  categories: CostLedgerCategory[]
  learnedRules: CostLedgerMatchRule[]
  categoryOverrides: Record<string, string>
  onCategoryOverrideChange: Dispatch<SetStateAction<Record<string, string>>>
  rowOverrides: Record<number, string>
  onRowOverrideChange: Dispatch<SetStateAction<Record<number, string>>>
  previewRows: { valid: ParsedRow[]; skipped: ParsedRow[]; total: number; validCount: number; totalPages: number }
}

interface CategorySummaryItem {
  code: string; count: number; label: string
  direction: 'expense' | 'income'; overriddenTo: string | null
}

// ── 分类映射覆盖面板 ──
function CategoryOverridePanel({ categorySummary, categories, categoryOverrides, onChange, onReset }: {
  categorySummary: CategorySummaryItem[]; categories: CostLedgerCategory[]
  categoryOverrides: Record<string, string>
  onChange: Dispatch<SetStateAction<Record<string, string>>>
  onReset: (code: string) => void
}) {
  if (categorySummary.length === 0) return null
  return (
  <div>
  <label className="text-sm font-medium text-slate-700 block mb-2">
  分类映射调整
  <span className="text-xs text-slate-400 ml-2 font-normal">（系统已从摘要+备注自动匹配，可下拉调整）</span>
  </label>
  <div className="flex flex-wrap gap-2">
  {categorySummary.map(s => {
  const isOverridden = s.overriddenTo !== null
  const currentCode = s.overriddenTo || s.code
  const currentCat = categories.find(c => c.code === currentCode)
  return (
  <div key={s.code} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isOverridden ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
  <span className="text-xs text-slate-400 shrink-0 w-6 text-right">{s.count}</span>
  <select value={currentCode}
  onChange={e => onChange(prev => ({ ...prev, [s.code]: e.target.value }))}
  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white max-w-[150px]">
  <optgroup label="支出">
  {categories.filter(c => c.direction === 'expense' && c.isEnabled).map(c => (
  <option key={c.code} value={c.code}>{c.label}</option>))}
  </optgroup>
  <optgroup label="收入">
  {categories.filter(c => c.direction === 'income' && c.isEnabled).map(c => (
  <option key={c.code} value={c.code}>{c.label}</option>))}
  </optgroup>
  </select>
  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${currentCat?.direction === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
  {currentCat?.direction === 'expense' ? '支出' : '收入'}
  </span>
  {isOverridden && (
  <button onClick={() => onReset(s.code)}
  className="text-xs text-slate-400 hover:text-red-500" title="恢复自动匹配">
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
function PreviewTable({ previewRows, categories, rowOverrides, onRowOverrideChange }: {
  previewRows: Props['previewRows']; categories: CostLedgerCategory[]
  rowOverrides: Record<number, string>
  onRowOverrideChange: Dispatch<SetStateAction<Record<number, string>>>
}) {
  const data = previewRows.valid.map(r => ({
    ...r,
    _idx: (r as any)._rowIdx as number,
    _dir: (r as any)._matchedDir as 'expense' | 'income',
    _code: (r as any)._matchedCode as string,
  }))

  const columns: Column<typeof data[number]>[] = [
    { key: 'rowNum', title: '行', width: '48px', render: (item) => <span className="text-slate-400">{item.rowNum}</span> },
    { key: 'date', title: '日期', render: (item) => <span className="text-slate-700">{item.date}</span> },
    { key: 'summary', title: '摘要', render: (item) => <span className="text-slate-700 max-w-[200px] truncate block">{item.summary}</span> },
    { key: 'counterparty', title: '往来单位', render: (item) => <span className="text-slate-700 max-w-[150px] truncate block">{item.counterparty}</span> },
    { key: '_dir', title: '方向', render: (item) => (
      <span className={`text-xs px-1 py-0.5 rounded ${item._dir === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
        {item._dir === 'expense' ? '支出' : '收入'}
      </span>
    )},
    { key: 'expenseAmount', title: '金额', align: 'right', render: (item) => <span className="font-mono text-slate-700">{item.expenseAmount || item.incomeAmount}</span> },
    { key: '_code', title: '分类', render: (item) => {
      const overrideCode = rowOverrides[item._idx]
      const currentCode = overrideCode || item._code
      return (
        <select value={currentCode}
          onChange={e => onRowOverrideChange(prev => ({ ...prev, [item._idx]: e.target.value }))}
          className="px-1 py-0.5 border border-slate-300 rounded text-xs bg-white max-w-[130px]">
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
  <label className="text-sm font-medium text-slate-700 block mb-2">
  数据预览
  <span className="text-xs text-slate-400 ml-2 font-normal">
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
    <p className="text-center text-xs text-slate-400 mt-2">
      …… 已跳过 {previewRows.total - previewRows.validCount} 行汇总/空行 ……
    </p>
  )}
  </div>
  )
}

// ── 解析所有行 ──
export function parseAllRows(
  allRows: any[], mapping: Record<string, number>, headerRow: number,
  categories: CostLedgerCategory[], learnedRules: CostLedgerMatchRule[],
  categoryOverrides: Record<string, string>, rowOverrides: Record<number, string>,
): ParsedRow[] {
  if (!allRows.length || !Object.keys(mapping).length) return []
  const m = mapping
  return allRows.map((r, idx) => {
  const summary = m.summary >= 0 ? String(r[m.summary] || '').trim() : ''
  const notes = m.notes >= 0 ? String(r[m.notes] || '').trim() : ''
  const counterparty = m.counterparty >= 0 ? String(r[m.counterparty] || '').trim() : ''
  const incomeAmt = m.incomeAmount >= 0 ? parseNumber(r[m.incomeAmount]) : 0
  const expenseAmt = m.expenseAmount >= 0 ? parseNumber(r[m.expenseAmount]) : 0
  let direction: 'expense' | 'income' = expenseAmt > 0 ? 'expense' : 'income'
  const dirCats = categories.filter(c => c.direction === direction && c.isEnabled)
  let matched = autoMatchCategory(summary, notes, counterparty, dirCats, learnedRules)
  if (!matched) {
  const otherCats = categories.filter(c => c.direction !== direction && c.isEnabled)
  const otherMatch = autoMatchCategory(summary, notes, counterparty, otherCats, learnedRules)
  if (otherMatch) { matched = otherMatch; direction = otherMatch.direction as 'expense' | 'income' }
  }
  let categoryCode = matched?.code || dirCats[0]?.code || (direction === 'income' ? 'advance_recovery' : 'other_business')
  const originalCode = categoryCode
  const overriddenCode = categoryOverrides[categoryCode]
  if (overriddenCode && overriddenCode !== categoryCode) {
  const overriddenCat = categories.find(c => c.code === overriddenCode)
  if (overriddenCat) { categoryCode = overriddenCat.code; direction = overriddenCat.direction as 'expense' | 'income' }
  }
  const rowCode = rowOverrides[idx]
  if (rowCode && rowCode !== categoryCode) {
  const rowCat = categories.find(c => c.code === rowCode)
  if (rowCat) { categoryCode = rowCat.code; direction = rowCat.direction as 'expense' | 'income' }
  }
  const row: ParsedRow = {
  date: m.date >= 0 ? parseDate(r[m.date]) : '',
  voucherNo: m.voucherNo >= 0 ? String(r[m.voucherNo] ?? '').trim() : '',
  summary, counterparty: m.counterparty >= 0 ? String(r[m.counterparty] || '').trim() : '',
  channel: m.channel >= 0 ? String(r[m.channel] || '').trim() : '',
  incomeAmount: incomeAmt, expenseAmount: expenseAmt, notes,
  rowNum: idx + headerRow + 2, skip: false,
  _matchedDir: direction, _matchedCode: categoryCode, _originalCode: originalCode, _rowIdx: idx,
  }
  const nonEmpty = [row.date, row.counterparty, row.summary].some(v => v && v.length > 0) || incomeAmt > 0 || expenseAmt > 0
  if (!nonEmpty) { row.skip = true; row.skipReason = '空行'; return row }
  const summaryKeywords = ['小计', '合计', '余额', '累计', '总计', 'subtotal', 'total']
  if (summaryKeywords.some(kw => row.summary.includes(kw))) { row.skip = true; row.skipReason = '汇总行' }
  return row
  })
}

// ── 分类命中统计 ──
export function buildCategorySummary(rows: ParsedRow[], categories: CostLedgerCategory[], overrides: Record<string, string>): CategorySummaryItem[] {
  const valid = rows.filter(r => !r.skip && r.counterparty && r.date)
  const counts: Record<string, number> = {}
  valid.forEach(r => { const code = (r as any)._matchedCode as string; counts[code] = (counts[code] || 0) + 1 })
  return Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .map(([code, count]) => ({
  code, count,
  label: categories.find(c => c.code === code)?.label || code,
  direction: (categories.find(c => c.code === code)?.direction || 'expense') as 'expense' | 'income',
  overriddenTo: overrides[code] || null,
  }))
}

// ── 主组件 ──

export function ImportMappingStep(props: Props) {
  const { sheetNames, activeSheet, headers, mapping, onMappingChange, onSwitchSheet,
  categories, categoryOverrides, onCategoryOverrideChange, rowOverrides, onRowOverrideChange, previewRows } = props

  // 分类汇总：内部维护，与 categoryOverrides 联动
  const [catSummary] = useState<CategorySummaryItem[]>([])

  return (
  <div className="space-y-6">
  {/* 工作表选择 */}
  {sheetNames.length > 1 && (
  <div>
  <label className="text-sm font-medium text-slate-700 block mb-2">工作表</label>
  <div className="flex flex-wrap gap-2">
  {sheetNames.map(name => (
  <button key={name} onClick={() => onSwitchSheet(name)}
  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${name === activeSheet ? 'bg-primary-50 border-primary-400 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
  >{name}</button>
  ))}
  </div>
  </div>
  )}

  {/* 列映射 */}
  <div>
  <label className="text-sm font-medium text-slate-700 block mb-2">
  列映射（选择 Excel 每列对应的系统字段）
  </label>
  <div className="grid grid-cols-2 gap-3">
  {IMPORT_FIELDS.map(f => (
  <div key={f.key} className="flex items-center gap-2">
  <span className="text-sm text-slate-600 w-24 shrink-0">
  {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
  </span>
  <select value={mapping[f.key] ?? -1}
  onChange={e => onMappingChange(prev => ({ ...prev, [f.key]: parseInt(e.target.value) }))}
  className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
  <option value={-1}>— 不导入 —</option>
  {headers.map((h, i) => (
  <option key={i} value={i}>{h || `列 ${i + 1}`}</option>
  ))}
  </select>
  </div>
  ))}
  </div>
  </div>

  {/* 分类映射调整 */}
  <CategoryOverridePanel
  categorySummary={catSummary} categories={categories}
  categoryOverrides={categoryOverrides} onChange={onCategoryOverrideChange}
  onReset={code => onCategoryOverrideChange(prev => { const n = { ...prev }; delete n[code]; return n })}
  />

  {/* 数据预览 */}
  <PreviewTable previewRows={previewRows} categories={categories}
  rowOverrides={rowOverrides} onRowOverrideChange={onRowOverrideChange} />
  </div>
  )
}
