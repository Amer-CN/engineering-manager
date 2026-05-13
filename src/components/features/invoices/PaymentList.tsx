/**
 * PaymentList.tsx - 收款记录列表组件
 */

import React from 'react'
import { PaymentRecord, Invoice } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'

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
  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-12 text-center">
        <div className="text-6xl mb-4"><Icon name="DollarSign" size={48} /></div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">暂无回款/付款记录</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">点击下方按钮登记第一笔回款或付款</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      <table className="w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">日期</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">类型</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">关联单位</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">关联发票</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">金额</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">本次收款比例</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">备注</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map(record => (
            <tr key={record.id} className="table-row-hover">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{record.recordDate || (record as any).date || '-'}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-lg text-sm ${record.type === 'invoice_in' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {record.type === 'invoice_in' ? <><Icon name="Upload" size={14} className="inline-block" /> 付款</> : <><Icon name="Download" size={14} className="inline-block" /> 回款</>}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{record.partnerName || '-'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  {(record as any).invoiceInfos?.map((info: any) => (
                    <div key={info.invoiceId} className="text-xs">
                      <div className="font-mono text-slate-700">{info.invoiceNo}</div>
                      <div className="text-slate-500 mt-0.5">开票金额 ¥{formatMoney(info.invoiceAmount)}</div>
                    </div>
                  )) || <span className="text-xs text-slate-400">-</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-bold text-green-600">¥{formatMoney(record.amount)}</div>
              </td>
              <td className="px-4 py-3 text-center">
                {(() => {
                  const invoiceInfos = (record as any).invoiceInfos || []
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
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">{record.remarks || '-'}</td>
              <td className="px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  {record.fileUrl && (
                    <button
                      onClick={() => onPreview(record.fileUrl!, record.fileType === 'pdf' ? 'pdf' : 'image', `${record.recordDate} - ${record.type === 'invoice_out' ? '回款' : '付款'}凭证`, 'payments', record.type === 'invoice_out' ? 'payment_in' : 'payment_out', record.projectName, record.projectId)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded transition-colors"
                      title="预览凭证"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onPrint(record)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded transition-colors"
                    title="打印凭证"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(record)}
                    className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PaymentList