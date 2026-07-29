import React, { useState, useRef } from 'react'
import { InvoiceType, Project, Partner, IncomeContract, ExpenseContract, Invoice } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { parseDateString } from '@/utils/date'
import { Drawer } from '../../ui/Drawer'
import { Input } from '../../ui/Input/Input'
import { PaymentFileUpload } from './PaymentFileUpload'
import { useBankReceiptOCR } from '@/hooks/useBankReceiptOCR'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'

export interface PaymentFormData {
  type: InvoiceType; amount: number; recordDate: string
  projectId: number | ''; partnerId: number | ''; contractId: number | ''
  remarks: string; invoiceDetails: { invoiceId: number; paymentAmount: number }[]
  fileUrl: string; fileType: 'pdf' | 'image' | ''
}

export interface PaymentFormProps {
  initialData: PaymentFormData
  projects: Project[]; partners: Partner[]; invoices: Invoice[]
  contracts: { income: IncomeContract[]; expense: ExpenseContract[] }
  /** 是否为编辑既有记录（新建时 recordDate 默认今天，不能用它判断） */
  isEditing?: boolean
  onSubmit: (data: PaymentFormData) => void; onCancel: () => void
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ initialData, projects, partners, invoices, contracts, isEditing = false, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<PaymentFormData>(initialData)
  // dirty 判定：与初值任一字段有差异时，误触关闭先弹确认（Drawer dirty 契约）
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData)
  const { processBankReceiptFile } = useBankReceiptOCR()
  const [bankReceiptLoading, setBankReceiptLoading] = useState(false)
  const bankReceiptInputRef = useRef<HTMLInputElement>(null)

  const handleInvoiceSelectionChange = (invoiceId: number, checked: boolean) => {
  setFormData(prev => {
  const details = [...prev.invoiceDetails]
  if (checked) details.push({ invoiceId, paymentAmount: 0 })
  else { const idx = details.findIndex(d => d.invoiceId === invoiceId); if (idx !== -1) details.splice(idx, 1) }
  return { ...prev, invoiceDetails: details }
  })
  }

  // 银行回单 OCR 识别
  const handleBankReceiptOCR = async (file: File) => {
  setBankReceiptLoading(true)
  try {
  const result = await processBankReceiptFile(file)
  if (result) {
  // 自动匹配金额和日期
  setFormData(prev => ({
  ...prev,
  amount: result.amount || prev.amount,
  recordDate: result.transactionDate || prev.recordDate,
  remarks: result.remarks || prev.remarks,
  }))
  }
  } finally {
  setBankReceiptLoading(false)
  }
  }

  const getAvailableInvoices = () => invoices.filter(inv =>
  inv.type === formData.type && inv.status !== 'cancelled' && inv.status !== 'red_flushed' &&
  (!formData.projectId || inv.projectId === formData.projectId)
  )

  const typeLabel = formData.type === 'invoice_out' ? '回款' : '付款'

  return (
  <Drawer open onClose={onCancel} dirty={isDirty}
  icon="Wallet"
  title={isEditing ? (formData.type === 'invoice_out' ? '编辑回款记录' : '编辑付款记录') : (formData.type === 'invoice_out' ? '回款登记' : '付款登记')}
  footer={
  <div className="flex items-center justify-end gap-3">
  <Button type="button" onClick={onCancel}  variant="secondary">取消</Button>
  <Button type="button" onClick={() => onSubmit(formData)}  variant="warning">{isEditing ? '保存' : '登记'}</Button>
  </div>
  }>
  <form onSubmit={e => { e.preventDefault(); onSubmit(formData) }} className="px-6 py-4">
  <div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
  <div>
  <label className="label">类型 *</label>
  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as InvoiceType, invoiceDetails: [], contractId: '' })} className="input" required>
  <option value="invoice_out">回款（开票收款）</option>
  <option value="invoice_in">付款（收票付款）</option>
  </select>
  </div>
  <div>
  <Input label="收款日期" type="text" value={formData.recordDate}
  onChange={e => { const parsed = parseDateString(e.target.value); if (parsed) setFormData(p => ({ ...p, recordDate: parsed })); else if (e.target.value === '') setFormData(p => ({ ...p, recordDate: '' })) }}
  onBlur={e => { const parsed = parseDateString(e.target.value); if (parsed) setFormData(p => ({ ...p, recordDate: parsed })) }}
  placeholder="2024-01-15 (可粘贴各种日期格式)" size="sm" required
  helpText="支持粘贴自动识别" />
  </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
  <div>
  <label className="label">关联项目</label>
  <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : '', contractId: '', partnerId: '' })} className="input">
  <option value="">不关联项目</option>
  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  </div>
  <div>
  <label className="label">关联单位</label>
  <select value={formData.partnerId} onChange={e => setFormData({ ...formData, partnerId: e.target.value ? Number(e.target.value) : '', contractId: '' })} className="input">
  <option value="">不关联单位</option>
  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
  </div>
  </div>

  <div>
  <label className="label">关联合同</label>
  <select value={formData.contractId} onChange={e => setFormData({ ...formData, contractId: e.target.value ? Number(e.target.value) : '' })} className="input" disabled={!formData.projectId}>
  <option value="">{!formData.projectId ? '请先选择项目' : !formData.partnerId ? '请先选择单位' : '请选择合同'}</option>
  {formData.projectId && formData.partnerId && formData.type === 'invoice_out' &&
  contracts.income.filter(c => c.projectId === formData.projectId && c.partnerId === formData.partnerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  {formData.projectId && formData.partnerId && formData.type === 'invoice_in' &&
  contracts.expense.filter(c => c.projectId === formData.projectId && c.partnerId === formData.partnerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
  </div>

  <div>
  <label className="label">关联发票</label>
  <div className="rounded-lg max-h-48 overflow-y-auto" style={{ border: '1px solid var(--border)' }}>
  {getAvailableInvoices().length > 0 ? getAvailableInvoices().map(invoice => {
  const detail = formData.invoiceDetails.find(d => d.invoiceId === invoice.id)
  const remaining = invoice.amount - invoice.receivedAmount
  const isSelected = !!detail
  return (
  <div key={invoice.id} className="flex items-center gap-3 p-3 last:border-b-0 cursor-pointer transition-colors"
  style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--accent-soft)' : 'transparent' }}
  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--panel-2)' }}
  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
  onClick={() => handleInvoiceSelectionChange(invoice.id, !isSelected)}>
  <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded pointer-events-none accent-[color:var(--accent)]" />
  <div className="flex-1">
  <div className="flex items-center gap-2">
  <span className="px-1.5 py-0.5 text-xs rounded font-mono" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>No.</span>
  <span className="font-mono text-sm" style={{ color: 'var(--fg)' }}>{invoice.invoiceNo}</span>
  <span className="text-xs" style={{ color: 'var(--muted)' }}>{invoice.name}</span>
  </div>
  <div className="flex items-center gap-3 text-xs mt-1 font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
  <span className="font-mono tabular-nums">¥{formatMoney(invoice.amount)}</span>
  <span style={{ color: 'var(--success)' }}>已收 ¥{formatMoney(invoice.receivedAmount)}</span>
  {remaining > 0 ? <span style={{ color: 'var(--warning)' }}>待收 ¥{formatMoney(remaining)}</span> : <span style={{ color: 'var(--success)' }}>✓ 已收齐</span>}
  </div>
  </div>
  </div>
  )
  }) : <div className="p-4 text-center text-sm" style={{ color: 'var(--muted)' }}>暂无可关联的发票</div>}
  </div>
  </div>

  <div>
  <Input label={formData.type === 'invoice_out' ? '本次回款金额' : '本次付款金额'} type="number" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) || 0 })} size="sm" min="0" step="0.01" required />
  </div>

  <div>
  <label className="label">备注</label>
  <textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="input min-h-[80px]" />
  </div>

  <PaymentFileUpload
  fileUrl={formData.fileUrl} fileType={formData.fileType}
  typeLabel={typeLabel}
  onFileChange={(dataUrl, ft) => setFormData(p => ({ ...p, fileUrl: dataUrl, fileType: ft }))}
  onFileRemove={() => setFormData(p => ({ ...p, fileUrl: '', fileType: '' }))}
  />

  {/* 银行回单 OCR 识别按钮 */}
  {formData.fileUrl && formData.fileType === 'image' && (
  <div>
  <input
  ref={bankReceiptInputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
  className="hidden"
  onChange={async (e) => {
  const file = e.target.files?.[0]
  if (file) await handleBankReceiptOCR(file)
  if (bankReceiptInputRef.current) bankReceiptInputRef.current.value = ''
  }}
  />
  <button
  type="button"
  onClick={() => bankReceiptInputRef.current?.click()}
  disabled={bankReceiptLoading}
  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 disabled:opacity-60"
  style={bankReceiptLoading ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { background: 'var(--panel-2)', color: 'var(--fg-2)' }}
  >
  {bankReceiptLoading ? (
  <>
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
  <span className="animate-pulse">AI 正在识别银行回单...</span>
  </>
  ) : (
  <>
  <Icon name="Sparkles" size={16} />
  AI 识别银行回单（自动填入金额和日期）
  </>
  )}
  </button>
  </div>
  )}
  </div>
  </form>
  </Drawer>
  )
}

export default PaymentForm
