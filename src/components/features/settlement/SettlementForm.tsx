import React, { useRef } from 'react'
import { Settlement as SettlementData, SettlementItem, Project, Partner } from '../../../types/electron'
import { Input } from '../../ui/Input/Input'
import { subTypeConfig } from './config'
import { SettlementItemsTable } from './SettlementItemsTable'
import { SettlementImportModal } from './SettlementImportModal'
import { FileUploadSection } from './FileUploadSection'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'

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
  const [taxInclusive, setTaxInclusive] = React.useState(true) // 材料结算：含税/不含税
  const isMaterial = formData.subType === 'material'

  React.useEffect(() => {
    if (settlement) {
      setFormData({
        projectId: settlement.projectId && settlement.projectId > 0 ? settlement.projectId : '',
        partnerId: settlement.partnerId && settlement.partnerId > 0 ? settlement.partnerId : '',
        type: settlement.type,
        subType: settlement.subType || '',
        name: settlement.name,
        amount: settlement.amount,
        settlementDate: settlement.settlementDate || settlement.periodStart || '',
        remarks: settlement.remarks || '',
        files: (settlement.files?.length ?? 0) > 0 ? settlement.files!
          : settlement.fileUrl ? [{ url: settlement.fileUrl, name: settlement.fileName || '凭证', type: settlement.fileType || 'image' as const }] : [],
        items: settlement.items?.map(item => ({
          description: item.description,
          spec: ((item as SettlementItem & { spec?: string }).spec ?? ''),
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

  // 模板导入
  const templateInputRef = useRef<HTMLInputElement>(null)
  const [showImportModal, setShowImportModal] = React.useState(false)

  const downloadTemplate = async () => {
    try {
      const api = await getAPI()
      const result = await api.getTemplates('settlement')
      if (result.success && result.data && result.data.length > 0) {
        const tmpl = result.data[0]
        const fileResult = await api.readFile({ category: 'templates', subCategory: 'files', fileName: tmpl.storedFileName, projectName: null })
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
          <Input label="结算名称" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} size="sm" placeholder="如：2024年3月工程进度款" required />
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
          <Input label="结算日期" type="date" value={formData.settlementDate} onChange={e => setFormData({ ...formData, settlementDate: e.target.value })} size="sm" />
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
      <FileUploadSection files={formData.files} onFilesChange={files => setFormData(p => ({ ...p, files }))} />

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
        <Button type="button" onClick={onCancel}  variant="secondary">取消</Button>
        <Button type="submit"  variant="primary">{settlement ? '保存修改' : '创建结算单'}</Button>
      </div>

      <SettlementImportModal show={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportItems} />
    </form>
  )
}

export default SettlementForm