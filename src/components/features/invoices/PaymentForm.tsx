// PaymentForm.tsx - 收款表单组件

import React, { useState, useEffect, useRef } from 'react'
import { PaymentRecord, InvoiceType, Project, Partner, IncomeContract, ExpenseContract, Invoice } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { parseDateString } from '@/utils/date'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

// Types

import { FilePreviewModal, FilePreviewData } from './FilePreviewModal'

export interface PaymentFormData {
  type: InvoiceType
  amount: number
  recordDate: string
  projectId: number | ''
  partnerId: number | ''
  contractId: number | ''
  remarks: string
  invoiceDetails: { invoiceId: number; paymentAmount: number }[]
  fileUrl: string
  fileType: 'pdf' | 'image' | ''
}

export interface PaymentFormProps {
  initialData: PaymentFormData
  projects: Project[]
  partners: Partner[]
  invoices: Invoice[]
  contracts: { income: IncomeContract[]; expense: ExpenseContract[] }
  onSubmit: (data: PaymentFormData) => void
  onCancel: () => void
}

// Component

export const PaymentForm: React.FC<PaymentFormProps> = ({
  initialData,
  projects,
  partners,
  invoices,
  contracts,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<PaymentFormData>(initialData)
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<FilePreviewData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            processFileForUpload(file)
            return
          }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const processFileForUpload = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('只能上传 JPG、PNG、WebP 或 PDF 格式的文件')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      setFormData(prev => ({ ...prev, fileUrl: base64, fileType: fileType as 'pdf' | 'image' }))
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFile(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFile(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFileForUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFileForUpload(file)
    }
    e.target.value = ''
  }

  const handleInvoiceSelectionChange = (invoiceId: number, checked: boolean) => {
    setFormData(prev => {
      const details = [...prev.invoiceDetails]
      if (checked) {
        details.push({ invoiceId, paymentAmount: 0 })
      } else {
        const index = details.findIndex(d => d.invoiceId === invoiceId)
        if (index !== -1) details.splice(index, 1)
      }
      return { ...prev, invoiceDetails: details }
    })
  }

  const getAvailableInvoices = () => {
    return invoices.filter(inv => 
      inv.type === formData.type && 
      inv.status !== 'cancelled' && 
      inv.status !== 'red_flushed' &&
      (!formData.projectId || inv.projectId === formData.projectId)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isEditing = !!initialData.recordDate

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              {isEditing ? (formData.type === 'invoice_out' ? '编辑回款记录' : '编辑付款记录') : (formData.type === 'invoice_out' ? '回款登记' : '付款登记')}
            </h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">类型 *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as InvoiceType, invoiceDetails: [], contractId: '' })}
                    className="input"
                    required
                  >
                    <option value="invoice_out">回款（开票收款）</option>
                    <option value="invoice_in">付款（收票付款）</option>
                  </select>
                </div>
                <div>
                  <label className="label">收款日期 * <span className="text-xs font-normal text-slate-400">(支持粘贴自动识别)</span></label>
                  <input
                    type="text"
                    value={formData.recordDate}
                    onChange={e => {
                      const value = e.target.value
                      // 尝试自动解析日期格式
                      const parsed = parseDateString(value)
                      if (parsed) {
                        setFormData(prev => ({ ...prev, recordDate: parsed }))
                      } else if (value === '') {
                        setFormData(prev => ({ ...prev, recordDate: '' }))
                      }
                    }}
                    onBlur={e => {
                      // 失焦时格式化日期
                      const parsed = parseDateString(e.target.value)
                      if (parsed) {
                        setFormData(prev => ({ ...prev, recordDate: parsed }))
                      } else if (formData.recordDate) {
                        // 如果输入无效但之前有值，保持原值
                      } else {
                        setFormData(prev => ({ ...prev, recordDate: '' }))
                      }
                    }}
                    placeholder="2024-01-15 (可粘贴各种日期格式)"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">关联项目</label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : '', contractId: '', partnerId: '' })}
                    className="input"
                  >
                    <option value="">不关联项目</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">关联单位</label>
                  <select
                    value={formData.partnerId}
                    onChange={e => setFormData({ ...formData, partnerId: e.target.value ? Number(e.target.value) : '', contractId: '' })}
                    className="input"
                  >
                    <option value="">不关联单位</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">关联合同</label>
                <select
                  value={formData.contractId}
                  onChange={e => setFormData({ ...formData, contractId: e.target.value ? Number(e.target.value) : '' })}
                  className="input"
                  disabled={!formData.projectId}
                >
                  <option value="">{!formData.projectId ? '请先选择项目' : !formData.partnerId ? '请先选择单位' : '请选择合同'}</option>
                  {formData.projectId && formData.partnerId && formData.type === 'invoice_out' && 
                    contracts.income.filter(c => c.projectId === formData.projectId && c.partnerId === formData.partnerId)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {formData.projectId && formData.partnerId && formData.type === 'invoice_in' && 
                    contracts.expense.filter(c => c.projectId === formData.projectId && c.partnerId === formData.partnerId)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">关联发票</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                  {getAvailableInvoices().length > 0 ? (
                    getAvailableInvoices().map(invoice => {
                      const detail = formData.invoiceDetails.find(d => d.invoiceId === invoice.id)
                      const remaining = invoice.amount - invoice.receivedAmount
                      const isSelected = !!detail
                      return (
                        <div 
                          key={invoice.id}
                          className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-b-0 cursor-pointer ${
                            isSelected ? 'bg-green-50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleInvoiceSelectionChange(invoice.id, !isSelected)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-primary-600 rounded pointer-events-none"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs rounded font-mono">No.</span>
                              <span className="font-mono text-sm">{invoice.invoiceNo}</span>
                              <span className="text-xs text-slate-500">{invoice.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span>¥{formatMoney(invoice.amount)}</span>
                              <span className="text-green-600">已收 ¥{formatMoney(invoice.receivedAmount)}</span>
                              {remaining > 0 ? (
                                <span className="text-amber-600">待收 ¥{formatMoney(remaining)}</span>
                              ) : (
                                <span className="text-green-600">✓ 已收齐</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">暂无可关联的发票</div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">{formData.type === 'invoice_out' ? '本次回款金额' : '本次付款金额'}</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  step="0.01"
                  required
                />
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
              <div>
                <label className="label">上传{formData.type === 'invoice_out' ? '回款' : '付款'}凭证</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {formData.fileUrl ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
                          {formData.fileType === 'pdf' ? <Icon name="FileText" size={20} /> : <Icon name="Image" size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {formData.fileType === 'pdf' ? 'PDF文件' : '图片文件'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ data: formData.fileUrl, type: formData.fileType === 'pdf' ? 'pdf' : 'image', title: '凭证预览' })}
                          className="px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          预览
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, fileUrl: '', fileType: '' }))}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      dragOverFile ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-slate-400">
                      <div className="text-3xl mb-2"><Icon name="Paperclip" size={32} /></div>
                      <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
                      <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="btn btn-secondary">取消</button>
              <button type="submit" className="btn bg-amber-500 hover:bg-amber-600 text-white">
                {isEditing ? '保存' : '登记'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  )
}

export default PaymentForm