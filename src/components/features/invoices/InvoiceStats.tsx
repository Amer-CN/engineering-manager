/**
 * InvoiceStats.tsx - 发票统计卡片组件
 */

import React from 'react'
import { Invoice } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { Icon } from '../../ui/Icon'

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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Icon name="Upload" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">开票总额</p>
            <p className="text-lg font-bold text-blue-600">¥{formatMoney(stats.invoiceOutAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Icon name="Download" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">收票总额</p>
            <p className="text-lg font-bold text-green-600">¥{formatMoney(stats.invoiceInAmount)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Icon name="LayoutDashboard" size={20} /></div>
          <div>
            <p className="text-xs text-slate-500">发票总数</p>
            <p className="text-lg font-bold text-amber-600 flex items-center gap-2">
              {stats.totalCount} 张
              <span className="text-xs font-normal text-slate-400 leading-tight">
                开票{invoiceOut.length}<br />收票{invoiceIn.length}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center"><Icon name="Shield" size={20} className="text-violet-600" /></div>
          <div>
            <p className="text-xs text-slate-500">专票税额</p>
            <p className={`text-lg font-bold ${stats.specialTax > 0 ? 'text-violet-600' : 'text-slate-400'}`}>¥{formatMoney(stats.specialTax)}</p>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Icon name="File" size={20} className="text-slate-600" /></div>
          <div>
            <p className="text-xs text-slate-500">普票税额</p>
            <p className={`text-lg font-bold ${stats.regularTax > 0 ? 'text-slate-600' : 'text-slate-400'}`}>¥{formatMoney(stats.regularTax)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceStats