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
    expect(screen.getByText('0 张')).toBeTruthy()
  })
})
