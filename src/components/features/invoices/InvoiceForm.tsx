import React, { useState, useEffect, useRef, useCallback } from 'react'
import { InvoiceType, InvoiceKind, InvoiceTaxRate, Project, Partner, IncomeContract, ExpenseContract } from '@/types/electron'
import { FileDropZone } from '../partners/FileDropZone'
import { FilePreviewModal } from './FilePreviewModal'
import { useInvoiceAmounts } from './useInvoiceAmounts'
import { useToastStore } from '@/store/toastStore'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import { InvoiceOCRBlock } from './InvoiceOCRBlock'
import { InvoiceFormFields } from './InvoiceFormFields'
import { Button } from '../../ui/Button'
import { Drawer } from '../../ui/Drawer'

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
  sellerName?: string
  purchaserName?: string
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
  existingInvoices?: { invoiceNo: string; id: number }[]
  onSubmit: (data: InvoiceFormData) => void
  onCancel: () => void
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData, projects, partners, contracts, existingInvoices = [], onSubmit, onCancel
}) => {
  const showToast = useToastStore(state => state.showToast)
  const [formData, setFormData] = useState<InvoiceFormData>(initialData)
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf', title: string} | null>(null)
  const [duplicateInvoice, setDuplicateInvoice] = useState<{ id: number; invoiceNo: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { handleTaxRateChange, handleTaxedAmountChange, handleUntaxedAmountChange, handleTaxAmountChange } = useInvoiceAmounts({
  initial: { amount: formData.amount, priceAmount: formData.priceAmount, taxAmount: formData.taxAmount, taxRate: formData.taxRate },
  onUpdate: (patch) => setFormData(prev => ({ ...prev, ...patch }))
  })

  const processFile = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) { showToast('只能上传 JPG、PNG、WebP 或 PDF 格式的文件', 'error'); return }
  if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
  const reader = new FileReader()
  reader.onload = (event) => setFormData(prev => ({ ...prev, fileUrl: event.target?.result as string, fileType: file.type === 'application/pdf' ? 'pdf' : 'image' }))
  reader.readAsDataURL(file)
  }

  // 检测发票号是否重复
  const checkDuplicateInvoice = useCallback((invoiceNo: string) => {
  if (!invoiceNo || invoiceNo.length < 10) {
  setDuplicateInvoice(null)
  return
  }

  const isEditing = !!initialData.invoiceNo && initialData.invoiceNo !== `INV${Date.now()}`
  const duplicate = existingInvoices.find(inv =>
  inv.invoiceNo === invoiceNo && (!isEditing || inv.invoiceNo !== initialData.invoiceNo)
  )

  if (duplicate) {
  setDuplicateInvoice(duplicate)
  showToast('⚠️ 检测到重复发票号', 'warning')
  } else {
  setDuplicateInvoice(null)
  }
  }, [existingInvoices, initialData.invoiceNo, showToast])

  // 发票号变化时检测重复
  const handleInvoiceNoChange = useCallback((value: string) => {
  setFormData(prev => ({ ...prev, invoiceNo: value }))
  checkDuplicateInvoice(value)
  }, [checkDuplicateInvoice])



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
  {/* S17 发票智能录入 — 右侧抽屉模式 */}
  <Drawer
    open
    onClose={onCancel}
    icon="Receipt"
    title={isEditing ? '编辑发票' : '发票智能录入'}
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button type="button" onClick={onCancel} variant="secondary">取消</Button>
        <Button type="submit" form="invoice-drawer-form" variant="primary">{isEditing ? '保存' : '创建'}</Button>
      </div>
    }
  >
  <form id="invoice-drawer-form" onSubmit={handleSubmit} className="flex flex-col h-full">
  <HoverScrollbar className="flex-1 px-6 py-4">
    <InvoiceFormFields
      formData={formData}
      setFormData={setFormData}
      partners={partners}
      projects={projects}
      contracts={contracts}
      handleInvoiceNoChange={handleInvoiceNoChange}
      handleTaxRateChange={handleTaxRateChange}
      handleTaxedAmountChange={handleTaxedAmountChange}
      handleUntaxedAmountChange={handleUntaxedAmountChange}
      handleTaxAmountChange={handleTaxAmountChange}
      duplicateInvoice={duplicateInvoice}
    />

    {/* 文件上传 */}
    <FileDropZone
      label="上传发票"
      iconName="Paperclip"
      file={formData.fileUrl}
      fileType={formData.fileType}
      fileLabel={formData.fileType === 'pdf' ? 'PDF文件' : '图片文件'}
      dragOver={dragOverFile}
      inputRef={fileInputRef}
      iconBgClass="bg-[color:var(--accent-soft)]"
      onPreview={() => setPreviewFile({ data: formData.fileUrl, type: formData.fileType === 'pdf' ? 'pdf' : 'image', title: '发票预览' })}
      onFileSelect={processFile}
      onRemove={() => setFormData(prev => ({ ...prev, fileUrl: '', fileType: '' }))}
      onDragOver={(e) => { e.preventDefault(); setDragOverFile(true) }}
      onDragLeave={() => setDragOverFile(false)}
      onDrop={(e) => { e.preventDefault(); setDragOverFile(false); const files = e.dataTransfer.files; if (files.length > 0) processFile(files[0]) }}
      onClickUpload={() => fileInputRef.current?.click()}
    />

    <InvoiceOCRBlock
      fileUrl={formData.fileUrl}
      fileType={formData.fileType}
      onResult={fields => setFormData(prev => ({
        ...prev,
        invoiceNo: fields.invoiceNo || prev.invoiceNo,
        amount: fields.amount || prev.amount,
        priceAmount: fields.priceAmount || prev.priceAmount,
        taxAmount: fields.taxAmount || prev.taxAmount,
        taxRate: fields.taxRate || prev.taxRate,
        sellerName: fields.sellerName || prev.sellerName,
        purchaserName: fields.purchaserName || prev.purchaserName,
        issueDate: fields.issueDate || prev.issueDate
      }))}
    />
  </HoverScrollbar>
  </form>
  </Drawer>

  {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
  </>
  )
}

export default InvoiceForm