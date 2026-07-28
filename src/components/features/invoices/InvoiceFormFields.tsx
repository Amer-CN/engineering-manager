import React from 'react'
import type { InvoiceType, InvoiceKind, Partner, Project, IncomeContract, ExpenseContract } from '@/types/electron'
import type { InvoiceFormData } from './InvoiceForm'
import { parseDateString } from '@/utils/date'
import { motion } from 'framer-motion'
import { Input } from '../../ui/Input/Input'
import { Icon } from '../../ui/Icon'
import { invoiceKindOptions, taxRateOptions } from './constants'

interface InvoiceFormFieldsProps {
  formData: InvoiceFormData
  setFormData: React.Dispatch<React.SetStateAction<InvoiceFormData>>
  partners: Partner[]
  projects: Project[]
  contracts: { income: IncomeContract[]; expense: ExpenseContract[] }
  handleInvoiceNoChange: (value: string) => void
  handleTaxRateChange: (rate: number) => void
  handleTaxedAmountChange: (amount: number) => void
  handleUntaxedAmountChange: (amount: number) => void
  handleTaxAmountChange: (amount: number) => void
  duplicateInvoice: { id: number; invoiceNo: string } | null
}

export const InvoiceFormFields: React.FC<InvoiceFormFieldsProps> = ({
  formData, setFormData, partners, projects, contracts,
  handleInvoiceNoChange, handleTaxRateChange, handleTaxedAmountChange,
  handleUntaxedAmountChange, handleTaxAmountChange, duplicateInvoice
}) => {
  return (
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
              className="mt-1 p-2 rounded-lg"
              style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
            >
              <div className="flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} className="text-[color:var(--warning)]" />
                <span className="text-xs" style={{ color: 'var(--warning)' }}>
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
    </div>
  )
}