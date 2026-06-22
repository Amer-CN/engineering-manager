/**
 * InvoiceList.tsx - 发票列表组件
 */

import React from 'react'
import { Invoice, InvoiceStatus } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'
import { Tooltip } from '../../ui/Tooltip/Tooltip'
import { DataTable, type Column } from '@/components/DataTable'
import { getStatusLabel, getStatusConfig, getKindConfig } from './invoiceConfig'

export interface InvoiceListProps {
  invoices: Invoice[]
  onEdit: (invoice: Invoice) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: InvoiceStatus) => void
  onPrint: (invoice: Invoice) => void
  onPreview: (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => void
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onEdit,
  onDelete,
  onStatusChange,
  onPrint,
  onPreview
}) => {
  const columns: Column<Invoice>[] = [
    {
      key: 'issueDate',
      title: '开票日期',
      sortable: true,
      sorter: (a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''),
      render: (item) => (
        <>
          <div className="font-medium text-slate-800">{item.issueDate}</div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`px-1.5 py-0.5 rounded text-xs ${item.type === 'invoice_in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.type === 'invoice_in' ? '收票' : '开票'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${getKindConfig(item.invoiceKind).bgColor} ${getKindConfig(item.invoiceKind).color}`}>
              {getKindConfig(item.invoiceKind).label}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">No.{item.invoiceNo}</div>
        </>
      )
    },
    {
      key: 'name',
      title: '发票名称',
      render: (item) => (
        <span className="font-medium text-slate-800">{item.name}</span>
      )
    },
    {
      key: 'sellerName',
      title: '销售方',
      render: (item) => (
        <span className="text-slate-600">{item.sellerName || '-'}</span>
      )
    },
    {
      key: 'buyerName',
      title: '购买方',
      render: (item) => (
        <span className="text-slate-600">{item.buyerName || '-'}</span>
      )
    },
    {
      key: 'taxRate',
      title: '税率',
      align: 'center',
      render: (item) => (
        <span className="text-slate-600">{(item.taxRate * 100).toFixed(0)}%</span>
      )
    },
    {
      key: 'amount',
      title: '开票金额',
      align: 'right',
      sortable: true,
      sorter: (a, b) => ((a.amount || 0) - (b.amount || 0)),
      render: (item) => (
        <>
          <div className="font-bold text-slate-800">¥{formatMoney(item.amount)}</div>
          <div className="text-xs text-slate-400">税: ¥{formatMoney(item.taxAmount)}</div>
        </>
      )
    },
    {
      key: 'receivedAmount',
      title: '已收金额',
      align: 'right',
      render: (item) => (
        <>
          <div className={`font-bold ${item.receivedAmount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
            ¥{formatMoney(item.receivedAmount)}
          </div>
          {item.amount > 0 && item.receivedAmount < item.amount && (
            <div className="text-xs text-red-500 mt-0.5">
              剩余 ¥{formatMoney(item.amount - item.receivedAmount)}
            </div>
          )}
          {item.amount > 0 && item.receivedAmount > 0 && (
            <div className="mt-0.5">
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${item.receivedAmount >= item.amount ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(item.receivedAmount / item.amount * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {Math.round(item.receivedAmount / item.amount * 100)}%
              </div>
            </div>
          )}
        </>
      )
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      filterable: 'select',
      filterOptions: [
        { label: '已开具', value: 'issued' },
        { label: '部分收款', value: 'partially_paid' },
        { label: '已收齐', value: 'received' },
        { label: '已作废', value: 'cancelled' },
        { label: '已红冲', value: 'red_flushed' }
      ],
      filterAccessor: (item: Invoice) => item.status,
      render: (item) => (
        <select
          value={item.status}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(item.id, e.target.value as InvoiceStatus)
          }}
          onClick={(e) => e.stopPropagation()}
          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getStatusConfig(item.status, item.type).bgColor} ${getStatusConfig(item.status, item.type).color}`}
          style={{ outline: 'none' }}
        >
          <option value="issued">{getStatusLabel('issued', item.type)}</option>
          <option value="partially_paid">{getStatusLabel('partially_paid', item.type)}</option>
          <option value="received">{getStatusLabel('received', item.type)}</option>
          <option value="cancelled">已作废</option>
          <option value="red_flushed">已红冲</option>
        </select>
      )
    },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          {item.fileUrl && (
            <Tooltip content="预览" position="top" delay={300}>
              <button
                onClick={() => onPreview(item.fileUrl!, item.fileType === 'pdf' ? 'pdf' : 'image', `${item.invoiceNo} - 发票附件`, 'invoices', item.type === 'invoice_out' ? 'invoice_out' : 'invoice_in', item.projectName, item.projectId ?? undefined)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
              >
                <Icon name="Eye" size={14} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="打印" position="top" delay={300}>
            <button
              onClick={() => onPrint(item)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
            >
              <Icon name="Printer" size={14} />
            </button>
          </Tooltip>
          <Tooltip content="编辑" position="top" delay={300}>
            <button
              onClick={() => onEdit(item)}
              className="btn btn-ghost btn-sm"
            >
              <Icon name="Edit" size={14} />
            </button>
          </Tooltip>
          <Tooltip content="删除" position="top" delay={300}>
            <button
              onClick={() => onDelete(item.id)}
              className="btn btn-danger btn-sm"
            >
              <Icon name="Trash2" size={14} />
            </button>
          </Tooltip>
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={invoices}
      columns={columns}
      rowKey="id"
      pagination={false}
      emptyText="暂无发票"
      emptyIcon="Receipt"
      useHoverScrollbar
      scrollClassName="h-full"
    />
  )
}

export default InvoiceList
