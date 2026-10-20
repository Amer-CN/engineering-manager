import React, { useState, useEffect, useRef, useCallback } from 'react'
import { InvoiceType, InvoiceKind, InvoiceMedium, InvoiceCategory, InvoiceTaxRate, Project, Partner, IncomeContract, ExpenseContract } from '@/types/electron'
import { FileDropZone } from '../partners/FileDropZone'
import { FilePreviewModal } from './FilePreviewModal'
import { useInvoiceAmounts } from './useInvoiceAmounts'
import { deriveInvoiceKind, dimensionsFromOcrType, resolveInvoiceDimensions } from './invoiceConfig'
import { useToastStore } from '@/store/toastStore'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import { InvoiceOCRBlock } from './InvoiceOCRBlock'
import { InvoiceFormFields } from './InvoiceFormFields'
import { Button } from '../../ui/Button'
import { Drawer } from '../../ui/Drawer'
import { validateInvoiceNumber } from '@/utils/validate'

export interface InvoiceFormData {
  type: InvoiceType
  // 票种两维（唯一真源）；空串表示历史数据推导不出、需用户重新选择
  invoiceMedium: InvoiceMedium | ''
  invoiceCategory: InvoiceCategory | ''
  // 兼容派生列：仅专票/普票可折叠，其余票种为 ''（服务端落 kind=NULL）
  invoiceKind: InvoiceKind | ''
  nonDeductibleReason: string
  // 进项抵扣登记（P0-b）：仅收票（进项）可登记；默认未抵扣
  isDeducted: boolean
  deductDate: string
  deductPeriod: string
  deductibleTax: number
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
  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    // 入参可能来自旧数据（只有 invoiceKind）：先归一成两维，避免下拉空值。
    const dims = resolveInvoiceDimensions(initialData)
    const invoiceMedium = initialData.invoiceMedium || dims.medium || ''
    const invoiceCategory = initialData.invoiceCategory || dims.category || ''
    return {
      ...initialData,
      invoiceMedium,
      invoiceCategory,
      invoiceKind: deriveInvoiceKind(invoiceMedium, invoiceCategory),
      isDeducted: initialData.isDeducted ?? false,
      deductDate: initialData.deductDate ?? '',
      deductPeriod: initialData.deductPeriod ?? '',
      deductibleTax: initialData.deductibleTax ?? 0
    }
  })
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf' | 'xml' | 'ofd', title: string} | null>(null)
  const [duplicateInvoice, setDuplicateInvoice] = useState<{ id: number; invoiceNo: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { handleTaxRateChange, handleTaxedAmountChange, handleUntaxedAmountChange, handleTaxAmountChange } = useInvoiceAmounts({
  initial: { amount: formData.amount, priceAmount: formData.priceAmount, taxAmount: formData.taxAmount, taxRate: formData.taxRate },
  onUpdate: (patch) => setFormData(prev => ({ ...prev, ...patch }))
  })

  const resolveInvoiceFileType = (file: File): 'image' | 'pdf' | 'xml' | 'ofd' => {
  const name = (file.name || '').toLowerCase()
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'text/xml' || file.type === 'application/xml' || name.endsWith('.xml')) return 'xml'
  if (file.type === 'application/ofd' || file.type === 'application/x-ofd' || name.endsWith('.ofd')) return 'ofd'
  return 'image'
  }

  const processFile = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/xml', 'application/xml', 'application/ofd', 'application/x-ofd']
  const fileName = (file.name || '').toLowerCase()
  const isXmlOfdByExt = fileName.endsWith('.xml') || fileName.endsWith('.ofd')
  if (!allowedTypes.includes(file.type) && !isXmlOfdByExt) { showToast('只能上传 JPG、PNG、WebP、PDF、XML 或 OFD 格式的文件', 'error'); return }
  if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
  const reader = new FileReader()
  reader.onload = (event) => setFormData(prev => ({ ...prev, fileUrl: event.target?.result as string, fileType: resolveInvoiceFileType(file) }))
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
  // 与 processFile 同门控：图片/PDF/XML/OFD（文件名后缀兜底浏览器空 mime）
  const pasteFile = item.getAsFile()
  if (!pasteFile) continue
  const pasteName = (pasteFile.name || '').toLowerCase()
  const pasteAllowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/xml', 'application/xml', 'application/ofd', 'application/x-ofd']
  if (pasteAllowed.includes(pasteFile.type) || pasteFile.type.startsWith('image/') || pasteName.endsWith('.xml') || pasteName.endsWith('.ofd')) {
  e.preventDefault(); processFile(pasteFile); return
  }
  }
  }
  document.addEventListener('paste', handlePaste)
  return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  // 提交前按两维重算 kind，确保 payload 永远携带 invoiceMedium/invoiceCategory 与派生 kind
  onSubmit({ ...formData, invoiceKind: deriveInvoiceKind(formData.invoiceMedium, formData.invoiceCategory) })
  }

  const isEditing = !!initialData.invoiceNo && initialData.invoiceNo !== `INV${Date.now()}`
  // dirty 判定：表单与初值任一字段有差异（误触 Esc/遮罩关闭时 Drawer 先弹确认，防丢填写中的数据）
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData)

  // 数电票号码位数校验（非阻塞 warning，不挡提交）
  const invoiceNoWarning = validateInvoiceNumber(formData.invoiceNo, formData.invoiceCode)

  return (
  <>
  {/* S17 发票智能录入 — 右侧抽屉模式 */}
  <Drawer
    open
    onClose={onCancel}
    icon="Receipt"
    title={isEditing ? '编辑发票' : '发票智能录入'}
    dirty={isDirty}
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
      invoiceNoWarning={invoiceNoWarning}
    />

    {/* 文件上传 */}
    <FileDropZone
      label="上传发票"
      iconName="Paperclip"
      file={formData.fileUrl}
      fileType={formData.fileType}
      fileLabel={formData.fileType === 'pdf' ? 'PDF文件' : formData.fileType === 'xml' ? 'XML文件' : formData.fileType === 'ofd' ? 'OFD文件' : '图片文件'}
      dragOver={dragOverFile}
      inputRef={fileInputRef}
      iconBgClass="bg-[color:var(--accent-soft)]"
      onPreview={() => setPreviewFile({ data: formData.fileUrl, type: formData.fileType === 'pdf' || formData.fileType === 'xml' || formData.fileType === 'ofd' ? formData.fileType : 'image', title: '发票预览' })}
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
      onResult={fields => {
        // OCR 返回发票类型文本时回填介质/票种两维；缺项保留表单当前值。
        const ocrType = fields.invoiceType ?? ''
        if (dimensionsFromOcrType(ocrType).mediumInferredFromInvoiceText) {
          showToast('已按票面文字推断介质，请核对', 'warning')
        }
        setFormData(prev => {
          const ocrDims = dimensionsFromOcrType(ocrType, prev.invoiceMedium, prev.invoiceCategory)
          return {
            ...prev,
            invoiceMedium: ocrDims.medium,
            invoiceCategory: ocrDims.category,
            invoiceKind: deriveInvoiceKind(ocrDims.medium, ocrDims.category),
            invoiceNo: fields.invoiceNo || prev.invoiceNo,
            amount: fields.amount || prev.amount,
            priceAmount: fields.priceAmount || prev.priceAmount,
            taxAmount: fields.taxAmount || prev.taxAmount,
            taxRate: fields.taxRate || prev.taxRate,
            sellerName: fields.sellerName || prev.sellerName,
            purchaserName: fields.purchaserName || prev.purchaserName,
            issueDate: fields.issueDate || prev.issueDate
          }
        })
      }}
    />
  </HoverScrollbar>
  </form>
  </Drawer>

  {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
  </>
  )
}

export default InvoiceForm