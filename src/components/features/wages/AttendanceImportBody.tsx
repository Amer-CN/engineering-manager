import React from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Icon } from '../../ui/Icon'
import { DropZone } from './DropZone'
import type { MatchedRow, ImportState } from './AttendanceImportModal'

interface Props {
  state: ImportState
  switchSheet: (name: string) => void
  changeHeaderRow: (row: number) => void
  loadSheet: (wb: any, sheetName: string, hRow?: number) => Promise<void>
  setWbBuffer: React.Dispatch<React.SetStateAction<ArrayBuffer | null>>
  setState: React.Dispatch<React.SetStateAction<ImportState>>
  matchedRows: MatchedRow[]
  matchedCount: number
  unmatchedCount: number
}

export const AttendanceImportBody: React.FC<Props> = ({
  state, switchSheet, changeHeaderRow, loadSheet, setWbBuffer, setState,
  matchedRows, matchedCount, unmatchedCount,
}) => {
  const previewColumns: Column<any>[] = state.headers.map((h, i) => ({
    key: `col_${i}`,
    title: h || `列${i + 1}`,
    render: (_row: any, index: number) => {
      const row = state.previewRows[index]
      if (!row) return null
      const val = row[i]
      return <span className={`whitespace-nowrap ${
        i === state.nameCol ? 'text-success-700' :
        i === state.workDaysCol ? 'text-warning-700 font-medium' :
        i === state.idCardCol ? 'text-[color:var(--accent)]' : 'text-[color:var(--fg-2)]'
      }`}>{val !== undefined && val !== null ? String(val) : ''}</span>
    }
  }))

  const matchColumns: Column<MatchedRow>[] = [
    { key: 'name', title: 'Excel姓名', render: (r) => <span className="text-[color:var(--fg-2)]">{r.name}</span> },
    { key: 'idCard', title: '身份证号', render: (r) => <span className="text-[color:var(--muted)] font-mono text-micro">{r.idCard || '—'}</span> },
    { key: 'workDays', title: '出勤天数', align: 'right', render: (r) => <span className="font-medium text-warning-700">{r.workDays}</span> },
    {
      key: 'matchResult', title: '匹配结果',
      render: (r) => r.matched ? (
        <span className="text-success-600 flex items-center gap-1">
          <Icon name="Check" size={14} /> {r.workerName}{r.teamName ? ` (${r.teamName})` : ''}
        </span>
      ) : (
        <span className="text-danger-500 flex items-center gap-1">
          <Icon name="X" size={14} /> 未匹配 — 请先在工人管理中录入该工人
        </span>
      )
    },
  ]

  return (
    <div className="p-6 overflow-y-auto flex-1 space-y-4">
      {state.sheetNames.length === 0 ? (
        <DropZone onFile={(file) => {
          const reader = new FileReader()
          reader.onload = async (ev) => {
            try {
              const buf = ev.target?.result as ArrayBuffer
              setWbBuffer(buf)
              const XLSX = await import('xlsx')
              const wb = XLSX.read(buf, { type: 'array' })
              setState({ ...{ sheetNames: [], activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [], nameCol: -1, workDaysCol: -1, idCardCol: -1 }, sheetNames: wb.SheetNames })
              if (wb.SheetNames.length > 0) loadSheet(wb, wb.SheetNames[0])
            } catch (err) { console.error('Excel读取失败:', err) }
          }
          reader.readAsArrayBuffer(file)
        }}>
          {(dragging) => (
            <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragging ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)]'
            }`}>
              <Icon name="Upload" size={40} className="text-[color:var(--border-strong)] mx-auto mb-3" />
              <p className="text-[color:var(--muted)] mb-3">{dragging ? '松开鼠标导入文件' : '拖拽 Excel 文件到此处，或点击选择'}</p>
              <label className={`${dragging ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--accent)] hover:opacity-90'} text-[color:var(--on-accent)] px-6 py-2 rounded-lg font-medium cursor-pointer inline-block transition-colors`}>
                选择文件
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = async (ev) => {
                    try {
                      const buf = ev.target?.result as ArrayBuffer
                      setWbBuffer(buf)
                      const XLSX = await import('xlsx')
                      const wb = XLSX.read(buf, { type: 'array' })
                      setState({ ...{ sheetNames: [], activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [], nameCol: -1, workDaysCol: -1, idCardCol: -1 }, sheetNames: wb.SheetNames })
                      if (wb.SheetNames.length > 0) loadSheet(wb, wb.SheetNames[0])
                    } catch (err) { console.error('Excel读取失败:', err) }
                  }
                  reader.readAsArrayBuffer(file)
                  e.target.value = ''
                }} />
              </label>
              <p className="text-xs text-[color:var(--muted)] mt-3">表格需包含"姓名"和"出勤天数"列，身份证号列可提高匹配精度</p>
            </div>
          )}
        </DropZone>
      ) : (
        <>
          <div className="flex items-center gap-6 flex-wrap">
            {state.sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[color:var(--fg-2)]">工作表：</label>
                <select value={state.activeSheet} onChange={e => switchSheet(e.target.value)} className="select text-sm">
                  {state.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[color:var(--fg-2)]">表头行：</label>
              <select value={state.headerRow} onChange={e => changeHeaderRow(parseInt(e.target.value))} className="select text-sm">
                {Array.from({ length: 8 }, (_, i) => <option key={i} value={i}>第 {i + 1} 行</option>)}
              </select>
              <span className="text-xs text-[color:var(--muted)]">（表头前面的行会被跳过）</span>
            </div>
          </div>

          {state.headers.length > 0 && (
            <div>
              <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">列映射</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[color:var(--muted)] block mb-1">姓名列 *</label>
                  <select value={state.nameCol} onChange={e => setState(p => ({ ...p, nameCol: parseInt(e.target.value) }))} className="select text-sm">
                    <option value={-1}>不导入</option>
                    {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[color:var(--muted)] block mb-1">出勤天数列 *</label>
                  <select value={state.workDaysCol} onChange={e => setState(p => ({ ...p, workDaysCol: parseInt(e.target.value) }))} className="select text-sm">
                    <option value={-1}>不导入</option>
                    {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[color:var(--muted)] block mb-1">身份证号列</label>
                  <select value={state.idCardCol} onChange={e => setState(p => ({ ...p, idCardCol: parseInt(e.target.value) }))} className="select text-sm">
                    <option value={-1}>不导入（只用姓名匹配）</option>
                    {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {state.previewRows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">
                数据预览（前 {state.previewRows.length} 行，共 {state.allRows.length} 行）
              </label>
              <div className="border border-[color:var(--border)] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <DataTable
                  data={state.previewRows}
                  columns={previewColumns}
                  rowKey={(item: any) => JSON.stringify(item)}
                  pagination={false}
                  showContainer={false}
                  stickyHeader={true}
                />
              </div>
            </div>
          )}

          {matchedRows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-[color:var(--fg-2)] block mb-2">
                工人匹配结果（
                <span className="text-success-600">{matchedCount} 人匹配成功</span>
                {unmatchedCount > 0 && <span className="text-danger-500">，{unmatchedCount} 人未匹配</span>}
                ）
              </label>
              <div className="border border-[color:var(--border)] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <DataTable
                  data={matchedRows}
                  columns={matchColumns}
                  rowKey={(item: any) => JSON.stringify(item)}
                  pagination={false}
                  showContainer={false}
                  stickyHeader={true}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
