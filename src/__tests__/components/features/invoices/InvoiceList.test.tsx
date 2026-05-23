import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock EmptyState
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: any) => <div>{title}</div>,
}))

// Mock InvoiceRow
vi.mock('@/components/features/invoices/InvoiceRow', () => ({
  InvoiceRow: ({ invoice }: any) => <tr data-testid="invoice-row"><td>{invoice.name}</td></tr>,
}))

import { InvoiceList } from '@/components/features/invoices/InvoiceList'

describe('InvoiceList', () => {
  const baseInvoices = [
    { id: 1, name: '建材发票', invoiceDate: '2026-01-15', seller: 'A公司', buyer: '我方', taxRate: 6, amount: 10000, receivedAmount: 5000, status: 'partial' } as any,
  ]

  test('空列表应显示空状态', () => {
    render(React.createElement(InvoiceList, {
      invoices: [],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('暂无发票')).toBeTruthy()
  })

  test('有数据时应渲染表格', () => {
    render(React.createElement(InvoiceList, {
      invoices: baseInvoices,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('开票日期')).toBeTruthy()
    expect(screen.getByText('发票名称')).toBeTruthy()
  })

  test('应渲染发票行', () => {
    render(React.createElement(InvoiceList, {
      invoices: baseInvoices,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByTestId('invoice-row')).toBeTruthy()
  })
})
