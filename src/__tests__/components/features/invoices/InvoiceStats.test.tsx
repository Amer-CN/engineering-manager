import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock formatMoney
vi.mock('@/utils/format', () => ({ formatMoney: (n: number) => n.toLocaleString() }))

import InvoiceStats from '@/components/features/invoices/InvoiceStats'
import type { Invoice } from '@/types'

describe('InvoiceStats', () => {
  const baseInvoices = [
    { type: 'invoice_out', amount: 100000, invoiceKind: 'paper_special', taxAmount: 5000 },
    { type: 'invoice_in', amount: 80000, invoiceKind: 'electronic_regular', taxAmount: 2000 },
    { type: 'invoice_out', amount: 50000, invoiceKind: 'paper_regular', taxAmount: 1000 },
  ] as any as Invoice[]

  test('应渲染统计卡片', () => {
    render(React.createElement(InvoiceStats, { invoices: baseInvoices, filteredInvoices: baseInvoices }))
    expect(screen.getByText('开票总额')).toBeTruthy()
    expect(screen.getByText('收票总额')).toBeTruthy()
    expect(screen.getByText('发票总数')).toBeTruthy()
    expect(screen.getByText('专票税额')).toBeTruthy()
    expect(screen.getByText('普票税额')).toBeTruthy()
  })

  test('应正确计算发票总数', () => {
    render(React.createElement(InvoiceStats, { invoices: baseInvoices, filteredInvoices: baseInvoices }))
    expect(screen.getByText('3 张')).toBeTruthy()
  })

  test('空发票列表应显示零值', () => {
    render(React.createElement(InvoiceStats, { invoices: [], filteredInvoices: [] }))
    // 总数卡 + FP08 不得抵扣卡各显示 0 张
    expect(screen.getAllByText('0 张').length).toBe(2)
  })

  test('FP08：应汇总不得抵扣张数与金额', () => {
    const mixed = [
      ...baseInvoices,
      { type: 'invoice_in', amount: 20000, invoiceKind: 'paper_special', taxAmount: 1000, nonDeductibleReason: 'welfare_personal' },
    ] as any as Invoice[]
    render(React.createElement(InvoiceStats, { invoices: mixed, filteredInvoices: mixed }))
    expect(screen.getByText('不得抵扣')).toBeTruthy()
    expect(screen.getByText('1 张')).toBeTruthy()
  })

  test('票种两维：专票税额按 invoiceCategory 口径汇总（kind 为空）', () => {
    const mixed = [
      { type: 'invoice_in', amount: 113, invoiceMedium: 'paper', invoiceCategory: 'special', invoiceKind: '', taxAmount: 13 },
      { type: 'invoice_in', amount: 100, invoiceMedium: 'electronic', invoiceCategory: 'passenger_transport', invoiceKind: '', taxAmount: 9 },
      { type: 'invoice_in', amount: 105, invoiceMedium: 'electronic', invoiceCategory: 'regular', invoiceKind: '', taxAmount: 5 },
    ] as any as Invoice[]
    render(React.createElement(InvoiceStats, { invoices: mixed, filteredInvoices: mixed }))
    // 专/普按两维汇总；旅客运输不落入任一口径
    expect(screen.getByText('¥13')).toBeTruthy()
    expect(screen.getByText('¥5')).toBeTruthy()
  })
})
