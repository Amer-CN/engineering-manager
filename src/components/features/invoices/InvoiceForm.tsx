import React, { useState, useEffect, useRef, useCallback } from 'react'
import { InvoiceType, InvoiceKind, InvoiceTaxRate, Project, Partner, IncomeContract, ExpenseContract } from '@/types/electron'
import { parseDateString } from '@/utils/date'
import { motion } from 'framer-motion'
import { Input } from '../../ui/Input/Input'
import { FileDropZone } from '../partners/FileDropZone'
import { FilePreviewModal } from './FilePreviewModal'
import { useInvoiceAmounts } from './useInvoiceAmounts'
import { taxRateOptions, invoiceKindOptions } from './constants'
import { useToastStore } from '@/store/toastStore'
import { useInvoiceOCR } from '@/hooks/useInvoiceOCR'
import { Icon } from '../../ui/Icon'

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
  existingInvoices?: { invoiceNo: string; id: number }[]
  onSubmit: (data: InvoiceFormData) => void
  onCancel: () => void
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData, projects, partners, contracts, existingInvoices = [], onSubmit, onCancel
}) => {
  const showToast = useToastStore(state => state.showToast)
  const { processInvoiceFile } = useInvoiceOCR()
  const [formData, setFormData] = useState<InvoiceFormData>(initialData)
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf', title: string} | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
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

  const [ocrResult, setOcrResult] = useState<string | null>(null)

  const handleOCR识别 = async () => {
    if (!formData.fileUrl) {
      showToast('请先上传发票文件', 'error')
      return
    }

    setOcrLoading(true)
    setOcrResult(null)
    try {
      // 将 base64 转为 File 对象
      const response = await fetch(formData.fileUrl)
      const blob = await response.blob()
      const fileType = formData.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'
      const fileName = formData.fileType === 'pdf' ? 'invoice.pdf' : 'invoice.jpg'
      const file = new File([blob], fileName, { type: fileType })

      const result = await processInvoiceFile(file)

      if (result) {
        // 自动匹配销售方/购买方
        const matchedSeller = partners.find(p => p.name === result.sellerName)
        const matchedBuyer = partners.find(p => p.name === result.purchaserName)

        // 匹配税率选项
        const matchedTaxRate = taxRateOptions.find(opt => opt.value === result.taxRate)?.value

        // 判断发票类型
        let invoiceKind: InvoiceKind = formData.invoiceKind
        const typeStr = result.invoiceType.toLowerCase()
        if (typeStr.includes('专用') || typeStr.includes('special')) {
          invoiceKind = typeStr.includes('电子') || typeStr.includes('electronic') ? 'electronic_special' : 'paper_special'
        } else if (typeStr.includes('普通') || typeStr.includes('regular') || typeStr.includes('ordinary')) {
          invoiceKind = typeStr.includes('电子') || typeStr.includes('electronic') ? 'electronic_regular' : 'paper_regular'
        }

        // 从备注中提取项目信息并匹配
        let matchedProjectId = formData.projectId
        if (result.remarks) {
          const matchedProject = projects.find(p => result.remarks.includes(p.name))
          if (matchedProject) matchedProjectId = matchedProject.id
        }

        const newData = {
          invoiceKind: invoiceKind,
          invoiceNo: result.invoiceNo || formData.invoiceNo,
          invoiceCode: result.invoiceCode || formData.invoiceCode,
          issueDate: result.issueDate || formData.issueDate,
          name: result.itemName || formData.name,
          amount: result.amount || formData.amount,
          priceAmount: result.priceAmount || formData.priceAmount,
          taxAmount: result.taxAmount || formData.taxAmount,
          taxRate: matchedTaxRate !== undefined ? matchedTaxRate : formData.taxRate,
          sellerId: matchedSeller ? matchedSeller.id : formData.sellerId,
          buyerId: matchedBuyer ? matchedBuyer.id : formData.buyerId,
          projectId: matchedProjectId,
          remarks: result.remarks || formData.remarks,
        }

        setFormData(prev => ({ ...prev, ...newData }))

        // 显示识别结果摘要
        const summary = [
          result.invoiceNo ? `发票号: ${result.invoiceNo}` : null,
          result.amount ? `金额: ¥${result.amount.toLocaleString()}` : null,
          result.itemName ? `项目: ${result.itemName}` : null,
          matchedSeller ? `销售方: ${matchedSeller.name}` : null,
          matchedBuyer ? `购买方: ${matchedBuyer.name}` : null,
        ].filter(Boolean).join(' | ')

        setOcrResult(summary)
        showToast('🎉 AI 识别成功！已自动填入 12 个字段', 'success')
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
    } finally {
      setOcrLoading(false)
    }
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
                  <Input label="发票号码" type="text" value={formData.invoiceNo}
                    onChange={e => handleInvoiceNoChange(e.target.value)}
                    size="sm" className="font-mono" required />
                  {duplicateInvoice && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="AlertTriangle" size={14} className="text-amber-600" />
                        <span className="text-xs text-amber-700">
                          此发票号已存在（ID: {duplicateInvoice.id}）
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div>
                  <Input label="开票日期" type="date" value={formData.issueDate}
                    onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                    onPaste={e => {
                      const parsed = parseDateString(e.clipboardData.getData('text'))
                      if (parsed) { setFormData({ ...formData, issueDate: parsed }); e.preventDefault() }
                    }}
                    size="sm" />
                </div>
              </div>

              {formData.invoiceKind.startsWith('paper') && (
                <div>
                  <Input label="发票代码" type="text" value={formData.invoiceCode} onChange={e => setFormData({ ...formData, invoiceCode: e.target.value })} size="sm" className="font-mono" />
                </div>
              )}

              <div>
                <Input label="发票名称" type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} size="sm" placeholder="如: 工程款、材料款" required />
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
                  <Input label="价税合计（含税价）" type="number" value={formData.amount || ''} onChange={e => handleTaxedAmountChange(Number(e.target.value) || 0)} size="sm" min="0" step="0.01" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input label="不含税金额" type="number" value={formData.priceAmount || ''} onChange={e => handleUntaxedAmountChange(Number(e.target.value) || 0)} size="sm" min="0" step="0.01" />
                </div>
                <div>
                  <Input label="税额" type="number" value={formData.taxAmount || ''} onChange={e => handleTaxAmountChange(Number(e.target.value) || 0)} size="sm" min="0" step="0.01" />
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

              {/* OCR 识别按钮 */}
              {formData.fileUrl && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOCR识别}
                    disabled={ocrLoading}
                    className={`btn w-full flex items-center justify-center gap-2 transition-all duration-300 ${
                      ocrLoading
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0'
                        : 'btn-primary'
                    }`}
                  >
                    {ocrLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span className="animate-pulse">AI 正在识别发票内容...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="Sparkles" size={16} />
                        AI 识别发票（自动填入）
                      </>
                    )}
                  </button>

                  {/* 识别结果提示 */}
                  {ocrResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <Icon name="CheckCircle" size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-emerald-700">
                          <p className="font-medium mb-1">AI 已自动填入以下信息：</p>
                          <p className="text-emerald-600">{ocrResult}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
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