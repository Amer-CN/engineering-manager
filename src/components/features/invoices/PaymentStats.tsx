/**
 * PaymentStats.tsx - 收款记录统计卡片组件
 */

import React from 'react'
import { PaymentRecord, Invoice } from '@/types/electron'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Icon name="Download" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">回款总额</p>
            <p className="text-lg font-bold text-blue-600">¥{formatMoney(stats.paymentInAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><Icon name="Upload" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">付款总额</p>
            <p className="text-lg font-bold text-red-600">¥{formatMoney(stats.paymentOutAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Icon name="LayoutDashboard" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">记录总数</p>
            <p className="text-lg font-bold text-amber-600 flex items-center gap-2">
              {stats.totalCount} 笔
              <span className="text-xs font-normal text-slate-400 leading-tight">
                回款{paymentsIn.length}<br />付款{paymentsOut.length}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><Icon name="AlertCircle" size={20} className="text-orange-600" /></div>
          <div>
            <p className="text-xs text-slate-500">剩余未收</p>
            <p className={`text-lg font-bold ${stats.unpaidOut > 0 ? 'text-red-600' : 'text-slate-400'}`}>¥{formatMoney(stats.unpaidOut)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><Icon name="AlertCircle" size={20} className="text-red-600" /></div>
          <div>
            <p className="text-xs text-slate-500">剩余未付</p>
            <p className={`text-lg font-bold ${stats.unpaidIn > 0 ? 'text-red-600' : 'text-slate-400'}`}>¥{formatMoney(stats.unpaidIn)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentStats
