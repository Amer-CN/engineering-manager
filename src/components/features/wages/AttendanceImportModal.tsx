import React, { useState, useMemo } from 'react'
import { Icon } from '../../ui/Icon'
import { autoMapColumns } from './autoMapColumns'
import { AttendanceImportBody } from './AttendanceImportBody'
import { Button } from '../../ui/Button'

export interface MatchedRow {
  name: string
  idCard: string
  workDays: number
  rawData: unknown[]
  matched: boolean
  workerName: string | null
  projectWorkerId: number | null
  teamName: string | null
}

export interface ImportState {
  sheetNames: string[]
  activeSheet: string
  headerRow: number
  headers: string[]
  previewRows: unknown[][]
  allRows: unknown[][]
  nameCol: number
  workDaysCol: number
  idCardCol: number
}

interface Props {
  show: boolean
  projectId: number
  yearMonth: string
  workerList: { id: number; name: string; teamName?: string; idCard: string }[]
  onClose: () => void
  onImport: (data: { projectWorkerId: number; workDays: number; workerName: string }[]) => void
}

const defaultState: ImportState = {
  sheetNames: [], activeSheet: '', headerRow: 0, headers: [],
  previewRows: [], allRows: [], nameCol: -1, workDaysCol: -1, idCardCol: -1,
}

export const AttendanceImportModal: React.FC<Props> = ({ show, projectId, yearMonth, workerList, onClose, onImport }) => {
  const [state, setState] = useState<ImportState>(defaultState)
  const [wbBuffer, setWbBuffer] = useState<ArrayBuffer | null>(null)

  const loadSheet = async (wb: { Sheets: Record<string, unknown> }, sheetName: string, hRow?: number) => {
    const XLSX = await import('xlsx')
    const headerRow = hRow ?? 0
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws as never, { header: 1 }) as unknown[][]
    const headers = rows.length > headerRow ? rows[headerRow].map((h: unknown) => String(h || '').trim()) : []
    const dataRows = rows.slice(headerRow + 1).filter((r: unknown[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
    const preview = dataRows.slice(0, 10)
    const { nameCol, workDaysCol, idCardCol } = autoMapColumns(headers)
    setState({ headerRow, activeSheet: sheetName, headers, previewRows: preview, allRows: dataRows, nameCol, workDaysCol, idCardCol, sheetNames: state.sheetNames })
  }

  const switchSheet = async (name: string) => {
    if (!wbBuffer) return
    try { const XLSX = await import('xlsx'); const wb = XLSX.read(wbBuffer, { type: 'array' }); loadSheet(wb, name, state.headerRow) } catch (err) { console.warn('[AttendanceImport] 切换工作表失败:', err) }
  }

  const changeHeaderRow = async (row: number) => {
    if (!wbBuffer) return
    try { const XLSX = await import('xlsx'); const wb = XLSX.read(wbBuffer, { type: 'array' }); loadSheet(wb, state.activeSheet, row) } catch (err) { console.warn('[AttendanceImport] 切换表头行失败:', err) }
  }

  // Match rows against project worker list (ID card first, then name)
  const matchedRows = useMemo((): MatchedRow[] => {
    const { allRows, nameCol, workDaysCol, idCardCol } = state
    if (nameCol === -1 || allRows.length === 0) return []

    // Lookups: idCard → worker, name → worker
    const workerByIdCard = new Map<string, typeof workerList[0]>()
    const workerByName = new Map<string, typeof workerList[0]>()
    workerList.forEach(w => {
      if (w.idCard) workerByIdCard.set(w.idCard.replace(/\s+/g, ''), w)
      workerByName.set(w.name.replace(/\s+/g, ''), w)
    })

    return allRows.map(row => {
      const rawName = nameCol >= 0 ? String(row[nameCol] || '').trim() : ''
      const rawIdCard = idCardCol >= 0 ? String(row[idCardCol] || '').replace(/\s+/g, '') : ''
      const rawDays = workDaysCol >= 0 ? parseFloat(String(row[workDaysCol]).replace(/[^\d.]/g, '')) || 0 : 0

      // Match: ID card first (precise), then name (fallback)
      let worker = undefined
      if (rawIdCard) worker = workerByIdCard.get(rawIdCard)
      if (!worker) {
        const normName = rawName.replace(/\s+/g, '')
        worker = workerByName.get(normName)
      }
      return {
        name: rawName,
        idCard: rawIdCard,
        workDays: rawDays,
        rawData: row,
        matched: !!worker,
        workerName: worker?.name || null,
        projectWorkerId: worker?.id || null,
        teamName: worker?.teamName || null,
      }
    }).filter(r => r.name && r.workDays > 0)
  }, [state, workerList])

  const unmatchedCount = matchedRows.filter(r => !r.matched).length
  const matchedCount = matchedRows.filter(r => r.matched).length

  const confirmImport = () => {
    const data = matchedRows
      .filter(r => r.matched && r.projectWorkerId != null && r.workDays > 0)
      .map(r => ({ projectWorkerId: r.projectWorkerId!, workDays: r.workDays, workerName: r.workerName! }))
    if (data.length > 0) onImport(data)
    onClose()
  }

  if (!show) return null

  const months = yearMonth.split('-')
  const monthLabel = `${months[0]}年${parseInt(months[1])}月`

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-[color:var(--card)] rounded-xl shadow-xl w-[95vw] max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-[color:var(--fg)]">导入考勤 — {monthLabel}</h3>
          <button onClick={onClose} className="text-[color:var(--muted)] hover:text-[color:var(--fg-2)]"><Icon name="X" size={20} /></button>
        </div>

        <AttendanceImportBody
          state={state}
          switchSheet={switchSheet}
          changeHeaderRow={changeHeaderRow}
          loadSheet={loadSheet}
          setWbBuffer={setWbBuffer}
          setState={setState}
          matchedRows={matchedRows}
          matchedCount={matchedCount}
          unmatchedCount={unmatchedCount}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[color:var(--border)] flex items-center justify-between shrink-0">
          <span className="text-sm text-[color:var(--muted)]">
            {matchedRows.length > 0
              ? `将导入 ${matchedCount} 条考勤记录${unmatchedCount > 0 ? `（${unmatchedCount} 条未匹配跳过）` : ''}`
              : '请先选择 Excel 文件'
            }
          </span>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onClose}  variant="secondary" className="text-sm">取消</Button>
            <Button type="button" onClick={confirmImport} disabled={matchedCount === 0}
               variant="primary" className="text-sm disabled:opacity-50">
              确认导入 ({matchedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
