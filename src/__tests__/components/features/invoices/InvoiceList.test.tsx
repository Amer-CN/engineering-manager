import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock EmptyState
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: any) => <div>{title}</div>,
}))

// 注：InvoiceList 已重构为使用 DataTable + columns 配置渲染，不再使用 InvoiceRow 组件，
// 因此不存在 data-testid="invoice-row"。发票数据行现由 DataTable 根据列配置渲染。

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
    // 数据行由 DataTable 渲染：name 列显示发票名称，据此确认行已渲染
    expect(screen.getByText('建材发票')).toBeTruthy()
    // 表头行 + 数据行，至少存在一个数据行
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
  })
})
