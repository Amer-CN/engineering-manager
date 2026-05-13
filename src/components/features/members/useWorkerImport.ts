import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import type { WorkerTeam } from '@/types'

export interface WorkerImportRow {
  name: string
  idCard: string
  gender?: string
  birthDate?: string
  ethnicity?: string
  phone?: string
  teamName?: string
  dailyWage?: number
  entryDate?: string
  workerType?: string
  address?: string
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
  { key: 'teamName', label: '班组', required: false, keywords: ['班组', '队伍', '所属班组', '施工队'] },
  { key: 'dailyWage', label: '日工资', required: false, keywords: ['日薪', '日工资', '工资', '薪资', '单价'] },
  { key: 'entryDate', label: '进场日期', required: false, keywords: ['进场', '进场日期', '入场日期', '入职日期', '日期'] },
  { key: 'workerType', label: '工种', required: false, keywords: ['工种', '类型', '岗位'] },
  { key: 'address', label: '地址', required: false, keywords: ['地址', '住址', '身份证地址', '户籍'] },
  { key: 'ethnicity', label: '民族', required: false, keywords: ['民族', 'ethnicity'] },
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
  skipped: number
  failed: number
  failures: { row: number; reason: string }[]
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

export function useWorkerImport(workerTeams: WorkerTeam[], existingIdCards: Set<string>) {
  const [importState, setImportState] = useState<ImportState | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [phase, setPhase] = useState<'idle' | 'mapping' | 'importing' | 'done'>('idle')

  const [error, setError] = useState<string | null>(null)
  const storedBufferRef = useRef<{ buf: ArrayBuffer; fileName: string; fileType: 'xlsx' | 'csv' } | null>(null)

  // Shared parser: re-parse stored buffer with new headerRow/sheetName
  const parseBuffer = useCallback((headerRow: number, sheetName?: string) => {
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
        setImportState({
          sheetNames: [], activeSheet: '', headerRow,
          headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
          mapping: match ? match.fieldMapping : autoMap(headers),
          fileName: stored.fileName, detectedPreset: match?.name || null,
        })
        return
      }

      const wb = XLSX.read(stored.buf, { type: 'array' })
      const sName = sheetName || wb.SheetNames[0]
      const ws = wb.Sheets[sName]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const headers = headerRow < rows.length ? rows[headerRow].map((h) => String(h || '').trim()) : []
      const dataRows = rows.slice(headerRow + 1).filter((r) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
      const match = matchPreset(headers)
      setImportState({
        sheetNames: wb.SheetNames, activeSheet: sName, headerRow,
        headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
        mapping: match ? match.fieldMapping : autoMap(headers),
        fileName: stored.fileName, detectedPreset: match?.name || null,
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

    const reader = new FileReader()
    reader.onerror = () => {
      console.error('[WorkerImport] FileReader error:', reader.error)
      setError('文件读取失败，请重试')
    }
    reader.onload = (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        if (!buf || buf.byteLength === 0) {
          setError('文件为空，请检查文件内容')
          return
        }

        // Store buffer for re-parsing
        storedBufferRef.current = { buf, fileName: file.name, fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx' }

        let wb: XLSX.WorkBook

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
          setImportState({
            sheetNames: [], activeSheet: '', headerRow: 0,
            headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
            mapping: match ? match.fieldMapping : autoMap(headers),
            fileName: file.name, detectedPreset: match?.name || null,
          })
          storedBufferRef.current = { buf, fileName: file.name, fileType: 'csv' }
          return
        }

        wb = XLSX.read(buf, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
        const headers = rows.length > 0 ? rows[0].map((h: any) => String(h || '').trim()) : []
        const dataRows = rows.slice(1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
        const match = matchPreset(headers)
        setImportState({
          sheetNames: wb.SheetNames, activeSheet: sheetName, headerRow: 0,
          headers, previewRows: dataRows.slice(0, 10), allRows: dataRows,
          mapping: match ? match.fieldMapping : autoMap(headers),
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

    const resultAcc: ImportResult = { success: 0, skipped: 0, failed: 0, failures: [] }

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

        // Validate required
        if (!rowData.name) return { ok: false, row: rowIdx, reason: '缺少姓名' }
        if (!rowData.idCard) return { ok: false, row: rowIdx, reason: '缺少身份证号' }
        if (rowData.idCard && (rowData.idCard.length !== 18 || !/^\d{17}[\dXx]$/.test(rowData.idCard))) {
          return { ok: false, row: rowIdx, reason: '身份证号格式错误: ' + rowData.idCard }
        }

        // Team/dailyWage are optional — only needed when assigning to a project team
        const teamName = rowData.teamName || ''
        let team: any = null
        let hasTeamInfo = false
        if (teamName) {
          team = workerTeams.find(t => t.name.toLowerCase().trim() === teamName.toLowerCase().trim())
          if (!team) {
            return { ok: false, row: rowIdx, reason: '班组不存在: "' + teamName + '"' }
          }
          if (rowData.dailyWage && !isNaN(Number(rowData.dailyWage)) && Number(rowData.dailyWage) > 0) {
            hasTeamInfo = true
          }
        }

// Auto-extract from ID card
        const gender = rowData.gender || extractGender(rowData.idCard)
        const birthDate = rowData.birthDate || extractBirthDate(rowData.idCard)

        let workerId: number
        let isExistingWorker = false

        // Check if worker already exists in global pool
        try {
          const workerRes = await window.electronAPI.getWorkers(rowData.idCard)
          if (workerRes.success && workerRes.data && workerRes.data.length > 0) {
            workerId = workerRes.data[0].id
            isExistingWorker = true
          } else {
            // Create new Worker in global pool
            const newWorkerRes = await window.electronAPI.createWorker({
              name: rowData.name,
              idCard: rowData.idCard,
              gender,
              birthDate,
              ethnicity: rowData.ethnicity || undefined,
              phone: rowData.phone || undefined,
              address: rowData.address || undefined
            })
            if (!newWorkerRes.success) {
              return { ok: false, row: rowIdx, reason: newWorkerRes.error || '创建工人失败' }
            }
            workerId = newWorkerRes.data!.id
            existingIdCards.add(rowData.idCard!)
          }
        } catch {
          return { ok: false, row: rowIdx, reason: '工人库查询失败' }
        }

        // Create ProjectWorker only if team info is provided
        if (hasTeamInfo && team) {
          try {
            const pwRes = await window.electronAPI.createProjectWorker({
              workerId,
              projectId: team.projectId,
              teamId: team.id,
              dailyWage: Number(rowData.dailyWage),
              workerType: rowData.workerType || 'other',
              entryDate: rowData.entryDate || new Date().toISOString().split('T')[0],
              status: 'active' as const
            })
            if (!pwRes.success) {
              return { ok: false, row: rowIdx, reason: pwRes.error || '添加工人失败' }
            }
          } catch {
            return { ok: false, row: rowIdx, reason: '创建用工关系失败' }
          }
        }
        return { ok: true, name: rowData.name, isExistingWorker }
      }))

      for (const r of batchResults) {
        if (r.ok) resultAcc.success++
        else if ((r as any).skipped) resultAcc.skipped++
        else { resultAcc.failed++; resultAcc.failures.push({ row: r.row, reason: r.reason }) }
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
  }, [importState, workerTeams, existingIdCards])

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
  }, [])

  return {
    importState, progress, result, phase, error,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset,
  }
}
