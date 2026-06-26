/**
 * 成本台账导入模态框
 * 步骤组件化重构（2026-05-19）
 * 辅助模块: importComponents/
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import type { WorkBook } from 'xlsx'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { CostLedgerCategory, CostLedgerMatchRule } from '@/types'
import { executeBatchImport, learnFromOverrides as doLearnFromOverrides, buildImportEntries } from './importComponents/importLogic'
import { getAPI } from '@/services/api-adapter'
import { ParsedRow } from './importHelpers'
export { learnFromEdit } from './importHelpers'
import { ImportFileStep } from './importComponents/ImportFileStep'
import { ImportMappingStep, parseAllRows } from './importComponents/ImportMappingStep'
import { ImportProgressStep } from './importComponents/ImportProgressStep'
import { ImportDoneStep } from './importComponents/ImportDoneStep'
import { HoverScrollbar } from '@/components/ui/HoverScrollbar'
import { Button } from '../../ui/Button'

// ── 接口 ──
// -- IMPORT_FIELDS: 保留供参考 --
// const IMPORT_FIELDS: ImportField[] = [
// { key: 'date', label: '日期', required: true },
// { key: 'voucherNo', label: '凭证号' },
// { key: 'summary', label: '摘要' },
// { key: 'counterparty', label: '往来单位', required: true },
// { key: 'channel', label: '部门/渠道' },
// { key: 'incomeAmount', label: '收入金额' },
// { key: 'expenseAmount', label: '支出金额' },
// { key: 'notes', label: '备注' },
// ]

interface Props {
  show: boolean
  projectId: number
  projectName?: string
  batchId?: number
  batches?: { id: number; name: string }[]
  categories: CostLedgerCategory[]
  onClose: () => void
  onImported: () => void
}

// ── 主组件 ──
export function CostLedgerImportModal({
  show, projectId, projectName, batchId: propBatchId, batches, categories, onClose, onImported,
}: Props) {
  const [selectedBatch, setSelectedBatch] = useState(propBatchId ?? (batches?.[0]?.id ?? 0))
  useEffect(() => { if (show) setSelectedBatch(propBatchId ?? (batches?.[0]?.id ?? 0)) }, [show, propBatchId])

  const [step, setStep] = useState<'file' | 'mapping' | 'importing' | 'done'>('file')
  const [wb, setWb] = useState<WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [headerRow] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [allRows, setAllRows] = useState<string[][]>([] as string[][])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [rowOverrides, setRowOverrides] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [learnedMsg, setLearnedMsg] = useState<string | null>(null)
  const [learnedRules, setLearnedRules] = useState<CostLedgerMatchRule[]>([])

  useEffect(() => {
  getAPI().then(api => {
  if (api?.getCostLedgerMatchRules) {
  return api.getCostLedgerMatchRules()
  }
  }).then((r: unknown) => { const res = r as Record<string, unknown>; if (res?.success) setLearnedRules((res.data as CostLedgerMatchRule[]) || []) })
  }, [])

  // ── 文件选择 ──
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  setError(null)
  const reader = new FileReader()
  reader.onload = async (ev) => {
  try {
  const buf = ev.target?.result as ArrayBuffer
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buf, { type: 'array', raw: true })
  setWb(workbook)
  setSheetNames(workbook.SheetNames)
  setActiveSheet(workbook.SheetNames[0] || '')
  loadSheet(workbook, workbook.SheetNames[0] || '', 0)
  } catch (err: unknown) { setError(`文件读取失败: ${err instanceof Error ? err.message : String(err)}`) }
  }
  reader.readAsArrayBuffer(file)
  e.target.value = ''
  }, [])

  // ── 加载工作表 ──
  const loadSheet = useCallback(async (workbook: WorkBook, sheetName: string, hRow: number) => {
  const XLSX = await import('xlsx')
  const ws = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]
  const hdrs = rows.length > hRow ? rows[hRow].map((h: unknown) => String(h ?? '').trim()) : []
  const dataRows = rows.slice(hRow + 1)
  setHeaders(hdrs)
  setAllRows(dataRows)
  const autoMapping: Record<string, number> = {}
  const fieldKeywords: Record<string, string[]> = {
  date: ['日期', '时间', 'date'], voucherNo: ['凭证号', '编号', '序号', 'no'],
  summary: ['摘要', '说明', '用途', '事由', '内容'],
  counterparty: ['往来单位', '单位', '对方', '公司', '名称', '户名'],
  channel: ['部门', '渠道', '科目', '账户'],
  incomeAmount: ['收入金额', '收入', '收方金额', '贷方'],
  expenseAmount: ['支出金额', '支出', '付方金额', '借方'],
  notes: ['备注', '说明', '附注'],
  }
  hdrs.forEach((h, i) => {
  const hl = h.toLowerCase()
  for (const [key, keywords] of Object.entries(fieldKeywords)) {
  if (keywords.some(kw => hl.includes(kw)) && autoMapping[key] === undefined) autoMapping[key] = i
  }
  })
  setMapping(autoMapping)
  setStep('mapping')
  }, [])

  const switchSheet = useCallback((name: string) => {
  if (!wb) return
  setActiveSheet(name)
  loadSheet(wb, name, headerRow)
  }, [wb, headerRow, loadSheet])

  // ── 解析所有行（统一逻辑，预览和导入共用） ──
  const doParseAllRows = useCallback((): ParsedRow[] => {
  return parseAllRows(allRows, mapping, headerRow, categories, learnedRules, categoryOverrides, rowOverrides)
  }, [allRows, mapping, headerRow, categories, learnedRules, categoryOverrides, rowOverrides])

  // ── 预览数据 ──
  const [previewPage, setPreviewPage] = useState(0)
  const PAGE_SIZE = 20
  const previewRows = useMemo(() => {
  const rows = doParseAllRows()
  const valid = rows.filter(r => !r.skip)
  const skipped = rows.filter(r => r.skip)
  const totalPages = Math.max(1, Math.ceil(valid.length / PAGE_SIZE))
  if (previewPage >= totalPages) setPreviewPage(0)
  return { valid, skipped, total: rows.length, validCount: valid.filter(r => r.counterparty && r.date).length, totalPages }
  }, [doParseAllRows, previewPage])

  // ── 执行导入 ──
  const executeImport = useCallback(async () => {
  const rows = doParseAllRows()
  const validRows = rows.filter(r => !r.skip && r.counterparty && r.date)
  if (validRows.length === 0) { setError('没有有效数据可导入'); return }
  setStep('importing')
  setProgress({ current: 0, total: validRows.length })
  const entries = buildImportEntries(validRows)
  const res = await executeBatchImport(projectId, entries, selectedBatch)
  if (res.success) {
  setProgress({ current: res.count ?? 0, total: res.count ?? 0 })
  const lr = await doLearnFromOverrides(doParseAllRows)
  if (lr.count > 0) {
  setLearnedRules(lr.merged || [])
  setLearnedMsg(`学习到 ${lr.count} 条分类规则`)
  }
  setStep('done')
  } else {
  setError(res.error || '导入失败')
  setStep('mapping')
  }
  }, [doParseAllRows, projectId, selectedBatch])

  if (!show) return null

  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
  <motion.div
  className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  onClick={e => e.stopPropagation()}
  >
  {/* Header */}
  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
  <div>
  <h3 className="text-lg font-semibold text-slate-800">导入成本台账</h3>
  {projectName && <p className="text-sm text-slate-500 mt-0.5">{projectName}</p>}
  </div>
  <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
  <Icon name="X" size={20} />
  </button>
  </div>

  {/* Body */}
  <HoverScrollbar className="flex-1 p-6 space-y-4">
  {error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
  <Icon name="AlertTriangle" size={20} className="text-red-500 shrink-0 mt-0.5" />
  <div>
  <p className="text-sm font-medium text-red-700">导入失败</p>
  <p className="text-sm text-red-600 mt-0.5">{error}</p>
  </div>
  </div>
  )}
  {step === 'file' && (
  <ImportFileStep
  selectedBatch={selectedBatch} onBatchChange={setSelectedBatch}
  batches={batches} onFileChange={handleFile} error={error}
  />
  )}
  {step === 'mapping' && (
  <ImportMappingStep
  sheetNames={sheetNames} activeSheet={activeSheet} headers={headers}
  allRows={allRows} headerRow={headerRow}
  mapping={mapping} onMappingChange={setMapping} onSwitchSheet={switchSheet}
  categories={categories} learnedRules={learnedRules}
  categoryOverrides={categoryOverrides} onCategoryOverrideChange={setCategoryOverrides}
  rowOverrides={rowOverrides} onRowOverrideChange={setRowOverrides}
  previewRows={previewRows}
  />
  )}
  {step === 'importing' && <ImportProgressStep progress={progress} />}
  {step === 'done' && <ImportDoneStep count={progress.current} learnedMsg={learnedMsg} />}
  </HoverScrollbar>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
  {step === 'file' && <Button onClick={onClose}  variant="ghost" size="sm">取消</Button>}
  {step === 'mapping' && (
  <>
  <Button onClick={() => setStep('file')}  variant="ghost" size="sm">重新选择文件</Button>
  <Button onClick={executeImport} disabled={previewRows.validCount === 0}
   variant="primary" className="disabled:opacity-50 disabled:cursor-not-allowed">
  导入 {previewRows.validCount} 条数据
  </Button>
  </>
  )}
  {step === 'importing' && <p className="text-sm text-slate-400">请稍候……</p>}
  {step === 'done' && (
  <Button onClick={() => { onClose(); onImported() }}
   variant="primary" className="text-sm">
  完成
  </Button>
  )}
  </div>
  </motion.div>
  </div>
  )
}
