/**
 * InvoiceList.tsx - 发票列表组件
 */

import React from 'react'
import { Invoice, InvoiceStatus } from '@/types/electron'
import { EmptyState } from '../../ui/EmptyState'
import { InvoiceRow } from './InvoiceRow'
import { TABLE } from '@/constants/table'

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
    <div className={TABLE.container}>
      <table className={TABLE.table}>
        <thead className={TABLE.headerRow + ' ' + TABLE.stickyHeader}>
          <tr>
            <th className={TABLE.headerCell}>开票日期</th>
            <th className={TABLE.headerCell}>发票名称</th>
            <th className={TABLE.headerCell}>销售方</th>
            <th className={TABLE.headerCell}>购买方</th>
            <th className={TABLE.headerCell + ' text-center'}>税率</th>
            <th className={TABLE.headerCell + ' text-right'}>开票金额</th>
            <th className={TABLE.headerCell + ' text-right'}>已收金额</th>
            <th className={TABLE.headerCell + ' text-center'}>状态</th>
            <th className={TABLE.headerCell + ' text-center'}>操作</th>
          </tr>
        </thead>
        <tbody>
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