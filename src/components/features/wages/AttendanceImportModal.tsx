import React, { useState, useMemo } from 'react'
import { Icon } from '../../ui/Icon'
import * as XLSX from 'xlsx'

interface MatchedRow {
  name: string
  idCard: string
  workDays: number
  rawData: any[]
  matched: boolean
  workerName: string | null
  projectWorkerId: number | null
  teamName: string | null
}

interface Props {
  show: boolean
  projectId: number
  yearMonth: string
  workerList: { id: number; name: string; teamName?: string; idCard: string }[]
  onClose: () => void
  onImport: (data: { projectWorkerId: number; workDays: number; workerName: string }[]) => void
}

interface ImportState {
  sheetNames: string[]
  activeSheet: string
  headerRow: number
  headers: string[]
  previewRows: any[][]
  allRows: any[][]
  nameCol: number
  workDaysCol: number
  idCardCol: number
}

const defaultState: ImportState = {
  sheetNames: [], activeSheet: '', headerRow: 0, headers: [],
  previewRows: [], allRows: [], nameCol: -1, workDaysCol: -1, idCardCol: -1,
}

// Detect name, work-days, and ID card columns from header row
function autoMap(headers: string[]): { nameCol: number; workDaysCol: number; idCardCol: number } {
  let nameCol = -1; let workDaysCol = -1; let idCardCol = -1
  headers.forEach((h, i) => {
    const l = h.toLowerCase().replace(/\s+/g, '')
    if (nameCol === -1 && (l.includes('姓名') || l.includes('名字') || l === 'name')) nameCol = i
    if (idCardCol === -1 && (l.includes('身份证') || l.includes('证件') || l.includes('idcard'))) idCardCol = i
    if (workDaysCol === -1 && (l.includes('勤') || (l.includes('天') && l.includes('数')) || l.includes('工作量') || l.includes('计时'))) workDaysCol = i
  })
  // Fallback workDaysCol
  if (workDaysCol === -1) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].replace(/\s+/g, '')
      if (h.includes('天') || h.includes('工') && !h.includes('工资')) { workDaysCol = i; break }
    }
  }
  return { nameCol, workDaysCol, idCardCol }
}

export const AttendanceImportModal: React.FC<Props> = ({ show, projectId, yearMonth, workerList, onClose, onImport }) => {
  const [state, setState] = useState<ImportState>(defaultState)
  const [wbBuffer, setWbBuffer] = useState<ArrayBuffer | null>(null)

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string, hRow?: number) => {
    const headerRow = hRow ?? 0
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
    const headers = rows.length > headerRow ? rows[headerRow].map((h: any) => String(h || '').trim()) : []
    const dataRows = rows.slice(headerRow + 1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
    const preview = dataRows.slice(0, 10)
    const { nameCol, workDaysCol, idCardCol } = autoMap(headers)
    setState({ headerRow, activeSheet: sheetName, headers, previewRows: preview, allRows: dataRows, nameCol, workDaysCol, idCardCol, sheetNames: state.sheetNames })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        setWbBuffer(buf)
        const wb = XLSX.read(buf, { type: 'array' })
        setState({ ...defaultState, sheetNames: wb.SheetNames })
        if (wb.SheetNames.length > 0) loadSheet(wb, wb.SheetNames[0])
      } catch (err) { console.error('Excel读取失败:', err) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const switchSheet = (name: string) => {
    if (!wbBuffer) return
    try { const wb = XLSX.read(wbBuffer, { type: 'array' }); loadSheet(wb, name, state.headerRow) } catch {}
  }

  const changeHeaderRow = (row: number) => {
    if (!wbBuffer) return
    try { const wb = XLSX.read(wbBuffer, { type: 'array' }); loadSheet(wb, state.activeSheet, row) } catch {}
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
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">导入考勤 — {monthLabel}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="X" size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* File picker */}
          {state.sheetNames.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
              <Icon name="Upload" size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-3">选择 Excel 文件（.xlsx / .xls）</p>
              <label className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium cursor-pointer inline-block transition-colors">
                选择文件
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              <p className="text-xs text-slate-400 mt-3">表格需包含"姓名"和"出勤天数"列，身份证号列可提高匹配精度</p>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex items-center gap-6 flex-wrap">
                {state.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">工作表：</label>
                    <select value={state.activeSheet} onChange={e => switchSheet(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                      {state.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">表头行：</label>
                  <select value={state.headerRow} onChange={e => changeHeaderRow(parseInt(e.target.value))} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                    {Array.from({ length: 8 }, (_, i) => <option key={i} value={i}>第 {i + 1} 行</option>)}
                  </select>
                  <span className="text-xs text-slate-400">（表头前面的行会被跳过）</span>
                </div>
              </div>

              {/* Column mapping */}
              {state.headers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">列映射</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">姓名列 *</label>
                      <select value={state.nameCol} onChange={e => setState(p => ({ ...p, nameCol: parseInt(e.target.value) }))} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                        <option value={-1}>不导入</option>
                        {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">出勤天数列 *</label>
                      <select value={state.workDaysCol} onChange={e => setState(p => ({ ...p, workDaysCol: parseInt(e.target.value) }))} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                        <option value={-1}>不导入</option>
                        {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">身份证号列</label>
                      <select value={state.idCardCol} onChange={e => setState(p => ({ ...p, idCardCol: parseInt(e.target.value) }))} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                        <option value={-1}>不导入（只用姓名匹配）</option>
                        {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview table */}
              {state.previewRows.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    数据预览（前 {state.previewRows.length} 行，共 {state.allRows.length} 行）
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {state.headers.map((h, i) => (
                            <th key={i} className={`px-3 py-2 text-left font-medium whitespace-nowrap ${
                              i === state.nameCol ? 'text-emerald-600 bg-emerald-50' :
                              i === state.workDaysCol ? 'text-amber-600 bg-amber-50' :
                              i === state.idCardCol ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
                            }`}>{h || `列${i + 1}`}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.previewRows.map((row, ri) => (
                          <tr key={ri} className="table-row-hover">
                            {state.headers.map((_, ci) => (
                              <td key={ci} className={`px-3 py-1.5 whitespace-nowrap ${
                                ci === state.nameCol ? 'text-emerald-700' :
                                ci === state.workDaysCol ? 'text-amber-700 font-medium' :
                                ci === state.idCardCol ? 'text-blue-700' : 'text-slate-600'
                              }`}>{row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Match results */}
              {matchedRows.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    工人匹配结果（
                    <span className="text-emerald-600">{matchedCount} 人匹配成功</span>
                    {unmatchedCount > 0 && <span className="text-red-500">，{unmatchedCount} 人未匹配</span>}
                    ）
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">Excel姓名</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">身份证号</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">出勤天数</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-500">匹配结果</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matchedRows.map((r, i) => (
                          <tr key={i} className={`table-row-hover ${!r.matched ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-1.5 text-slate-700">{r.name}</td>
                            <td className="px-3 py-1.5 text-slate-400 font-mono text-[11px]">{r.idCard || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-amber-700">{r.workDays}</td>
                            <td className="px-3 py-1.5">
                              {r.matched ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Icon name="Check" size={14} /> {r.workerName}{r.teamName ? ` (${r.teamName})` : ''}
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center gap-1">
                                  <Icon name="X" size={14} /> 未匹配 — 请先在工人管理中录入该工人
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">
            {matchedRows.length > 0
              ? `将导入 ${matchedCount} 条考勤记录${unmatchedCount > 0 ? `（${unmatchedCount} 条未匹配跳过）` : ''}`
              : '请先选择 Excel 文件'
            }
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm">取消</button>
            <button type="button" onClick={confirmImport} disabled={matchedCount === 0}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              确认导入 ({matchedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
