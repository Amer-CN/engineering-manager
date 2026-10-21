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

  const handleInvoiceSelectionChange = (invoice: Invoice, checked: boolean) => {
  setFormData(prev => {
  const details = [...prev.invoiceDetails]
  if (checked) {
    // T4b：默认核销额 = 该发票剩余可核销额。后端 allocated_amount 恒返回数字（无核销为 0），
    // 故必须用 >0 判断回退到手工已收金额，不能写 `allocatedAmount ?? receivedAmount`（0 会短路）。
    // 编辑场景重选同一发票时，把本付款记录旧的核销额加回，避免默认值偏小。
    const allocated = Number(invoice.allocatedAmount ?? 0)
    const received = Number(invoice.receivedAmount ?? 0)
    const used = allocated > 0 ? allocated : received
    const ownOld = Number((initialData.invoiceDetails ?? []).find(d => d.invoiceId === invoice.id)?.paymentAmount ?? 0)
    const remaining = Math.max(0, Math.round((invoice.amount - used + ownOld) * 100) / 100)
    details.push({ invoiceId: invoice.id, paymentAmount: remaining })
  } else { const idx = details.findIndex(d => d.invoiceId === invoice.id); if (idx !== -1) details.splice(idx, 1) }
  return { ...prev, invoiceDetails: details }
  })
  }

  // T4b：用户手动修改核销金额（仅更新目标发票，不触碰其它行，避免静默覆盖用户输入）
  const handleAllocationAmountChange = (invoiceId: number, paymentAmount: number) => {
  setFormData(prev => ({
  ...prev,
  invoiceDetails: prev.invoiceDetails.map(d => d.invoiceId === invoiceId ? { ...d, paymentAmount } : d)
  }))
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

  // T4b：合计与逐行校验（全部分口径，避免浮点误差）；未选发票时不拦截，保留无发票付款
  const allocatedTotalFen = formData.invoiceDetails.reduce((sum, d) => sum + Math.round((Number(d.paymentAmount) || 0) * 100), 0)
  const paymentAmountFen = Math.round((Number(formData.amount) || 0) * 100)
  const hasInvoiceDetails = formData.invoiceDetails.length > 0
  const invoiceById = new Map(invoices.map(i => [i.id, i]))
  const rowError = formData.invoiceDetails.reduce((err, d) => {
  if (err) return err
  const inv = invoiceById.get(d.invoiceId)
  if (!inv) return '关联发票已不可用，请重新选择'
  const allocated = Number(inv.allocatedAmount ?? 0)
  const received = Number(inv.receivedAmount ?? 0)
  const used = allocated > 0 ? allocated : received
  const ownOld = Number((initialData.invoiceDetails ?? []).find(x => x.invoiceId === d.invoiceId)?.paymentAmount ?? 0)
  const maxFen = Math.round(Math.max(0, inv.amount - used + ownOld) * 100)
  const fen = Math.round((Number(d.paymentAmount) || 0) * 100)
  if (fen < 0) return '核销金额不能为负'
  if (fen > maxFen) return `单张发票核销不得超过其剩余可核销额（${inv.invoiceNo || inv.name}）`
  return ''
  }, '')
  const allocationError = !hasInvoiceDetails
  ? ''
  : rowError
  ? rowError
  : allocatedTotalFen > paymentAmountFen
  ? '核销合计不得超过付款金额'
  : allocatedTotalFen <= 0
  ? '请填写核销金额'
  : ''

  return (
  <Drawer open onClose={onCancel} dirty={isDirty}
  icon="Wallet"
  title={isEditing ? (formData.type === 'invoice_out' ? '编辑回款记录' : '编辑付款记录') : (formData.type === 'invoice_out' ? '回款登记' : '付款登记')}
  footer={
  <div className="flex items-center justify-end gap-3">
  <Button type="button" onClick={onCancel}  variant="secondary">取消</Button>
          <Button type="submit" form="payment-form" variant="warning" disabled={!!allocationError}>{isEditing ? '保存' : '登记'}</Button>
  </div>
  }>
  <form id="payment-form" onSubmit={e => { e.preventDefault(); if (allocationError) return; onSubmit(formData) }} className="px-6 py-4">
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
  <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value ? Number(e.target.value) : '', contractId: '', partnerId: '', invoiceDetails: [] })} className="input">
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
  const allocatedForRow = Number(invoice.allocatedAmount ?? 0)
  const remaining = invoice.amount - (allocatedForRow > 0 ? allocatedForRow : invoice.receivedAmount)
  const isSelected = !!detail
  return (
  <div key={invoice.id} className="flex items-center gap-3 p-3 last:border-b-0 cursor-pointer transition-colors"
  style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'var(--accent-soft)' : 'transparent' }}
  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--panel-2)' }}
  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
  onClick={() => handleInvoiceSelectionChange(invoice, !isSelected)}>
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
  {remaining > 0 ? <span style={{ color: 'var(--warning)' }}>待核销 ¥{formatMoney(remaining)}</span> : <span style={{ color: 'var(--success)' }}>✓ 已核销完</span>}
  </div>
  </div>
  {isSelected && detail && (
  <Input
  size="sm"
  type="number"
  step="0.01"
  min="0"
  aria-label={`核销金额 ${invoice.invoiceNo}`}
  value={detail.paymentAmount}
  onClick={e => e.stopPropagation()}
  onChange={e => handleAllocationAmountChange(invoice.id, Number(e.target.value) || 0)}
  containerClassName="max-w-32 shrink-0"
  className="text-right"
  />
  )}
  </div>
  )
  }) : <div className="p-4 text-center text-sm" style={{ color: 'var(--muted)' }}>暂无可关联的发票</div>}
  </div>
  {hasInvoiceDetails && (
  <div className="text-xs mt-2 font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
  已分配 ¥{formatMoney(allocatedTotalFen / 100)} / 付款金额 ¥{formatMoney(formData.amount)}
  </div>
  )}
  {allocationError && <div className="text-xs mt-1 text-danger-500">{allocationError}</div>}
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
  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-[opacity,background-color,border-color,box-shadow] duration-300 disabled:opacity-60"
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
