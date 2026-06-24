/**
 * PaymentList.tsx - 收款记录列表组件
 */

import React from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { PaymentRecord } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'
import { Tooltip } from '../../ui/Tooltip/Tooltip'
import { Button } from '../../ui/Button'

interface PaymentListProps {
  records: PaymentRecord[]
  onEdit: (record: PaymentRecord) => void
  onDelete: (id: number) => void
  onPrint: (record: PaymentRecord) => void
  onPreview: (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => void
}

export const PaymentList: React.FC<PaymentListProps> = ({
  records,
  onEdit,
  onDelete,
  onPrint,
  onPreview
}) => {
  const columns: Column<PaymentRecord>[] = [
    {
      key: 'recordDate', title: '日期',
      render: (record) => (
        <div className="font-medium text-slate-800">{record.recordDate || (record as PaymentRecord & { date?: string }).date || '-'}</div>
      )
    },
    {
      key: 'type', title: '类型',
      render: (record) => (
        <span className={`px-2 py-1 rounded-lg text-sm ${record.type === 'invoice_in' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {record.type === 'invoice_in' ? <><Icon name="Upload" size={14} className="inline-block" /> 付款</> : <><Icon name="Download" size={14} className="inline-block" /> 回款</>}
        </span>
      )
    },
    {
      key: 'partnerName', title: '关联单位',
      render: (record) => (
        <span className="text-slate-600">{record.partnerName || '-'}</span>
      )
    },
    {
      key: 'invoiceInfos', title: '关联发票',
      render: (record) => (
        <div className="flex flex-col gap-1.5">
          {(record as PaymentRecord & { invoiceInfos?: { invoiceNo: string; invoiceName: string; invoiceAmount: number }[] }).invoiceInfos?.map((info: any) => (
            <div key={info.invoiceId} className="text-xs">
              <div className="font-mono text-slate-700">{info.invoiceNo}</div>
              <div className="text-slate-500 mt-0.5">开票金额 ¥{formatMoney(info.invoiceAmount)}</div>
            </div>
          )) || <span className="text-xs text-slate-400">-</span>}
        </div>
      )
    },
    {
      key: 'amount', title: '金额', align: 'right',
      render: (record) => (
        <div className="font-bold text-green-600">¥{formatMoney(record.amount)}</div>
      )
    },
    {
      key: 'ratio', title: '本次收款比例', align: 'center',
      render: (record) => {
        const invoiceInfos = (record as PaymentRecord & { invoiceInfos?: { invoiceNo: string; invoiceName: string; invoiceAmount: number }[] }).invoiceInfos || []
        const totalInvoiceAmount = invoiceInfos.reduce((sum: number, info: any) => sum + info.invoiceAmount, 0)
        if (totalInvoiceAmount === 0) {
          return <span className="text-slate-400">-</span>
        }
        const ratio = (record.amount / totalInvoiceAmount) * 100
        const isFull = ratio >= 100
        const isPartial = ratio > 0 && ratio < 100
        const colorClass = isFull ? 'bg-green-100 text-green-700' : isPartial ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        const barColor = isFull ? 'bg-green-500' : isPartial ? 'bg-amber-500' : 'bg-red-500'
        return (
          <div className="flex flex-col items-center gap-1">
            <span className={`px-2 py-0.5 rounded text-sm font-medium ${colorClass}`}>
              {ratio.toFixed(0)}%
            </span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(ratio, 100)}%` }}></div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'remarks', title: '备注',
      render: (record) => (
        <span className="text-slate-500">{record.remarks || '-'}</span>
      )
    },
    {
      key: 'actions', title: '操作', align: 'center',
      render: (record) => (
        <div className="flex items-center justify-center gap-1">
          {record.fileUrl && (
            <Tooltip content="预览凭证" position="top" delay={300}>
              <button
                onClick={() => onPreview(record.fileUrl!, record.fileType === 'pdf' ? 'pdf' : 'image', `${record.recordDate} - ${record.type === 'invoice_out' ? '回款' : '付款'}凭证`, 'payments', record.type === 'invoice_out' ? 'payment_in' : 'payment_out', record.projectName, record.projectId ?? undefined)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </Tooltip>
          )}
          <Tooltip content="打印凭证" position="top" delay={300}>
            <button
              onClick={() => onPrint(record)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="编辑" position="top" delay={300}>
            <Button
              onClick={() => onEdit(record)}
              
             variant="ghost" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
          </Tooltip>
          <Tooltip content="删除" position="top" delay={300}>
            <Button
              onClick={() => onDelete(record.id)}
              
             variant="danger" size="sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </Tooltip>
        </div>
      )
    },
  ]

  return (
    <DataTable
      data={records}
      columns={columns}
      rowKey="id"
      pagination={false}
      emptyText="暂无回款/付款记录"
      emptyIcon="DollarSign"
      useHoverScrollbar
      scrollClassName="h-full"
    />
  )
}

export default PaymentList
