import { useState, useCallback, useRef } from 'react'

export interface WorkerImportRow {
  name: string
  idCard: string
  gender?: string
  birthDate?: string
  ethnicity?: string
  phone?: string
  address?: string
  bankAccount?: string
  bankName?: string
  bankLineNo?: string
  workerType?: string
  dailyWage?: string
}

export interface ImportField {
  key: keyof WorkerImportRow
  label: string
  required: boolean
  keywords: string[]
}

export const WORKER_IMPORT_FIELDS: ImportField[] = [
  { key: 'name', label: '姓名', required: true, keywords: ['姓名', '名字', '工人姓名', '名称', 'name'] },
  { key: 'idCard', label: '身份证号', required: true, keywords: ['身份证', '身份证号', '身份证号码', '证件号', 'ID'] },
  { key: 'gender', label: '性别', required: false, keywords: ['性别', 'gender'] },
  { key: 'phone', label: '手机号', required: false, keywords: ['手机', '电话', '手机号', '联系电话', 'phone'] },
  { key: 'address', label: '地址', required: false, keywords: ['地址', '住址', '身份证地址', '户籍'] },
  { key: 'ethnicity', label: '民族', required: false, keywords: ['民族', 'ethnicity'] },
  { key: 'bankAccount', label: '工资卡号', required: false, keywords: ['工资卡', '卡号', '银行卡', '工资卡号', 'bankAccount'] },
  { key: 'bankName', label: '开户行', required: false, keywords: ['开户行', '开户银行', '银行', 'bankName'] },
  { key: 'bankLineNo', label: '联行号', required: false, keywords: ['联行号', '行号', '银行联行号', 'bankLineNo'] },
  { key: 'workerType', label: '工种', required: false, keywords: ['工种', '工人类别', 'workerType'] },
  { key: 'dailyWage', label: '日工资', required: false, keywords: ['日工资', '日薪', '单价', '日单价', 'dailyWage'] },
]

interface Preset {
  name: string
  headerSignature: string
  fieldMapping: Record<string, number>
}

export interface ImportState {
  sheetNames: string[]
  activeSheet: string
  headerRow: number
  headers: string[]
  previewRows: any[][]
  allRows: any[][]
  mapping: Record<string, number>
  fileName: string
  detectedPreset: string | null
}

export interface ImportProgress {
  completed: number
  total: number
  percent: number
  currentName: string
}

export interface ImportResult {
  success: number
  updated: number
  skipped: number
  failed: number
  failures: { row: number; reason: string }[]
  warnings: { row: number; name: string; message: string }[]
}

function computeHeaderSignature(headers: string[]): string {
  return headers.map(h => h.trim()).sort().join('|')
}

function autoMap(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  for (const field of WORKER_IMPORT_FIELDS) {
    let bestIdx = -1
    let bestScore = 0
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || '').toLowerCase().trim()
      for (const kw of field.keywords) {
        const kwLower = kw.toLowerCase()
        if (h === kwLower) { bestIdx = i; bestScore = 2; break }
        if (h.includes(kwLower) || kwLower.includes(h)) {
          if (bestScore < 1) { bestIdx = i; bestScore = 1 }
        }
      }
      if (bestScore === 2) break
    }
    mapping[field.key] = bestScore > 0 ? bestIdx : -1
  }
  return mapping
}

function confidenceForField(key: string, headers: string[]): number {
  const field = WORKER_IMPORT_FIELDS.find(f => f.key === key)
  if (!field) return 0
  let matched = 0
  for (const kw of field.keywords) {
    const kwLower = kw.toLowerCase()
    if (headers.some(h => String(h || '').toLowerCase().trim().includes(kwLower))) matched++
  }
  return Math.round((matched / field.keywords.length) * 100)
}

/** 过滤 null/空 headers 并对齐数据行（修复合并单元格列索引错位） */
function alignColumns(rawHeaders: any[], dataRows: any[][]): { headers: string[]; rows: any[][] } {
  // 找出有效（非空）表头的列索引
  const validColIndices: number[] = []
  const filteredHeaders: string[] = []
  const maxCols = Math.max(rawHeaders.length, ...dataRows.map(r => r.length))
  for (let i = 0; i < maxCols; i++) {
    const h = i < rawHeaders.length ? String(rawHeaders[i] || '').trim() : ''
    if (h) {
      validColIndices.push(i)
      filteredHeaders.push(h)
    }
  }
  if (validColIndices.length === rawHeaders.length) {
    // 无空列，直接返回
    return { headers: rawHeaders.map((h: any) => String(h || '').trim()), rows: dataRows }
  }
  // 按有效列索引对齐数据
  const alignedRows = dataRows.map(row => validColIndices.map(i => row[i]))
  return { headers: filteredHeaders, rows: alignedRows }
}

function detectCSVEncoding(buffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const text = decoder.decode(buffer)
    const replacementRatio = (text.match(/�/g) || []).length / Math.max(text.length, 1)
    if (replacementRatio > 0.01) throw new Error('High replacement char ratio')
    return 'utf-8'
  } catch {
    try {
      // Try GBK - note: 'gbk' label support varies by browser/Electron version
      const decoder = new TextDecoder('gbk')
      decoder.decode(buffer.slice(0, 100))
      return 'gbk'
    } catch {
      // Fallback: try gb2312, gb18030
      for (const enc of ['gb2312', 'gb18030']) {
        try {
          new TextDecoder(enc).decode(buffer.slice(0, 100))
          return enc
        } catch { continue }
      }
      return 'unknown'
    }
  }
}

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem('worker-import-presets')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePreset(name: string, headers: string[], mapping: Record<string, number>): boolean {
  try {
    const presets = loadPresets()
    const sig = computeHeaderSignature(headers)
    const existing = presets.findIndex(p => p.headerSignature === sig)
    const entry: Preset = { name, headerSignature: sig, fieldMapping: { ...mapping } }
    if (existing >= 0) presets[existing] = entry
    else presets.push(entry)
    localStorage.setItem('worker-import-presets', JSON.stringify(presets))
    return true
  } catch {
    return false
  }
}

function matchPreset(headers: string[]): Preset | null {
  const sig = computeHeaderSignature(headers)
  const presets = loadPresets()
  return presets.find(p => p.headerSignature === sig) || null
}

const WORKER_TYPE_MAP: Record<string, string> = {
  // 基础 12 种
  '砌筑工': 'bricklayer', '混凝土工': 'concreter', '钢筋工': 'steel',
  '模板工': 'formwork', '木工': 'carpenter', '油漆工': 'painter',
  '水暖工': 'plumber', '电工': 'electrician', '焊工': 'welder',
  '起重工': 'rigger', '驾驶员': 'driver', '机械工': 'mechanic', '其他': 'other',
  // 常见扩展
  '架子工': 'rigger', '防水工': 'other', '抹灰工': 'bricklayer',
  '涂料工': 'painter', '镶贴工': 'bricklayer', '管工': 'plumber',
  '通风工': 'other', '测量工': 'other', '桩机工': 'mechanic',
  '爆破工': 'other', '养护工': 'other', '石作业工': 'bricklayer',
  '金属工': 'steel', '电焊工': 'welder', '氩弧焊工': 'welder',
  '钢筋制作工': 'steel', '钢筋绑扎工': 'steel', '模板木工': 'formwork',
  '普通工': 'other', '杂工': 'other', '力工': 'other',
  '塔吊司机': 'driver', '挖掘机司机': 'driver', '装载机司机': 'driver',
  '吊车司机': 'driver', '叉车司机': 'driver',
  '信号工': 'rigger', '司索工': 'rigger',
  '幕墙工': 'other', '保温工': 'other', '隔热工': 'other',
  '装饰装修工': 'other',
}

// 模糊匹配：关键词 → code
const WORKER_TYPE_FUZZY: [string, string][] = [
  ['钢筋', 'steel'], ['模板', 'formwork'], ['砌筑', 'bricklayer'],
  ['混凝土', 'concreter'], ['水泥', 'concreter'],
  ['木', 'carpenter'], ['油漆', 'painter'], ['涂料', 'painter'],
  ['水暖', 'plumber'], ['管', 'plumber'],
  ['电', 'electrician'], ['焊', 'welder'],
  ['起重', 'rigger'], ['架子', 'rigger'],
  ['驾驶', 'driver'], ['司机', 'driver'],
  ['机械', 'mechanic'], ['桩机', 'mechanic'],
  ['抹灰', 'bricklayer'], ['砌', 'bricklayer'],
  ['防水', 'other'], ['保温', 'other'], ['通风', 'other'],
  ['测量', 'other'], ['爆破', 'other'],
  ['金属', 'steel'], ['装饰', 'other'], ['安装', 'other'],
]

function resolveWorkerType(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'other'
  // 精确匹配
  if (WORKER_TYPE_MAP[trimmed]) return WORKER_TYPE_MAP[trimmed]
  // 已经是 code
  if (Object.values(WORKER_TYPE_MAP).includes(trimmed)) return trimmed
  // 模糊匹配（按顺序，第一个命中即返回）
  for (const [keyword, code] of WORKER_TYPE_FUZZY) {
    if (trimmed.includes(keyword)) return code
  }
  return 'other'
}

function extractBirthDate(idCard: string): string | undefined {
  if (idCard.length !== 18) return undefined
  const birth = idCard.substring(6, 14)
  return `${birth.substring(0, 4)}-${birth.substring(4, 6)}-${birth.substring(6, 8)}`
}

function extractGender(idCard: string): string | undefined {
  if (idCard.length !== 18) return undefined
  const genderCode = parseInt(idCard.charAt(16))
  return genderCode % 2 === 0 ? '女' : '男'
}

export function useWorkerImport(existingIdCards: Set<string>) {
  const [importState, setImportState] = useState<ImportState | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [phase, setPhase] = useState<'idle' | 'mapping' | 'importing' | 'done'>('idle')

  const [error, setError] = useState<string | null>(null)
  const storedBufferRef = useRef<{ buf: ArrayBuffer; fileName: string; fileType: 'xlsx' | 'csv' } | null>(null)
  // 按字段名记录用户设为"不导入"的字段（不存列索引，跨表安全）
  const unmappedFields = useRef<Set<string>>(new Set())

  // Shared parser: re-parse stored buffer with new headerRow/sheetName
  const parseBuffer = useCallback(async (headerRow: number, sheetName?: string) => {
    const stored = storedBufferRef.current
    if (!stored) return
    setPhase('mapping')
    setResult(null)
    setProgress(null)
    setError(null)

    try {
      if (stored.fileType === 'csv') {
        const encoding = detectCSVEncoding(stored.buf)
        const text = new TextDecoder(encoding).decode(stored.buf)
        const rows = text.split(/\r?\n/).filter(r => r.trim()).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
        const headers = headerRow < rows.length ? rows[headerRow] : []
        const dataRows = rows.slice(headerRow + 1).filter((r) => r.some(c => c !== ''))
        const match = matchPreset(headers)
        const mapping = match ? { ...match.fieldMapping } : autoMap(headers)
        // 用户设为"不导入"的字段，强制 -1
        for (const key of unmappedFields.current) { mapping[key] = -1 }
        setImportState({
          sheetNames: [], activeSheet: '', headerRow,
          headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
          mapping,
          fileName: stored.fileName, detectedPreset: match?.name || null,
        })
        return
      }

      const XLSX = await import('xlsx')
      const wb = XLSX.read(stored.buf, { type: 'array' })
      const sName = sheetName || wb.SheetNames[0]
      const ws = wb.Sheets[sName]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const rawHeaders: any[] = headerRow < rows.length ? rows[headerRow] as any[] : []
      const rawDataRows = (rows.slice(1).filter((r) => (r as any[]).some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''))) as any[][]
      // 过滤 null 表头并对齐数据列（修复合并单元格列索引错位）
      const { headers, rows: dataRows } = alignColumns(rawHeaders, rawDataRows)
      const match2 = matchPreset(headers)
      const mapping2 = match2 ? { ...match2.fieldMapping } : autoMap(headers)
      // 用户设为"不导入"的字段，强制 -1
      for (const key of unmappedFields.current) { mapping2[key] = -1 }
      setImportState({
        sheetNames: wb.SheetNames, activeSheet: sName, headerRow,
        headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
        mapping: mapping2,
        fileName: stored.fileName, detectedPreset: match2?.name || null,
      })
    } catch (err) {
      console.error('[WorkerImport] Re-parse error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Cannot read properties of undefined')) {
        setError('文件解析失败：表格结构异常，请检查是否有合并单元格、空表头或特殊格式，建议另存为 .csv (UTF-8) 后重试')
      } else {
        setError('文件解析失败: ' + msg.substring(0, 80))
      }
      setImportState(null)
    }
  }, [])

  const parseFile = useCallback((file: File) => {
    setPhase('mapping')
    setResult(null)
    setProgress(null)
    setError(null)
    unmappedFields.current = new Set()

    const reader = new FileReader()
    reader.onerror = () => {
      console.error('[WorkerImport] FileReader error:', reader.error)
      setError('文件读取失败，请重试')
    }
    reader.onload = async (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        if (!buf || buf.byteLength === 0) {
          setError('文件为空，请检查文件内容')
          return
        }

        // Store buffer for re-parsing
        storedBufferRef.current = { buf, fileName: file.name, fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx' }

        let wb: any

        if (file.name.endsWith('.csv')) {
          const encoding = detectCSVEncoding(buf)
          if (encoding === 'unknown') {
            setError('无法识别文件编码，请将文件另存为 UTF-8 格式后重试')
            return
          }
          const text = new TextDecoder(encoding).decode(buf)
          const rows = text.split('\n').filter(r => r.trim()).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
          const headers = rows.length > 0 ? rows[0] : []
          const dataRows = rows.slice(1).filter((r: string[]) => r.some(c => c !== ''))
          const match = matchPreset(headers)
          const initialMapping = match ? match.fieldMapping : autoMap(headers)
          setImportState({
            sheetNames: [], activeSheet: '', headerRow: 0,
            headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
            mapping: initialMapping,
            fileName: file.name, detectedPreset: match?.name || null,
          })
          storedBufferRef.current = { buf, fileName: file.name, fileType: 'csv' }
          return
        }

        const XLSX = await import('xlsx')
        wb = XLSX.read(buf, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
        const rawHeaders = rows.length > 0 ? rows[0] : []
        const rawDataRows = rows.slice(1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
        // 过滤 null 表头并对齐数据列（修复合并单元格列索引错位）
        const { headers, rows: dataRows } = alignColumns(rawHeaders, rawDataRows)
        const match = matchPreset(headers)
        const initialMapping = match ? match.fieldMapping : autoMap(headers)
        setImportState({
          sheetNames: wb.SheetNames, activeSheet: sheetName, headerRow: 0,
          headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
          mapping: initialMapping,
          fileName: file.name, detectedPreset: match?.name || null,
        })
        storedBufferRef.current = { buf, fileName: file.name, fileType: 'xlsx' }
      } catch (err) {
        console.error('[WorkerImport] Parse error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Unsupported file') || msg.includes('CFB') || msg.includes('zip')) {
          setError('不支持的文件格式，请确认文件为有效的 Excel 文件')
        } else if (msg.includes('password') || msg.includes('encrypted')) {
          setError('不支持加密文件，请先解密后重试')
        } else if (msg.includes('Cannot read properties of undefined')) {
          setError('文件解析失败：表格结构异常，请检查是否有合并单元格、空表头或特殊格式，建议另存为 .csv (UTF-8) 后重试')
        } else {
          setError(`文件解析失败: ${msg.substring(0, 80)}`)
        }
        setImportState(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const switchSheet = useCallback((sheetName: string) => {
    const prev = importState
    if (!storedBufferRef.current || !prev) return
    parseBuffer(prev.headerRow, sheetName)
  }, [importState, parseBuffer])

  const setHeaderRow = useCallback((rowIdx: number) => {
    if (!storedBufferRef.current) return
    parseBuffer(rowIdx, importState?.activeSheet)
  }, [importState?.activeSheet, parseBuffer])

  const setMapping = useCallback((key: string, colIdx: number) => {
    // 记录用户设为"不导入"的字段（按字段名，跨表安全）
    if (colIdx === -1) unmappedFields.current.add(key)
    else unmappedFields.current.delete(key)
    setImportState(prev => prev ? { ...prev, mapping: { ...prev.mapping, [key]: colIdx } } : null)
  }, [])

  const getConfidence = useCallback((key: string): number => {
    if (!importState) return 0
    return confidenceForField(key, importState.headers)
  }, [importState])

  const executeImport = useCallback(async (
    createMember: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>,
    onComplete: () => void
  ) => {
    if (!importState) return
    setPhase('importing')
    setProgress({ completed: 0, total: importState.allRows.length, percent: 0, currentName: '' })

    const resultAcc: ImportResult = { success: 0, updated: 0, skipped: 0, failed: 0, failures: [], warnings: [] }

    for (let i = 0; i < importState.allRows.length; i += 50) {
      const batch = importState.allRows.slice(i, i + 50)
      const batchResults = await Promise.all(batch.map(async (row, bi) => {
        const rowIdx = i + bi + 2 // +2 for 1-indexed + header row
        const rowData: Partial<WorkerImportRow> = {}

        for (const field of WORKER_IMPORT_FIELDS) {
          const colIdx = importState.mapping[field.key]
          if (colIdx >= 0 && colIdx < row.length) {
            const val = row[colIdx]
            ;(rowData as any)[field.key] = val !== undefined && val !== null ? String(val).trim() : ''
          }
        }

        // Skip completely empty rows (blank/summary rows in Excel)
        if (!rowData.name && !rowData.idCard) return { ok: true, skipped: true, name: '', row: rowIdx }

        // Validate required
        if (!rowData.name) return { ok: false, row: rowIdx, reason: '缺少姓名' }
        if (!rowData.idCard) return { ok: false, row: rowIdx, reason: '缺少身份证号' }
        if (rowData.idCard && (rowData.idCard.length !== 18 || !/^\d{17}[\dXx]$/.test(rowData.idCard))) {
          return { ok: false, row: rowIdx, reason: '身份证号格式错误: ' + rowData.idCard }
        }

        // Auto-extract from ID card
        const gender = rowData.gender || extractGender(rowData.idCard)
        const birthDate = rowData.birthDate || extractBirthDate(rowData.idCard)

        // Build field values from this row
        const rowFields: Record<string, any> = {
          gender, birthDate,
          ethnicity: rowData.ethnicity || undefined,
          phone: rowData.phone || undefined,
          address: rowData.address || undefined,
          bankAccount: rowData.bankAccount || undefined,
          bankName: rowData.bankName || undefined,
          bankLineNo: rowData.bankLineNo || undefined,
          workerType: rowData.workerType ? rowData.workerType.trim() : undefined,
          dailyWage: rowData.dailyWage ? Number(rowData.dailyWage) || undefined : undefined,
        }

        // Check if worker already exists in global pool
        try {
          const workerRes = await window.electronAPI.getWorkers(rowData.idCard)
          if (workerRes.success && workerRes.data && workerRes.data.length > 0) {
            const existing = workerRes.data[0]
            // Build update: only overwrite fields that have new non-empty values
            const update: Record<string, any> = { id: existing.id }
            let hasChanges = false
            for (const [key, val] of Object.entries(rowFields)) {
              if (val !== undefined && val !== '' && val !== null) {
                update[key] = val
                hasChanges = true
              }
            }
            if (hasChanges) {
              const updRes = await window.electronAPI.updateWorker(update as any)
              if (!updRes.success) {
                return { ok: false, row: rowIdx, reason: updRes.error || '更新工人失败' }
              }
              return { ok: true, name: rowData.name, isUpdated: true }
            }
            return { ok: true, name: rowData.name, isExistingWorker: true }
          }
        } catch {
          return { ok: false, row: rowIdx, reason: '工人库查询失败' }
        }

        // Create new Worker in global pool
        const newWorkerRes = await window.electronAPI.createWorker({
          name: rowData.name,
          idCard: rowData.idCard,
          ...rowFields
        })
        if (!newWorkerRes.success) {
          return { ok: false, row: rowIdx, reason: newWorkerRes.error || '创建工人失败' }
        }
        existingIdCards.add(rowData.idCard!)
        return { ok: true, name: rowData.name, isExistingWorker: false }
      }))

      for (const r of batchResults) {
        if ((r as any).skipped) {
          continue // skip blank/summary rows silently
        } else if (r.ok) {
          if ((r as any).isUpdated) {
            resultAcc.updated++
          } else {
            resultAcc.success++
          }
          if ((r as any).warning) {
            resultAcc.warnings.push({ row: r.row!, name: (r as any).name, message: (r as any).warning })
          }
        } else { resultAcc.failed++; resultAcc.failures.push({ row: r.row ?? 0, reason: r.reason ?? '未知错误' }) }
      }

      const completed = Math.min(i + 50, importState.allRows.length)
      setProgress({
        completed, total: importState.allRows.length,
        percent: Math.round((completed / importState.allRows.length) * 100),
        currentName: batchResults.find(r => r.ok)?.name || '',
      })
    }

    setResult(resultAcc)
    setPhase('done')
    onComplete()
  }, [importState, existingIdCards])

  const saveCurrentMappingAsPreset = useCallback((name: string): boolean => {
    if (!importState) return false
    return savePreset(name, importState.headers, importState.mapping)
  }, [importState])

  const reset = useCallback(() => {
    setImportState(null)
    setProgress(null)
    setResult(null)
    setError(null)
    setPhase('idle')
    unmappedFields.current = new Set()
  }, [])

  return {
    importState, progress, result, phase, error,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset,
  }
}
