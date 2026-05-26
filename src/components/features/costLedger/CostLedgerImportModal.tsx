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
import { ImportFileStep } from './importComponents/ImportFileStep'
import { ImportMappingStep, parseAllRows } from './importComponents/ImportMappingStep'
import { ImportProgressStep } from './importComponents/ImportProgressStep'
import { ImportDoneStep } from './importComponents/ImportDoneStep'

// ── 接口 ──
// -- IMPORT_FIELDS: 保留供参考 --
// const IMPORT_FIELDS: ImportField[] = [
//   { key: 'date', label: '日期', required: true },
//   { key: 'voucherNo', label: '凭证号' },
//   { key: 'summary', label: '摘要' },
//   { key: 'counterparty', label: '往来单位', required: true },
//   { key: 'channel', label: '部门/渠道' },
//   { key: 'incomeAmount', label: '收入金额' },
//   { key: 'expenseAmount', label: '支出金额' },
//   { key: 'notes', label: '备注' },
// ]

interface ParsedRow {
  date: string; voucherNo: string; summary: string; counterparty: string
  channel: string; incomeAmount: number; expenseAmount: number; notes: string
  rowNum: number; skip: boolean; skipReason?: string
  _rowIdx?: number; _matchedDir?: string; _matchedCode?: string; _originalCode?: string
}

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

// ── 从单条编辑中学习分类规则 ──
export async function learnFromEdit(
  summary: string, counterparty: string, notes: string, categoryCode: string, direction: string
): Promise<number> {
  const api = window.electronAPI
  if (!api?.getCostLedgerMatchRules || !api?.saveCostLedgerMatchRules) return 0
  const text = ((summary || '') + ' ' + (counterparty || '') + ' ' + (notes || '')).trim()
  if (!text) return 0
  const stopWords = ['的', '了', '在', '是', '有', '和', '与', '及', '或', ' ', '', null, undefined]
  const parts = text.split(/[：:：（）()／\/,，、\s]+|(?<=\D)(?=\d)|(?<=\d)(?=\D)/)
  const newRules: Map<string, CostLedgerMatchRule> = new Map()
  parts.forEach(p => {
    const kw = p.trim()
    if (kw.length < 2 || stopWords.includes(kw)) return
    if (/^\d+$/.test(kw) || /^[\d.]+$/.test(kw)) return
    const key = kw + '|' + categoryCode
    if (newRules.has(key)) {
      newRules.get(key)!.hitCount++
    } else {
      newRules.set(key, { keyword: kw, category: categoryCode, direction: direction as 'expense' | 'income', hitCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
  })
  if (newRules.size === 0) return 0
  const existing = await api.getCostLedgerMatchRules()
  const existingRules: CostLedgerMatchRule[] = existing?.success ? existing.data || [] : []
  const existingMap = new Map(existingRules.map(r => [r.keyword + '|' + r.category, r]))
  for (const [key, rule] of newRules) {
    if (existingMap.has(key)) {
      existingMap.get(key)!.hitCount += rule.hitCount
      existingMap.get(key)!.updatedAt = new Date().toISOString()
    } else {
      existingMap.set(key, rule)
    }
  }
  await api.saveCostLedgerMatchRules([...existingMap.values()])
  return newRules.size
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
  const [allRows, setAllRows] = useState<any[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({})
  const [rowOverrides, setRowOverrides] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [learnedMsg, setLearnedMsg] = useState<string | null>(null)
  const [learnedRules, setLearnedRules] = useState<CostLedgerMatchRule[]>([])

  useEffect(() => {
    const api = window.electronAPI
    if (api?.getCostLedgerMatchRules) {
      api.getCostLedgerMatchRules().then((r: any) => { if (r?.success) setLearnedRules(r.data || []) })
    }
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
      } catch (err: any) { setError(`文件读取失败: ${err.message}`) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }, [])

  // ── 加载工作表 ──
  const loadSheet = useCallback(async (workbook: any, sheetName: string, hRow: number) => {
    const XLSX = await import('xlsx')
    const ws = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }) as any[][]
    const hdrs = rows.length > hRow ? rows[hRow].map((h: any) => String(h || '').trim()) : []
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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">导入成本台账</h3>
            {projectName && <p className="text-sm text-slate-500 mt-0.5">{projectName}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <Icon name="AlertTriangle" size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">导入失败</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{error}</p>
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
          {step === 'file' && <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">取消</button>}
          {step === 'mapping' && (
            <>
              <button onClick={() => setStep('file')} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">重新选择文件</button>
              <button onClick={executeImport} disabled={previewRows.validCount === 0}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                导入 {previewRows.validCount} 条数据
              </button>
            </>
          )}
          {step === 'importing' && <p className="text-sm text-slate-400">请稍候……</p>}
          {step === 'done' && (
            <button onClick={() => { onClose(); onImported() }}
              className="btn btn-primary text-sm">
              完成
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
