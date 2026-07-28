/**
 * 步骤二：列映射 + 分类调整 + 数据预览
 * Props 从 CostLedgerImportModal 主组件传入
 */
import { useState, Dispatch, SetStateAction } from 'react'
import type { CostLedgerCategory, CostLedgerMatchRule } from '@/types'
import { IMPORT_FIELDS, autoMatchCategory, parseDate, parseNumber } from './importHelpers'
import { ParsedRow, CategorySummaryItem, PreviewRows, CategoryOverridePanel, PreviewTable } from './ImportMappingComponents'

export type { ParsedRow, CategorySummaryItem }

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
  previewRows: PreviewRows
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

  const [catSummary] = useState<CategorySummaryItem[]>([])

  return (
  <div className="space-y-6">
  {/* 工作表选择 */}
  {sheetNames.length > 1 && (
  <div>
  <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">工作表</label>
  <div className="flex flex-wrap gap-2">
  {sheetNames.map(name => (
  <button key={name} onClick={() => onSwitchSheet(name)}
  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${name === activeSheet ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)] text-[color:var(--accent)]' : 'bg-[color:var(--card)] border-[color:var(--border)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'}`}
  >{name}</button>
  ))}
  </div>
  </div>
  )}

  {/* 列映射 */}
  <div>
  <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">
  列映射（选择 Excel 每列对应的系统字段）
  </label>
  <div className="grid grid-cols-2 gap-3">
  {IMPORT_FIELDS.map(f => (
  <div key={f.key} className="flex items-center gap-2">
  <span className="text-sm text-[color:var(--fg-2)] w-24 shrink-0">
  {f.label}{f.required && <span className="text-danger-400 ml-0.5">*</span>}
  </span>
  <select value={mapping[f.key] ?? -1}
  onChange={e => onMappingChange(prev => ({ ...prev, [f.key]: parseInt(e.target.value) }))}
  className="flex-1 px-2 py-1.5 border border-[color:var(--border)] rounded-lg text-sm bg-[color:var(--card)]">
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
