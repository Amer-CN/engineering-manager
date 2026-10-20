import React from 'react'
import type { InvoiceType, InvoiceMedium, InvoiceCategory, Partner, Project, IncomeContract, ExpenseContract } from '@/types/electron'
import type { InvoiceFormData } from './InvoiceForm'
import { parseDateString } from '@/utils/date'
import { motion } from 'framer-motion'
import { Input } from '../../ui/Input/Input'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { categoryOptions, mediumOptions, nonDeductibleReasonOptions, resolveTaxRateSelectOptions } from './constants'
import { deriveInvoiceKind } from './invoiceConfig'
import { useTaxRates } from '@/hooks/data/useTaxRates'

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
  invoiceNoWarning: string | null
  /** P1/T1b 默认税率解析：显式用户动作（点击按钮）才触发，不做任何自动调用 */
  onResolveTaxRate: () => void
  resolvePending: boolean
  taxRateHint: string | null
}

export const InvoiceFormFields: React.FC<InvoiceFormFieldsProps> = ({
  formData, setFormData, partners, projects, contracts,
  handleInvoiceNoChange, handleTaxRateChange, handleTaxedAmountChange,
  handleUntaxedAmountChange, handleTaxAmountChange, duplicateInvoice, invoiceNoWarning,
  onResolveTaxRate, resolvePending, taxRateHint
}) => {
  // P1/T1：税率下拉数据源 —— 服务端主数据优先，hook 失败/空/非标准档位时回落 constants 兜底。
  // 发票仍存自己的税率快照，历史发票不受主数据变更影响。
  const { data: taxRates } = useTaxRates()
  const taxRateSelectOptions = resolveTaxRateSelectOptions(taxRates)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">发票类型 *</label>
          <select
            value={formData.type}
            onChange={e => {
              const type = e.target.value as InvoiceType
              setFormData({
                ...formData,
                type,
                // 切到开票（销项）时清空抵扣登记：仅进项可登记，避免携带脏值提交被服务端 400
                ...(type === 'invoice_in' ? {} : { isDeducted: false, deductDate: '', deductPeriod: '', deductibleTax: 0 })
              })
            }}
            className="input"
            required
          >
            <option value="invoice_in">收票</option>
            <option value="invoice_out">开票</option>
          </select>
        </div>
        <div>
          <label className="label">介质 *</label>
          <select
            value={formData.invoiceMedium}
            onChange={e => {
              const invoiceMedium = e.target.value as InvoiceMedium | ''
              setFormData({
                ...formData,
                invoiceMedium,
                invoiceKind: deriveInvoiceKind(invoiceMedium, formData.invoiceCategory)
              })
            }}
            className="input"
            required
          >
            <option value="" disabled>请选择</option>
            {mediumOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">票种 *</label>
          <select
            value={formData.invoiceCategory}
            onChange={e => {
              const invoiceCategory = e.target.value as InvoiceCategory | ''
              setFormData({
                ...formData,
                invoiceCategory,
                invoiceKind: deriveInvoiceKind(formData.invoiceMedium, invoiceCategory)
              })
            }}
            className="input"
            required
          >
            <option value="" disabled>请选择</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FP08 进项不得抵扣原因：仅收票（进项）可标记，开票时禁用 */}
      <div>
        <label className="label">进项抵扣</label>
        <select
          value={formData.nonDeductibleReason || ''}
          onChange={e => setFormData({ ...formData, nonDeductibleReason: e.target.value })}
          className="input"
          disabled={formData.type !== 'invoice_in'}
          title={formData.type !== 'invoice_in' ? '仅收票（进项）可标记不得抵扣原因' : '可抵扣（空）或六类不得抵扣原因'}
        >
          <option value="">可抵扣</option>
          {nonDeductibleReasonOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* P0-b 抵扣登记：仅收票（进项）显示；未勾选时三字段随提交清空（服务端同口径） */}
      {formData.type === 'invoice_in' && (
        <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isDeducted}
                onChange={e => {
                  const checked = e.target.checked
                  setFormData({
                    ...formData,
                    isDeducted: checked,
                    // 默认可抵扣税额等于税额（可改）；取消勾选时清零
                    deductibleTax: checked
                      ? (formData.deductibleTax || formData.taxAmount)
                      : 0,
                    ...(checked ? {} : { deductDate: '', deductPeriod: '' })
                  })
                }}
                className="w-4 h-4 rounded accent-[color:var(--accent)]"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>已抵扣</span>
            </label>
            <span className="text-caption" style={{ color: 'var(--muted)' }}>仅进项发票可登记</span>
          </div>
          {formData.isDeducted && (
            <div className="grid grid-cols-3 gap-4">
              <Input label="抵扣日期" type="date" value={formData.deductDate}
                onChange={e => setFormData({ ...formData, deductDate: e.target.value })} size="sm" />
              <Input label="税款所属期" type="month" value={formData.deductPeriod}
                onChange={e => setFormData({ ...formData, deductPeriod: e.target.value })} size="sm" required />
              <Input label="可抵扣税额（元）" type="number" value={formData.deductibleTax || ''}
                onChange={e => setFormData({ ...formData, deductibleTax: Number(e.target.value) || 0 })}
                size="sm" min="0" step="0.01" />
            </div>
          )}
        </div>
      )}

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
          {invoiceNoWarning && (
            <p className="text-caption mt-1" style={{ color: 'var(--warning)' }}>
              {invoiceNoWarning}
            </p>
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

      {formData.invoiceMedium === 'paper' && (
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
            {taxRateSelectOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {/* P1/T1b 默认税率解析：只读端点，必须由用户显式点击；点一次算一次，可重复点击重算 */}
          <div className="mt-1">
            <Button type="button" variant="secondary" size="sm" disabled={resolvePending} onClick={onResolveTaxRate}>
              按规则取默认
            </Button>
            {taxRateHint && (
              // F4：解析结论经屏幕阅读器播报（polite —— 不打断用户当前操作）
              <p className="text-caption mt-1" role="status" aria-live="polite" style={{ color: 'var(--muted)' }}>{taxRateHint}</p>
            )}
          </div>
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