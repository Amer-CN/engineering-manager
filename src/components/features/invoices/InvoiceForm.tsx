// InvoiceForm.tsx - 发票表单组件

import React, { useState, useEffect, useRef } from 'react'
import { Invoice, InvoiceType, InvoiceKind, InvoiceTaxRate, Project, Partner, IncomeContract, ExpenseContract } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

// 常量

export const taxRateOptions: { value: InvoiceTaxRate; label: string }[] = [
  { value: 0, label: '不征税' },
  { value: 0.01, label: '1%' },
  { value: 0.03, label: '3%' },
  { value: 0.06, label: '6%' },
  { value: 0.09, label: '9%' },
  { value: 0.13, label: '13%' }
]

export const invoiceKindOptions: { value: InvoiceKind; label: string }[] = [
  { value: 'paper_regular', label: '纸质普票' },
  { value: 'paper_special', label: '纸质专票' },
  { value: 'electronic_regular', label: '电子普票' },
  { value: 'electronic_special', label: '电子专票' }
]

// Types

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

// 工具函数

const calculateFromTaxed = (taxedAmount: number, taxRate: number) => {
  if (taxRate === 0) {
    return { priceAmount: Math.round(taxedAmount * 100) / 100, taxAmount: 0 }
  }
  const priceAmount = taxedAmount / (1 + taxRate)
  const taxAmount = taxedAmount - priceAmount
  return { 
    priceAmount: Math.round(priceAmount * 100) / 100, 
    taxAmount: Math.round(taxAmount * 100) / 100 
  }
}

const calculateFromUntaxed = (untaxedAmount: number, taxRate: number) => {
  const taxAmount = untaxedAmount * taxRate
  const taxedAmount = untaxedAmount + taxAmount
  return { 
    amount: Math.round(taxedAmount * 100) / 100, 
    taxAmount: Math.round(taxAmount * 100) / 100 
  }
}

// Component

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  projects,
  partners,
  contracts,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<InvoiceFormData>(initialData)
  const [amountMode, setAmountMode] = useState<'taxed' | 'untaxed'>('taxed')
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf', title: string} | null>(null)
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
      setFormData(prev => ({ ...prev, fileUrl: base64, fileType }))
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

  const handleTaxRateChange = (newTaxRate: number) => {
    if (amountMode === 'taxed' && formData.amount > 0) {
      const { priceAmount, taxAmount } = calculateFromTaxed(formData.amount, newTaxRate)
      setFormData(prev => ({
        ...prev,
        taxRate: newTaxRate as InvoiceTaxRate,
        priceAmount,
        taxAmount
      }))
    } else if (amountMode === 'untaxed' && formData.priceAmount > 0) {
      const { amount, taxAmount } = calculateFromUntaxed(formData.priceAmount, newTaxRate)
      setFormData(prev => ({
        ...prev,
        taxRate: newTaxRate as InvoiceTaxRate,
        amount,
        taxAmount
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        taxRate: newTaxRate as InvoiceTaxRate
      }))
    }
  }

  const handleTaxedAmountChange = (value: number) => {
    setAmountMode('taxed')
    const { priceAmount, taxAmount } = calculateFromTaxed(value, formData.taxRate)
    setFormData(prev => ({
      ...prev,
      amount: value,
      priceAmount,
      taxAmount
    }))
  }

  const handleUntaxedAmountChange = (value: number) => {
    setAmountMode('untaxed')
    const { amount, taxAmount } = calculateFromUntaxed(value, formData.taxRate)
    setFormData(prev => ({
      ...prev,
      amount,
      priceAmount: value,
      taxAmount
    }))
  }

  const handleTaxAmountChange = (value: number) => {
    setAmountMode('untaxed')
    const newAmount = Math.round((formData.priceAmount + value) * 100) / 100
    setFormData(prev => ({
      ...prev,
      amount: newAmount,
      taxAmount: value
    }))
  }

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
                      const pastedText = e.clipboardData.getData('text')
                      // 尝试解析各种日期格式
                      const patterns = [
                        // YYYY/MM/DD, YYYY.MM.DD, YYYY年MM月DD日
                        /(\d{4})[年/./-](\d{1,2})[月/./-](\d{1,2})/,
                        // MM/DD/YYYY 或 DD/MM/YYYY
                        /(\d{1,2})[月/./-](\d{1,2})[月/./-](\d{4})/,
                      ]
                      
                      // 尝试匹配 YYYY-MM-DD 格式
                      const ymdMatch = pastedText.match(/(\d{4})[年/./-](\d{1,2})[月/./-](\d{1,2})/)
                      if (ymdMatch) {
                        const year = ymdMatch[1]
                        const month = ymdMatch[2].padStart(2, '0')
                        const day = ymdMatch[3].padStart(2, '0')
                        const normalizedDate = `${year}-${month}-${day}`
                        // 验证日期有效性
                        if (!isNaN(Date.parse(normalizedDate))) {
                          setFormData({ ...formData, issueDate: normalizedDate })
                          e.preventDefault()
                          return
                        }
                      }
                      
                      // 尝试中文格式 YYYY年MM月DD日
                      const cnMatch = pastedText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
                      if (cnMatch) {
                        const year = cnMatch[1]
                        const month = cnMatch[2].padStart(2, '0')
                        const day = cnMatch[3].padStart(2, '0')
                        const normalizedDate = `${year}-${month}-${day}`
                        if (!isNaN(Date.parse(normalizedDate))) {
                          setFormData({ ...formData, issueDate: normalizedDate })
                          e.preventDefault()
                        }
                      }
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
              <div>
                <label className="label">上传发票</label>
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
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-lg">
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
                          onClick={() => setPreviewFile({ data: formData.fileUrl, type: formData.fileType === 'pdf' ? 'pdf' : 'image', title: '发票预览' })}
                          className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg"
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
                      dragOverFile ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
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
              <button type="submit" className="btn btn-primary">{isEditing ? '保存' : '创建'}</button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* 预览模态框 */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setPreviewFile(null)}>
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{previewFile.title}</h3>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {previewFile.type === 'pdf' ? (
                <iframe src={previewFile.data} className="w-full h-full border-0" />
              ) : (
                <img src={previewFile.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

export default InvoiceForm