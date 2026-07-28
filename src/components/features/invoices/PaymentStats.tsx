/**
 * PaymentStats.tsx - 收款记录统计卡片组件
 */

import React from 'react'
import { PaymentRecord, Invoice } from '@/types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'
import { Card } from '@/components/ui/Card'

interface PaymentStatsProps {
  records: PaymentRecord[]
  filteredRecords: PaymentRecord[]
  invoices: Invoice[]
}

export const PaymentStats: React.FC<PaymentStatsProps> = ({ records, filteredRecords, invoices }) => {
  const paymentsIn = filteredRecords.filter(r => r.type === 'invoice_out')
  const paymentsOut = filteredRecords.filter(r => r.type === 'invoice_in')

  const invoiceOut = invoices.filter(i => i.type === 'invoice_out')
  const invoiceIn = invoices.filter(i => i.type === 'invoice_in')

  const stats = {
  paymentInAmount: paymentsIn.reduce((sum, r) => sum + r.amount, 0),
  paymentOutAmount: paymentsOut.reduce((sum, r) => sum + r.amount, 0),
  totalCount: filteredRecords.length,
  // 剩余未收 = 开票总额 - 已回款金额
  unpaidOut: invoiceOut.reduce((sum, i) => sum + (i.amount - (i.receivedAmount || 0)), 0),
  // 剩余未付 = 收票总额 - 已付款金额
  unpaidIn: invoiceIn.reduce((sum, i) => sum + (i.amount - (i.receivedAmount || 0)), 0),
  }

  return (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Download" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>回款总额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>¥{formatMoney(stats.paymentInAmount)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="Upload" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>付款总额</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>¥{formatMoney(stats.paymentOutAmount)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="LayoutDashboard" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>记录总数</p>
  <p className="text-lg font-bold flex items-center gap-2 font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>
  {stats.totalCount} 笔
  <span className="text-xs font-normal leading-tight" style={{ color: 'var(--muted)' }}>
  回款{paymentsIn.length}<br />付款{paymentsOut.length}
  </span>
  </p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: stats.unpaidOut > 0 ? 'var(--danger-soft)' : 'var(--panel-2)', color: stats.unpaidOut > 0 ? 'var(--danger)' : 'var(--muted)' }}><Icon name="AlertCircle" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>剩余未收</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: stats.unpaidOut > 0 ? 'var(--danger)' : 'var(--muted)' }}>¥{formatMoney(stats.unpaidOut)}</p>
  </div>
  </div>
  </Card>
  <Card bordered={false} className="p-4">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: stats.unpaidIn > 0 ? 'var(--danger-soft)' : 'var(--panel-2)', color: stats.unpaidIn > 0 ? 'var(--danger)' : 'var(--muted)' }}><Icon name="AlertCircle" size={20} /></div>
  <div>
  <p className="text-xs" style={{ color: 'var(--muted)' }}>剩余未付</p>
  <p className="text-lg font-bold font-mono tabular-nums tracking-tight" style={{ color: stats.unpaidIn > 0 ? 'var(--danger)' : 'var(--muted)' }}>¥{formatMoney(stats.unpaidIn)}</p>
  </div>
  </div>
  </Card>
  </div>
  )
}

export default PaymentStats
