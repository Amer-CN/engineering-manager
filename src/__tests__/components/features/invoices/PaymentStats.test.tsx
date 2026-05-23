import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: { div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>) },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { PaymentStats } from '@/components/features/invoices/PaymentStats'

describe('PaymentStats', () => {
  const baseRecords: any[] = [
    { id: 1, type: 'invoice_out', amount: 10000, invoiceId: 1, date: '2026-01-15', receivedBy: 'A公司' },
    { id: 2, type: 'invoice_in', amount: 5000, invoiceId: 2, date: '2026-02-15', receivedBy: 'B公司' },
  ]
  const baseInvoices: any[] = [
    { id: 1, type: 'invoice_out', amount: 20000, receivedAmount: 10000, status: 'partial' } as any,
    { id: 2, type: 'invoice_in', amount: 8000, receivedAmount: 5000, status: 'partial' } as any,
  ]

  test('应渲染统计卡片', () => {
    render(React.createElement(PaymentStats, {
      records: baseRecords,
      filteredRecords: baseRecords,
      invoices: baseInvoices,
    }))
    expect(screen.getByText('回款总额')).toBeTruthy()
    expect(screen.getByText('付款总额')).toBeTruthy()
    expect(screen.getByText('记录总数')).toBeTruthy()
    expect(screen.getByText('剩余未收')).toBeTruthy()
    expect(screen.getByText('剩余未付')).toBeTruthy()
  })

  test('应正确计算回款和付款金额', () => {
    render(React.createElement(PaymentStats, {
      records: baseRecords,
      filteredRecords: baseRecords,
      invoices: baseInvoices,
    }))
    // 回款金额和未收金额都包含 ¥10,000.00，用 getAllByText
    expect(screen.getAllByText(/¥10,000\.00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/¥5,000\.00/).length).toBeGreaterThanOrEqual(1)
  })

  test('记录总数应显示笔数', () => {
    render(React.createElement(PaymentStats, {
      records: baseRecords,
      filteredRecords: baseRecords,
      invoices: baseInvoices,
    }))
    expect(screen.getByText('2 笔')).toBeTruthy()
  })

  test('空记录应显示零金额', () => {
    render(React.createElement(PaymentStats, {
      records: [],
      filteredRecords: [],
      invoices: [],
    }))
    // 多个 ¥0.00（回款、付款、未收、未付都是0）
    expect(screen.getAllByText(/¥0\.00/).length).toBeGreaterThanOrEqual(1)
  })
})
