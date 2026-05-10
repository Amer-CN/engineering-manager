import { useState, useEffect } from 'react'
import { CategoryPicker } from './CategoryPicker'
import { ChannelInput } from './ChannelInput'
import { InvoiceLinker } from './InvoiceLinker'
import { FileUploader } from './FileUploader'
import { DIRECTION_CONFIG, getCategoriesByDirection, emptyEntry } from './config'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

interface CostLedgerFormProps {
  projectId: number
  projectName?: string
  initial?: CostLedgerEntry | null
  onSave: (entry: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onClose: () => void
  categories?: CostLedgerCategory[]
  onManageCategories?: () => void
}

export function CostLedgerForm({ projectId, projectName, initial, onSave, onClose, categories, onManageCategories }: CostLedgerFormProps) {
  const [form, setForm] = useState(initial || emptyEntry(projectId))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initial) setForm(initial)
  }, [initial])

  const set = (key: string, value: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: value }
      // 切换方向时重置分类
      if (key === 'direction') {
        const cats = getCategoriesByDirection(value)
        next.category = cats[0]?.code || ''
      }
      return next
    })
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const isExpense = form.direction === 'expense'
  const channelLabel = isExpense ? '支付渠道' : '收入渠道'

  // 解析粘贴的日期文本，支持 2024-12-17 / 2024/12/17 / 2024.12.17 / 20241217 / 12月17日 等
  const parseDateText = (text: string): string => {
    const t = text.trim()
    // 已经是标准格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
    // 2024/12/17 或 2024.12.17
    const m = t.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/)
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    // 20241217
    const m2 = t.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
    // 2024年12月17日
    const m3 = t.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/)
    if (m3) return `${m3[1]}-${m3[2].padStart(2, '0')}-${m3[3].padStart(2, '0')}`
    return t
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.date) errs.date = '请选择日期'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errs.date = '日期格式应为 YYYY-MM-DD'
    if (!form.amount || form.amount <= 0) errs.amount = '请输入有效金额'
    if (!form.summary.trim()) errs.summary = '请输入摘要'
    else if (form.summary.length > 200) errs.summary = '摘要不超过200字'
    if (!form.counterparty.trim()) errs.counterparty = '请输入对方名称'
    if (!form.channel.trim()) errs.channel = `请输入${channelLabel}`
    else if (form.channel.length > 100) errs.channel = '渠道不超过100字'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {initial ? '编辑台账记录' : '新增台账记录'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* 方向选择 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">方向</label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('direction', d)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.direction === d
                      ? d === 'expense' ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {DIRECTION_CONFIG[d].label}
                </button>
              ))}
            </div>
          </div>

          {/* 凭证号 + 日期 + 金额 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">凭证号</label>
              <input type="number" min="1" step="1" value={form.voucherNo || ''} onChange={e => set('voucherNo', parseInt(e.target.value) || 0)}
                placeholder="自动" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="mt-0.5 text-xs text-slate-400">留空自动递增</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">日期 *</label>
              <input type="text" value={form.date} onChange={e => set('date', parseDateText(e.target.value))}
                placeholder="YYYY-MM-DD，可粘贴" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {errors.date && <p className="mt-0.5 text-xs text-red-500">{errors.date}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">金额（元）*</label>
              <input type="number" step="0.01" min="0" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {errors.amount && <p className="mt-0.5 text-xs text-red-500">{errors.amount}</p>}
            </div>
          </div>

          {/* 分类 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">分类 *</label>
            <CategoryPicker direction={form.direction} value={form.category} onChange={v => set('category', v)} categories={categories} onManage={onManageCategories} />
          </div>

          {/* 摘要 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">摘要 *</label>
            <input type="text" value={form.summary} onChange={e => set('summary', e.target.value)}
              placeholder={'如"付涂敏备用金"'} maxLength={200}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {errors.summary && <p className="mt-0.5 text-xs text-red-500">{errors.summary}</p>}
          </div>

          {/* 对方 + 渠道 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">往来单位/个人 *</label>
              <input type="text" value={form.counterparty} onChange={e => set('counterparty', e.target.value)}
                placeholder={'如"孙家英"'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {errors.counterparty && <p className="mt-0.5 text-xs text-red-500">{errors.counterparty}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">{channelLabel} *</label>
              <ChannelInput value={form.channel} onChange={v => set('channel', v)} direction={form.direction} />
              {errors.channel && <p className="mt-0.5 text-xs text-red-500">{errors.channel}</p>}
            </div>
          </div>

          {/* 关联发票 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">关联发票（可选）</label>
            <InvoiceLinker projectId={projectId} value={form.linkedInvoiceId} onChange={v => set('linkedInvoiceId', v)} />
          </div>

          {/* 备注 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">备注（可选）</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          {/* 凭证附件 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">凭证附件（可选）</label>
            <FileUploader files={form.attachments || []} onChange={v => set('attachments', v)} projectName={projectName} />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              取消
            </button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {initial ? '保存修改' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
