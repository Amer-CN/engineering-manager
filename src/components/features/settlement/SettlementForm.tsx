import React, { useRef } from 'react'
import { Settlement as SettlementData, Project, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { subTypeConfig } from './config'
import * as XLSX from 'xlsx'

interface SettlementFormProps {
  settlement?: SettlementData | null
  projects: Project[]
  partners: Partner[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const defaultFormData = {
  projectId: '' as number | '',
  partnerId: '' as number | '',
  type: 'income' as 'income' | 'expense',
  subType: '' as string,
  name: '',
  amount: 0,
  settlementDate: '',
  remarks: '',
  files: [] as { url: string; name: string; type: 'pdf' | 'image' | 'excel' }[],
  items: [] as { description: string; spec: string; quantity: number; unit: string; unitPrice: number; amount: number; remarks: string }[]
}

export const SettlementForm: React.FC<SettlementFormProps> = ({
  settlement,
  projects,
  partners,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = React.useState(defaultFormData)
  const [dragOverFile, setDragOverFile] = React.useState(false)
  const [taxInclusive, setTaxInclusive] = React.useState(true) // 材料结算：含税/不含税
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMaterial = formData.subType === 'material'

  React.useEffect(() => {
    if (settlement) {
      setFormData({
        projectId: settlement.projectId && settlement.projectId > 0 ? settlement.projectId : '',
        partnerId: settlement.partnerId && settlement.partnerId > 0 ? settlement.partnerId : '',
        type: settlement.type,
        subType: (settlement as any).subType || '',
        name: settlement.name,
        amount: settlement.amount,
        settlementDate: (settlement as any).settlementDate || settlement.periodStart || '',
        remarks: settlement.remarks || '',
        files: (settlement as any).files?.length > 0 ? (settlement as any).files
          : settlement.fileUrl ? [{ url: settlement.fileUrl, name: settlement.fileName || '凭证', type: settlement.fileType || 'image' as const }] : [],
        items: settlement.items?.map(item => ({
          description: item.description,
          spec: (item as any).spec || '',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.amount,
          remarks: item.remarks || ''
        })) || []
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [settlement])

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.xlsx']

    files.forEach(file => {
      const fname = file.name.toLowerCase()
      if (!allowed.includes(file.type) && !allowedExts.some(e => fname.endsWith(e))) return
      if (file.size > 30 * 1024 * 1024) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        let ft: 'pdf' | 'image' | 'excel' = 'image'
        if (fname.endsWith('.pdf') || file.type === 'application/pdf') ft = 'pdf'
        else if (fname.endsWith('.xlsx') || file.type.includes('sheet')) ft = 'excel'
        setFormData(p => ({ ...p, files: [...p.files, { url: base64, name: file.name, type: ft }] }))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOverFile(false)
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files)
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) { processFiles(e.target.files); e.target.value = '' }
  }
  const handleRemoveFile = (index: number) => setFormData(p => ({ ...p, files: p.files.filter((_, i) => i !== index) }))

  // 模板导入（标准格式，零配置直接导入）
  const templateInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = async () => {
    // 优先使用模板库中的结算模板
    try {
      const result = await window.electronAPI.getTemplates('settlement')
      if (result.success && result.data && result.data.length > 0) {
        const tmpl = result.data[0]
        const fileResult = await window.electronAPI.readFile({
          category: 'templates', subCategory: 'files',
          fileName: tmpl.storedFileName, projectName: null,
        })
        if (fileResult.success && fileResult.data) {
          const a = document.createElement('a')
          a.href = fileResult.data.dataUrl
          a.download = tmpl.fileName
          a.click()
          return
        }
      }
    } catch (e) { /* 回退到默认模板 */ }

    // 默认模板（无用户模板时使用）
    const headers = ['材料名称', '规格型号', '单位', '数量', '单价(元)']
    const sampleRows = [
      ['示例：水泥PO42.5', '50kg/袋', '吨', 100, 420],
      ['示例：钢筋HRB400', 'Φ12mm', '吨', 50, 3850],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
    ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '材料结算明细')
    XLSX.writeFile(wb, '材料结算模板.xlsx')
  }

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
        if (rows.length < 2) return
        // 模板固定格式：行0=表头(材料名称/规格型号/单位/数量/单价(元))，行1+=数据
        const items = rows.slice(1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
          .map((r: any) => {
            const qty = parseFloat(r[3]) || 1
            const price = parseFloat(r[4]) || 0
            return {
              description: String(r[0] || '').trim(),
              spec: String(r[1] || '').trim(),
              unit: String(r[2] || '').trim(),
              quantity: qty,
              unitPrice: price,
              amount: Math.round(qty * price * 100) / 100,
              remarks: '',
            }
          }).filter(it => it.description)
        if (items.length > 0) {
          setFormData(p => {
            const merged = [...p.items, ...items]
            const total = Math.round(merged.reduce((s, it) => s + it.amount, 0) * 100) / 100
            return { ...p, items: merged, amount: total }
          })
        }
      } catch (err) { console.error('模板导入失败:', err) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // 灵活 Excel 导入（预览弹窗模式，非标表格）
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [importState, setImportState] = React.useState<{
    show: boolean
    sheetNames: string[]
    activeSheet: string
    headerRow: number
    headers: string[]
    previewRows: any[][]
    allRows: any[][]
    mapping: { description: number; spec: number; unit: number; quantity: number; unitPrice: number }
  }>({
    show: false, sheetNames: [], activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [],
    mapping: { description: -1, spec: -1, unit: -1, quantity: -1, unitPrice: -1 },
  })

  // 自动匹配列
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
    if (m.unitPrice === -1 && headers.some((h, i) => { const l = h.toLowerCase(); return l.includes('金额') || l.includes('合价'); })) {
      // 有金额列的暂时也映射到单价
    }
    return m
  }

  // 读取工作表
  const loadSheet = (wb: XLSX.WorkBook, sheetName: string, hRow?: number) => {
    const headerRow = hRow ?? 0
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][]
    // 表头行之前的所有行作为"跳过行"
    const headers = rows.length > headerRow ? rows[headerRow].map((h: any) => String(h || '').trim()) : []
    // 显示预览时包含表头行之前的行（让用户看到跳过了什么）
    const skippedRows = rows.slice(0, headerRow)
    const dataRows = rows.slice(headerRow + 1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
    const preview = dataRows.slice(0, 10)
    const mapping = autoMap(headers)
    setImportState(p => ({ ...p, headerRow, activeSheet: sheetName, headers, previewRows: preview, allRows: dataRows, mapping }))
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const names = wb.SheetNames
        setImportState({ show: true, sheetNames: names, activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [], mapping: { description: -1, spec: -1, unit: -1, quantity: -1, unitPrice: -1 } })
        if (names.length > 0) loadSheet(wb, names[0])
      } catch (err) { console.error('Excel读取失败:', err) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const switchSheet = (wbData: ArrayBuffer | null, sheetName: string) => {
    if (!wbData) return
    try {
      const wb = XLSX.read(wbData, { type: 'array' })
      loadSheet(wb, sheetName)
    } catch {}
  }

  // 保存 workbook 数据以便切换工作表
  const [wbBuffer, setWbBuffer] = React.useState<ArrayBuffer | null>(null)

  const handleImportExcelWrapped = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        setWbBuffer(buf)
        const wb = XLSX.read(buf, { type: 'array' })
        const names = wb.SheetNames
        setImportState({ show: true, sheetNames: names, activeSheet: '', headerRow: 0, headers: [], previewRows: [], allRows: [], mapping: { description: -1, spec: -1, unit: -1, quantity: -1, unitPrice: -1 } })
        if (names.length > 0) loadSheet(wb, names[0])
      } catch (err) { console.error('Excel读取失败:', err) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const confirmImport = () => {
    const { allRows, mapping } = importState
    const items = allRows.map((r: any) => {
      const qty = mapping.quantity >= 0 ? parseFloat(r[mapping.quantity]) || 1 : 1
      const price = mapping.unitPrice >= 0 ? parseFloat(r[mapping.unitPrice]) || 0 : 0
      const amt = qty * price
      return {
        description: mapping.description >= 0 ? String(r[mapping.description] || '').trim() : '',
        spec: mapping.spec >= 0 ? String(r[mapping.spec] || '').trim() : '',
        unit: mapping.unit >= 0 ? String(r[mapping.unit] || '').trim() : '',
        quantity: qty,
        unitPrice: price,
        amount: Math.round(amt * 100) / 100,
        remarks: '',
      }
    }).filter(it => it.description)
    if (items.length > 0) {
      setFormData(p => {
        const merged = [...p.items, ...items]
        const total = Math.round(merged.reduce((s, it) => s + it.amount, 0) * 100) / 100
        return { ...p, items: merged, amount: total }
      })
    }
    setImportState(p => ({ ...p, show: false }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', spec: '', quantity: 1, unit: '', unitPrice: 0, amount: 0, remarks: '' }]
    }))
  }

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].amount = Math.round(newItems[index].quantity * newItems[index].unitPrice * 100) / 100
      }
      const total = Math.round(newItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
      return { ...prev, items: newItems, amount: total }
    })
  }

  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index)
      const total = Math.round(newItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
      return { ...prev, items: newItems, amount: total }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="label">结算类型 *</label>
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
            className="input"
            required
          >
            <option value="income">收入结算</option>
            <option value="expense">支出结算</option>
          </select>
        </div>
        <div>
          <label className="label">结算类别</label>
          <select
            value={formData.subType}
            onChange={e => setFormData({ ...formData, subType: e.target.value })}
            className="input"
          >
            <option value="">请选择类别</option>
            {Object.entries(subTypeConfig).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">结算名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="如：2024年3月工程进度款"
            required
          />
        </div>
        <div>
          <label className="label">关联项目 *</label>
          <select
            value={formData.projectId}
            onChange={e => setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : '' })}
            className="input"
            required
          >
            <option value="">请选择项目</option>
            {projects.length > 0 ? projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            )) : <option value="" disabled>暂无项目，请先添加项目</option>}
          </select>
        </div>
        <div>
          <label className="label">关联单位 *</label>
          <select
            value={formData.partnerId}
            onChange={e => setFormData({ ...formData, partnerId: e.target.value ? Number(e.target.value) : '' })}
            className="input"
            required
          >
            <option value="">请选择单位</option>
            {partners.length > 0 ? partners.map(partner => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            )) : <option value="" disabled>暂无单位，请先添加单位</option>}
          </select>
        </div>
        <div>
          <label className="label">结算日期</label>
          <input
            type="date"
            value={formData.settlementDate}
            onChange={e => setFormData({ ...formData, settlementDate: e.target.value })}
            className="input"
          />
        </div>
      </div>

      {/* 结算明细 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="label mb-0">结算明细</label>
          <div className="flex items-center gap-2">
            {isMaterial && (
              <>
                <input ref={excelInputRef} type="file" accept=".xlsx,.xls"
                  onChange={handleImportExcelWrapped} className="hidden" />
                <input ref={templateInputRef} type="file" accept=".xlsx,.xls"
                  onChange={handleTemplateUpload} className="hidden" />
                <button type="button" onClick={downloadTemplate}
                  className="btn btn-sm bg-white text-slate-600 hover:bg-slate-100 border border-slate-300">
                  <Icon name="Download" size={14} /> 下载模板
                </button>
                <button type="button" onClick={() => templateInputRef.current?.click()}
                  className="btn btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200">
                  <Icon name="Upload" size={14} /> 上传模板
                </button>
                <button type="button" onClick={() => excelInputRef.current?.click()}
                  className="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  <Icon name="File" size={14} /> 导入其他表
                </button>
              </>
            )}
            <button type="button" onClick={addItem}
              className="btn btn-sm btn-secondary">
              + 添加明细
            </button>
          </div>
        </div>
        
        {isMaterial && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-500">单价类型：</span>
            <button type="button" onClick={() => setTaxInclusive(true)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${taxInclusive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              含税单价
            </button>
            <button type="button" onClick={() => setTaxInclusive(false)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${!taxInclusive ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              不含税单价
            </button>
          </div>
        )}

        {formData.items.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {isMaterial ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">材料名称</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">规格型号</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-16">单位</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-20">数量</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">{taxInclusive ? '含税单价' : '不含税单价'}</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 w-28">金额</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 w-12">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input type="text" value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="材料名称" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.spec}
                          onChange={e => updateItem(index, 'spec', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="规格型号" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.unit}
                          onChange={e => updateItem(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" placeholder="单位" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" min="0" step="any" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.unitPrice}
                          onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" min="0" step="any" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800 text-sm">
                        ¥{formatMoney(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-20">数量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-20">单位</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-28">单价</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 w-28">金额</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <input type="text" value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="项目描述" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" min="0" step="any" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" value={item.unit}
                          onChange={e => updateItem(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="如: 月" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={item.unitPrice}
                          onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" min="0" step="any" />
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-800">
                        ¥{formatMoney(item.amount)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500">点击上方按钮添加结算明细</p>
          </div>
        )}
        
        <div className="mt-4 text-right">
          <span className="text-slate-600">合计金额: </span>
          <span className="text-2xl font-bold text-primary-600">¥{formatMoney(formData.amount)}</span>
        </div>
      </div>

      {/* 结算凭证上传（多文件） */}
      <div className="mb-6">
        <label className="label">结算凭证</label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx"
          onChange={handleFileChange} className="hidden" multiple />
        {formData.files.length > 0 && (
          <div className="space-y-2 mb-3">
            {formData.files.map((f, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center">
                    {f.type === 'pdf' ? <Icon name="File" size={16} className="text-primary-600" /> :
                     f.type === 'excel' ? <Icon name="LayoutDashboard" size={16} className="text-primary-600" /> :
                     <Icon name="Image" size={16} className="text-primary-600" />}
                  </div>
                  <span className="text-sm text-slate-700 truncate max-w-[300px]">{f.name}</span>
                  <span className="text-xs text-slate-400">{f.type === 'pdf' ? 'PDF' : f.type === 'excel' ? 'Excel' : '图片'}</span>
                </div>
                <button type="button" onClick={() => handleRemoveFile(i)}
                  className="text-red-400 hover:text-red-600 text-sm">删除</button>
              </div>
            ))}
          </div>
        )}
        <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
          dragOverFile ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
        }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <Icon name="Paperclip" size={28} className="text-slate-300 mb-1 mx-auto" />
          <p className="text-sm font-medium text-slate-600">上传结算凭证（支持多文件）</p>
          <p className="text-xs text-slate-400 mt-0.5">点击或拖拽上传，JPG/PNG/PDF/XLSX，每文件最大 30MB</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="label">备注</label>
        <textarea
          value={formData.remarks}
          onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          className="input min-h-[100px]"
          placeholder="其他说明..."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
        <button type="submit" className="btn btn-primary">{settlement ? '保存修改' : '创建结算单'}</button>
      </div>

      {/* Excel 导入预览弹窗 */}
      {importState.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setImportState(p => ({ ...p, show: false }))}>
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">导入 Excel 明细</h3>
              <button onClick={() => setImportState(p => ({ ...p, show: false }))} className="text-slate-400 hover:text-slate-600">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* 工作表 + 表头行选择 */}
              <div className="flex items-center gap-6">
                {importState.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">工作表：</label>
                    <select value={importState.activeSheet} onChange={e => { const wb = XLSX.read(wbBuffer!, { type: 'array' }); loadSheet(wb, e.target.value, importState.headerRow) }}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                      {importState.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">表头行：</label>
                  <select value={importState.headerRow} onChange={e => { const hr = parseInt(e.target.value); const wb = XLSX.read(wbBuffer!, { type: 'array' }); loadSheet(wb, importState.activeSheet, hr) }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={i} value={i}>第 {i + 1} 行</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">（表头之前的行自动跳过）</span>
                </div>
              </div>

              {/* 列映射 */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">列映射（选择每列对应的字段）</label>
                <div className="grid grid-cols-5 gap-3">
                  {([
                    { key: 'description', label: '材料名称' },
                    { key: 'spec', label: '规格型号' },
                    { key: 'unit', label: '单位' },
                    { key: 'quantity', label: '数量' },
                    { key: 'unitPrice', label: '单价' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                      <select value={importState.mapping[f.key]} onChange={e => setImportState(p => ({ ...p, mapping: { ...p.mapping, [f.key]: parseInt(e.target.value) } }))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                        <option value={-1}>不导入</option>
                        {importState.headers.map((h, i) => (
                          <option key={i} value={i}>{h || `列${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 预览表格 */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  数据预览（前 {importState.previewRows.length} 行，共 {importState.allRows.length} 行）
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {importState.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{h || `列${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importState.previewRows.map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50">
                          {importState.headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-sm text-slate-500">将导入 {importState.allRows.length} 条明细</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setImportState(p => ({ ...p, show: false }))} className="btn btn-secondary">取消</button>
                <button type="button" onClick={confirmImport} className="btn btn-primary">确认导入</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

export default SettlementForm