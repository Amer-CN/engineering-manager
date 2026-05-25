/**
 * InvoiceList.tsx - 发票列表组件
 */

import React from 'react'
import { Invoice, InvoiceStatus } from '@/types/electron'
import { EmptyState } from '../../ui/EmptyState'
import { InvoiceRow } from './InvoiceRow'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface InvoiceListProps {
  invoices: Invoice[]
  onEdit: (invoice: Invoice) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: InvoiceStatus) => void
  onPrint: (invoice: Invoice) => void
  onPreview: (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onEdit,
  onDelete,
  onStatusChange,
  onPrint,
  onPreview
}) => {
  if (invoices.length === 0) {
    return (
      <EmptyState icon="Receipt" title="暂无发票" description="点击下方按钮创建您的第一张发票" />
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      <table className="w-full border-separate border-spacing-0">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr className="">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">开票日期</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">发票名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">销售方</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">购买方</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">税率</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">开票金额</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">已收金额</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">状态</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase bg-slate-50">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map(invoice => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onPrint={onPrint}
              onPreview={onPreview}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InvoiceList