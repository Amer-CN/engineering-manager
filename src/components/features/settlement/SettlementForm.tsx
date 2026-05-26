import React, { useRef } from 'react'
import { Settlement as SettlementData, Project, Partner } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { subTypeConfig } from './config'
import { SettlementItemsTable } from './SettlementItemsTable'
import { SettlementImportModal } from './SettlementImportModal'

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

  // 模板导入
  const templateInputRef = useRef<HTMLInputElement>(null)
  const [showImportModal, setShowImportModal] = React.useState(false)

  const downloadTemplate = async () => {
    try {
      const result = await window.electronAPI.getTemplates('settlement')
      if (result.success && result.data && result.data.length > 0) {
        const tmpl = result.data[0]
        const fileResult = await window.electronAPI.readFile({ category: 'templates', subCategory: 'files', fileName: tmpl.storedFileName, projectName: null })
        if (fileResult.success && fileResult.data) {
          const a = document.createElement('a'); a.href = fileResult.data.dataUrl; a.download = tmpl.fileName; a.click(); return
        }
      }
    } catch (e) {}
    const XLSX = await import('xlsx')
    const headers = ['材料名称', '规格型号', '单位', '数量', '单价(元)']
    const sampleRows = [['示例：水泥PO42.5', '50kg/袋', '吨', 100, 420], ['示例：钢筋HRB400', 'Φ12mm', '吨', 50, 3850]]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
    ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '材料结算明细')
    XLSX.writeFile(wb, '材料结算模板.xlsx')
  }

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][]
        if (rows.length < 2) return
        const items = rows.slice(1).filter((r: any[]) => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''))
          .map((r: any) => { const qty = parseFloat(r[3]) || 1; const price = parseFloat(r[4]) || 0; return { description: String(r[0] || '').trim(), spec: String(r[1] || '').trim(), unit: String(r[2] || '').trim(), quantity: qty, unitPrice: price, amount: Math.round(qty * price * 100) / 100, remarks: '' } })
          .filter((it: any) => it.description)
        if (items.length > 0) setFormData(p => { const merged = [...p.items, ...items]; return { ...p, items: merged, amount: Math.round(merged.reduce((s: number, it: any) => s + it.amount, 0) * 100) / 100 } })
      } catch (err) { console.error('模板导入失败:', err) }
    }
    reader.readAsArrayBuffer(file); e.target.value = ''
  }

  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { description: '', spec: '', quantity: 1, unit: '', unitPrice: 0, amount: 0, remarks: '' }] }))

  const updateItem = (index: number, field: string, value: any) => setFormData(prev => {
    const newItems = [...prev.items]; newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') newItems[index].amount = Math.round(newItems[index].quantity * newItems[index].unitPrice * 100) / 100
    return { ...prev, items: newItems, amount: Math.round(newItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100 }
  })

  const removeItem = (index: number) => setFormData(prev => {
    const newItems = prev.items.filter((_, i) => i !== index)
    return { ...prev, items: newItems, amount: Math.round(newItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100 }
  })

  const handleImportItems = (imported: typeof formData.items) => setFormData(p => {
    const merged = [...p.items, ...imported]
    return { ...p, items: merged, amount: Math.round(merged.reduce((s, it) => s + it.amount, 0) * 100) / 100 }
  })

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
      <SettlementItemsTable
        items={formData.items} isMaterial={isMaterial} taxInclusive={taxInclusive}
        onAdd={addItem} onUpdate={updateItem} onRemove={removeItem}
        onSetTaxInclusive={setTaxInclusive}
        onDownloadTemplate={downloadTemplate}
        onUploadTemplate={() => templateInputRef.current?.click()}
        onImportExcel={() => setShowImportModal(true)}
        onTemplateFileChange={handleTemplateUpload}
        templateInputRef={templateInputRef}
      />

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

      <SettlementImportModal show={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportItems} />
    </form>
  )
}

export default SettlementForm