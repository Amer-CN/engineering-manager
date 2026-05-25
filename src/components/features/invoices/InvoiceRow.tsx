import React from 'react'
import { Invoice, InvoiceStatus, InvoiceType, InvoiceKind } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'

// ═══════════════════════════════════════════════════════════════════════════════
// 状态 & 票种配置（从 InvoiceList 提取的展示逻辑）
// ═══════════════════════════════════════════════════════════════════════════════

const statusConfigMap = {
  issued:    { labelOut: '已开具', labelIn: '已收票', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  partially_paid: { labelOut: '部分收款', labelIn: '部分付款', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  received:  { labelOut: '已收齐', labelIn: '已付清', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { labelOut: '已作废', labelIn: '已作废', color: 'text-red-600', bgColor: 'bg-red-100' },
  red_flushed: { labelOut: '已红冲', labelIn: '已红冲', color: 'text-orange-600', bgColor: 'bg-orange-100' }
} as const

const getStatusLabel = (status: InvoiceStatus, type?: InvoiceType) => {
  const entry = statusConfigMap[status]
  if (!entry) return '未知'
  return type === 'invoice_in' ? entry.labelIn : entry.labelOut
}

const getStatusConfig = (status: InvoiceStatus | string, invoiceType?: InvoiceType) => {
  const entry = statusConfigMap[status as InvoiceStatus]
  const label = entry ? (invoiceType === 'invoice_in' ? entry.labelIn : entry.labelOut) : '未知'
  return { label, color: entry?.color || 'text-slate-600', bgColor: entry?.bgColor || 'bg-slate-100' }
}

const kindConfig: Record<InvoiceKind, { label: string; color: string; bgColor: string }> = {
  paper_regular: { label: '纸普', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  paper_special: { label: '纸专', color: 'text-red-600', bgColor: 'bg-red-100' },
  electronic_regular: { label: '电普', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  electronic_special: { label: '电专', color: 'text-purple-600', bgColor: 'bg-purple-100' }
}

const getKindConfig = (kind: InvoiceKind | string) => {
  return kindConfig[kind as InvoiceKind] || { label: '纸质', color: 'text-amber-600', bgColor: 'bg-amber-100' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 行组件
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvoiceRowProps {
  invoice: Invoice
  onEdit: (invoice: Invoice) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: InvoiceStatus) => void
  onPrint: (invoice: Invoice) => void
  onPreview: (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => void
}

export const InvoiceRow = React.memo(function InvoiceRow({
  invoice,
  onEdit,
  onDelete,
  onStatusChange,
  onPrint,
  onPreview
}: InvoiceRowProps) {
  return (
    <tr className="table-row-hover">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{invoice.issueDate}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`px-1.5 py-0.5 rounded text-xs ${invoice.type === 'invoice_in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {invoice.type === 'invoice_in' ? '收票' : '开票'}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs ${getKindConfig(invoice.invoiceKind).bgColor} ${getKindConfig(invoice.invoiceKind).color}`}>
            {getKindConfig(invoice.invoiceKind).label}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">No.{invoice.invoiceNo}</div>
      </td>
      <td className="px-4 py-3 font-medium text-slate-800">{invoice.name}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{invoice.sellerName || '-'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{invoice.buyerName || '-'}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-600">
        {(invoice.taxRate * 100).toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-bold text-slate-800">¥{formatMoney(invoice.amount)}</div>
        <div className="text-xs text-slate-400">税: ¥{formatMoney(invoice.taxAmount)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className={`font-bold ${invoice.receivedAmount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
          ¥{formatMoney(invoice.receivedAmount)}
        </div>
        {invoice.amount > 0 && invoice.receivedAmount < invoice.amount && (
          <div className="text-xs text-red-500 mt-0.5">
            剩余 ¥{formatMoney(invoice.amount - invoice.receivedAmount)}
          </div>
        )}
        {invoice.amount > 0 && invoice.receivedAmount > 0 && (
          <div className="mt-0.5">
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${invoice.receivedAmount >= invoice.amount ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(invoice.receivedAmount / invoice.amount * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {Math.round(invoice.receivedAmount / invoice.amount * 100)}%
            </div>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <select
          value={invoice.status}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(invoice.id, e.target.value as InvoiceStatus)
          }}
          onClick={(e) => e.stopPropagation()}
          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusConfig(invoice.status, invoice.type).bgColor} ${getStatusConfig(invoice.status, invoice.type).color}`}
          style={{ background: 'transparent', outline: 'none' }}
        >
          <option value="issued">{getStatusLabel('issued', invoice.type)}</option>
          <option value="partially_paid">{getStatusLabel('partially_paid', invoice.type)}</option>
          <option value="received">{getStatusLabel('received', invoice.type)}</option>
          <option value="cancelled">已作废</option>
          <option value="red_flushed">已红冲</option>
        </select>
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {invoice.fileUrl && (
            <button
              onClick={() => onPreview(invoice.fileUrl!, invoice.fileType === 'pdf' ? 'pdf' : 'image', `${invoice.invoiceNo} - 发票附件`, 'invoices', invoice.type === 'invoice_out' ? 'invoice_out' : 'invoice_in', invoice.projectName, invoice.projectId ?? undefined)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded transition-colors"
              title="预览"
            >
              <Icon name="Eye" size={14} />
            </button>
          )}
          <button
            onClick={() => onPrint(invoice)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded transition-colors"
            title="打印"
          >
            <Icon name="Printer" size={14} />
          </button>
          <button
            onClick={() => onEdit(invoice)}
            className="btn btn-ghost btn-sm"
            title="编辑"
          >
            <Icon name="Edit" size={14} />
          </button>
          <button
            onClick={() => onDelete(invoice.id)}
            className="btn btn-danger btn-sm"
            title="删除"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
})
