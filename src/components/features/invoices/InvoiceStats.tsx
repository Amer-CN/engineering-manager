/**
 * InvoiceStats.tsx - 发票统计卡片组件
 */

import React from 'react'
import { Invoice } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'
import { Card } from '@/components/ui/Card'

interface InvoiceStatsProps {
  invoices: Invoice[]
  filteredInvoices: Invoice[]
}

export const InvoiceStats: React.FC<InvoiceStatsProps> = ({ invoices, filteredInvoices }) => {
  const invoiceOut = filteredInvoices.filter(i => i.type === 'invoice_out')
  const invoiceIn = filteredInvoices.filter(i => i.type === 'invoice_in')
  const isSpecial = (kind: string) => kind === 'paper_special' || kind === 'electronic_special'
  const isRegular = (kind: string) => kind === 'paper_regular' || kind === 'electronic_regular'

  const stats = {
  invoiceOutAmount: invoiceOut.reduce((sum, i) => sum + i.amount, 0),
  invoiceInAmount: invoiceIn.reduce((sum, i) => sum + i.amount, 0),
  totalCount: filteredInvoices.length,
  // 专票税额（可抵扣）
  specialTax: filteredInvoices.filter(i => isSpecial(i.invoiceKind)).reduce((sum, i) => sum + (i.taxAmount || 0), 0),
  // 普票税额
  regularTax: filteredInvoices.filter(i => isRegular(i.invoiceKind)).reduce((sum, i) => sum + (i.taxAmount || 0), 0),
  }

  return (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Upload" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>开票总额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>¥{formatMoney(stats.invoiceOutAmount)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Download" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>收票总额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>¥{formatMoney(stats.invoiceInAmount)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="LayoutDashboard" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>发票总数</p>
  <p className="text-lg font-bold flex items-center gap-2 font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>
  {stats.totalCount} 张
  <span className="text-xs font-normal leading-tight" style={{ color: 'var(--muted)' }}>
  开票{invoiceOut.length}<br />收票{invoiceIn.length}
  </span>
  </p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Shield" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>专票税额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: stats.specialTax > 0 ? 'var(--fg)' : 'var(--muted)' }}>¥{formatMoney(stats.specialTax)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}><Icon name="File" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>普票税额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: stats.regularTax > 0 ? 'var(--fg)' : 'var(--muted)' }}>¥{formatMoney(stats.regularTax)}</p>
  </div>
  </div>
  </Card>
  </div>
  )
}

export default InvoiceStats