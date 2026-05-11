import React, { useState, useEffect, useRef } from 'react'
import { InvoiceType, InvoiceKind, InvoiceTaxRate, Project, Partner, IncomeContract, ExpenseContract } from '@/types/electron'
import { parseDateString } from '@/utils/date'
import { motion } from 'framer-motion'
import { FileDropZone } from '../partners/FileDropZone'
import { FilePreviewModal } from './FilePreviewModal'
import { useInvoiceAmounts } from './useInvoiceAmounts'
import { taxRateOptions, invoiceKindOptions } from './constants'

export interface InvoiceFormData {
  type: InvoiceType
  invoiceKind: InvoiceKind
  invoiceNo: string
  invoiceCode: string
  name: string
  amount: number
  priceAmount: number
  taxAmount: number
  taxRate: InvoiceTaxRate
  issueDate: string
  sellerId: number | ''
  buyerId: number | ''
  projectId: number | ''
  contractId: number | ''
  remarks: string
  fileUrl: string
  fileType: string
}

export interface InvoiceFormProps {
  initialData: InvoiceFormData
  projects: Project[]
  partners: Partner[]
  contracts: { income: IncomeContract[]; expense: ExpenseContract[] }
  onSubmit: (data: InvoiceFormData) => void
  onCancel: () => void
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData, projects, partners, contracts, onSubmit, onCancel
}) => {
  const [formData, setFormData] = useState<InvoiceFormData>(initialData)
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf', title: string} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { handleTaxRateChange, handleTaxedAmountChange, handleUntaxedAmountChange, handleTaxAmountChange } = useInvoiceAmounts({
    initial: { amount: formData.amount, priceAmount: formData.priceAmount, taxAmount: formData.taxAmount, taxRate: formData.taxRate },
    onUpdate: (patch) => setFormData(prev => ({ ...prev, ...patch }))
  })

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) { alert('只能上传 JPG、PNG、WebP 或 PDF 格式的文件'); return }
    if (file.size > 10 * 1024 * 1024) { alert('文件大小不能超过 10MB'); return }
    const reader = new FileReader()
    reader.onload = (event) => setFormData(prev => ({ ...prev, fileUrl: event.target?.result as string, fileType: file.type === 'application/pdf' ? 'pdf' : 'image' }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) { e.preventDefault(); processFile(file); return }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isEditing = !!initialData.invoiceNo && initialData.invoiceNo !== `INV${Date.now()}`

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              {isEditing ? '编辑发票' : '新建发票'}
            </h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">发票类型 *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as InvoiceType })}
                    className="input"
                    required
                  >
                    <option value="invoice_in">收票</option>
                    <option value="invoice_out">开票</option>
                  </select>
                </div>
                <div>
                  <label className="label">票种 *</label>
                  <select
                    value={formData.invoiceKind}
                    onChange={e => setFormData({ ...formData, invoiceKind: e.target.value as InvoiceKind })}
                    className="input"
                    required
                  >
                    {invoiceKindOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">发票号码 *</label>
                  <input
                    type="text"
                    value={formData.invoiceNo}
                    onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })}
                    className="input font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="label">开票日期</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                    onPaste={e => {
                      const parsed = parseDateString(e.clipboardData.getData('text'))
                      if (parsed) { setFormData({ ...formData, issueDate: parsed }); e.preventDefault() }
                    }}
                    className="input"
                  />
                </div>
              </div>

              {formData.invoiceKind.startsWith('paper') && (
                <div>
                  <label className="label">发票代码</label>
                  <input
                    type="text"
                    value={formData.invoiceCode}
                    onChange={e => setFormData({ ...formData, invoiceCode: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              )}

              <div>
                <label className="label">发票名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="如: 工程款、材料款"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">销售方 *</label>
                  <select
                    value={formData.sellerId}
                    onChange={e => setFormData({ ...formData, sellerId: e.target.value ? Number(e.target.value) : '' })}
                    className="input"
                    required
                  >
                    <option value="">请选择销售方</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">购买方 *</label>
                  <select
                    value={formData.buyerId}
                    onChange={e => setFormData({ ...formData, buyerId: e.target.value ? Number(e.target.value) : '' })}
                    className="input"
                    required
                  >
                    <option value="">请选择购买方</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">关联项目</label>
                <select
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : '' })}
                  className="input"
                >
                  <option value="">请选择项目</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">关联合同</label>
                <select
                  value={formData.contractId}
                  onChange={e => setFormData({ ...formData, contractId: e.target.value ? Number(e.target.value) : '' })}
                  className="input"
                >
                  <option value="">不关联合同</option>
                  {formData.type === 'invoice_in' && contracts.expense
                    .filter(c => (!formData.projectId || c.projectId === formData.projectId) && (!formData.sellerId || c.partnerId === formData.sellerId))
                    .map(c => (<option key={c.id} value={c.id}>[支出] {c.name}</option>))}
                  {formData.type === 'invoice_out' && contracts.income
                    .filter(c => (!formData.projectId || c.projectId === formData.projectId) && (!formData.buyerId || c.partnerId === formData.buyerId))
                    .map(c => (<option key={c.id} value={c.id}>[收入] {c.name}</option>))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">税率 *</label>
                  <select
                    value={formData.taxRate}
                    onChange={e => handleTaxRateChange(Number(e.target.value))}
                    className="input"
                    required
                  >
                    {taxRateOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">价税合计（含税价）</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={e => handleTaxedAmountChange(Number(e.target.value) || 0)}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">不含税金额</label>
                  <input
                    type="number"
                    value={formData.priceAmount || ''}
                    onChange={e => handleUntaxedAmountChange(Number(e.target.value) || 0)}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">税额</label>
                  <input
                    type="number"
                    value={formData.taxAmount || ''}
                    onChange={e => handleTaxAmountChange(Number(e.target.value) || 0)}
                    className="input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="input min-h-[80px]"
                />
              </div>

              {/* 文件上传 */}
              <FileDropZone
                label="上传发票"
                iconName="Paperclip"
                file={formData.fileUrl}
                fileType={formData.fileType}
                fileLabel={formData.fileType === 'pdf' ? 'PDF文件' : '图片文件'}
                dragOver={dragOverFile}
                inputRef={fileInputRef}
                iconBgClass="bg-primary-100"
                onPreview={() => setPreviewFile({ data: formData.fileUrl, type: formData.fileType === 'pdf' ? 'pdf' : 'image', title: '发票预览' })}
                onFileSelect={processFile}
                onRemove={() => setFormData(prev => ({ ...prev, fileUrl: '', fileType: '' }))}
                onDragOver={(e) => { e.preventDefault(); setDragOverFile(true) }}
                onDragLeave={() => setDragOverFile(false)}
                onDrop={(e) => { e.preventDefault(); setDragOverFile(false); const files = e.dataTransfer.files; if (files.length > 0) processFile(files[0]) }}
                onClickUpload={() => fileInputRef.current?.click()}
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
              <button type="submit" className="btn btn-primary">{isEditing ? '保存' : '创建'}</button>
            </div>
          </form>
        </motion.div>
      </div>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  )
}

export default InvoiceForm