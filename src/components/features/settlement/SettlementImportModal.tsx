import React, { useState } from 'react'
import { Icon } from '../../ui/Icon'

interface Item { description: string; spec: string; quantity: number; unit: string; unitPrice: number; amount: number; remarks: string }

interface Props {
  show: boolean
  onClose: () => void
  onImport: (items: Item[]) => void
}

interface ImportState {
  sheetNames: string[]
  activeSheet: string
  headerRow: number
  headers: string[]
  previewRows: any[][]
  allRows: any[][]
  mapping: { description: number; spec: number; unit: number; quantity: number; unitPrice: number }
}

const defaultImportState: ImportState = {
  sheetNames: [], activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [],
  mapping: { description: -1, spec: -1, unit: -1, quantity: -1, unitPrice: -1 },
}

const autoMap = (headers: string[]) => {
  const m = { description: 0, spec: -1, unit: -1, quantity: -1, unitPrice: -1 }
  headers.forEach((h, i) => {
    const l = h.toLowerCase()
    if (l.includes('名称') || l.includes('材料') || l.includes('品名')) m.description = i
    else if (l.includes('规格') || l.includes('型号')) m.spec = i
    else if (l.includes('单位')) m.unit = i
    else if (l.includes('数量')) m.quantity = i
    else if (l.includes('单价') || l.includes('价格')) m.unitPrice = i
  })
  return m
}

export const SettlementImportModal: React.FC<Props> = ({ show, onClose, onImport }) => {
  const [state, setState] = useState<ImportState>(defaultImportState)
  const [wbBuffer, setWbBuffer] = useState<ArrayBuffer | null>(null)

  const loadSheet = async (wb: any, sheetName: string, hRow?: number) => {
    const XLSX = await import('xlsx')
    const headerRow = hRow ?? 0
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
    const headers = rows.length > headerRow ? rows[headerRow].map((h: any) => String(h || '').trim()) : []
    const dataRows = rows.slice(headerRow + 1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
    const preview = dataRows.slice(0, 10)
    const mapping = autoMap(headers)
    setState(p => ({ ...p, headerRow, activeSheet: sheetName, headers, previewRows: preview, allRows: dataRows, mapping }))
  }

// @ts-ignore TS6133: handleFile is declared but never read
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        setWbBuffer(buf)
        const XLSX = await import('xlsx')
        const wb = XLSX.read(buf, { type: 'array' })
        setState({ ...defaultImportState, sheetNames: wb.SheetNames })
        if (wb.SheetNames.length > 0) loadSheet(wb, wb.SheetNames[0])
      } catch (err) { console.error('Excel读取失败:', err) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const confirmImport = () => {
    const { allRows, mapping } = state
    const items = allRows.map((r: any) => {
      const qty = mapping.quantity >= 0 ? parseFloat(r[mapping.quantity]) || 1 : 1
      const price = mapping.unitPrice >= 0 ? parseFloat(r[mapping.unitPrice]) || 0 : 0
      return {
        description: mapping.description >= 0 ? String(r[mapping.description] || '').trim() : '',
        spec: mapping.spec >= 0 ? String(r[mapping.spec] || '').trim() : '',
        unit: mapping.unit >= 0 ? String(r[mapping.unit] || '').trim() : '',
        quantity: qty, unitPrice: price,
        amount: Math.round(qty * price * 100) / 100,
        remarks: '',
      }
    }).filter(it => it.description)
    if (items.length > 0) onImport(items)
    onClose()
  }

  const switchSheet = async (sheetName: string) => {
    if (!wbBuffer) return
    try { const XLSX = await import('xlsx'); const wb = XLSX.read(wbBuffer, { type: 'array' }); loadSheet(wb, sheetName) } catch {}
  }

  const changeHeaderRow = async (hr: number) => {
    if (!wbBuffer) return
    const XLSX = await import('xlsx')
    const wb = XLSX.read(wbBuffer, { type: 'array' })
    loadSheet(wb, state.activeSheet, hr)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">导入 Excel 明细</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icon name="X" size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center gap-6">
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
              <select value={state.headerRow} onChange={e => { const hr = parseInt(e.target.value); changeHeaderRow(hr) }} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                {Array.from({ length: 5 }, (_, i) => <option key={i} value={i}>第 {i + 1} 行</option>)}
              </select>
              <span className="text-xs text-slate-400">（表头之前的行自动跳过）</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">列映射（选择每列对应的字段）</label>
            <div className="grid grid-cols-5 gap-3">
              {([{ key: 'description', label: '材料名称' }, { key: 'spec', label: '规格型号' }, { key: 'unit', label: '单位' }, { key: 'quantity', label: '数量' }, { key: 'unitPrice', label: '单价' }] as const).map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                  <select value={state.mapping[f.key]} onChange={e => setState(p => ({ ...p, mapping: { ...p.mapping, [f.key]: parseInt(e.target.value) } }))} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value={-1}>不导入</option>
                    {state.headers.map((h, i) => <option key={i} value={i}>{h || `列${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">数据预览（前 {state.previewRows.length} 行，共 {state.allRows.length} 行）</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>{state.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{h || `列${i + 1}`}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.previewRows.map((row, ri) => (
                    <tr key={ri} className="table-row-hover">
                      {state.headers.map((_, ci) => <td key={ci} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">将导入 {state.allRows.length} 条明细</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">取消</button>
            <button type="button" onClick={confirmImport} className="btn btn-primary">确认导入</button>
          </div>
        </div>
      </div>
    </div>
  )
}
