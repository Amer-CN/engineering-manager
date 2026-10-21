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

  test('FP08：有不得抵扣原因应渲染原因徽标', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 2, name: '团建餐费', type: 'invoice_in', invoiceKind: 'paper_regular', taxRate: 0.06, amount: 5000, taxAmount: 300, receivedAmount: 0, status: 'issued', nonDeductibleReason: 'catering_entertainment' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('抵扣')).toBeTruthy()
    expect(screen.getByText('餐饮娱乐')).toBeTruthy()
  })

  test('FP08：无原因应显示可抵扣', () => {
    render(React.createElement(InvoiceList, {
      invoices: baseInvoices,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('可抵扣')).toBeTruthy()
  })

  test('票种两维：旧数据仅 invoiceKind 显示「纸质 · 专票」且可作废', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 3, name: '纸质专票', type: 'invoice_out', invoiceKind: 'paper_special', taxRate: 0.13, amount: 100, taxAmount: 13, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('纸质 · 专票')).toBeTruthy()
    expect(screen.getByRole('option', { name: '已作废' })).not.toBeDisabled()
  })

  test('票种两维：电子旅客运输显示「电子 · 旅客运输」且不可作废', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 4, name: '电子旅客运输', type: 'invoice_in', invoiceKind: '', invoiceMedium: 'electronic', invoiceCategory: 'passenger_transport', taxRate: 0.09, amount: 100, taxAmount: 9, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('电子 · 旅客运输')).toBeTruthy()
    expect(screen.getByRole('option', { name: '已作废（数电票不可作废）' })).toBeDisabled()
  })

  test('票种两维：两维与 kind 均缺失时显示「未知」', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 5, name: '未知票种', type: 'invoice_in', invoiceKind: '', taxRate: 0.09, amount: 100, taxAmount: 9, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('未知')).toBeTruthy()
  })

  test('P0-b：进项已抵扣行显示「已抵扣」徽标', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 6, name: '进项已抵扣', type: 'invoice_in', invoiceKind: 'electronic_special', isDeducted: true, taxRate: 0.13, amount: 100, taxAmount: 13, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('已抵扣')).toBeTruthy()
    expect(screen.queryByText('未抵扣')).toBeNull()
  })

  test('P0-b：进项未抵扣行显示「未抵扣」徽标', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 7, name: '进项未抵扣', type: 'invoice_in', invoiceKind: 'electronic_special', isDeducted: false, taxRate: 0.13, amount: 100, taxAmount: 13, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('未抵扣')).toBeTruthy()
    expect(screen.queryByText('已抵扣')).toBeNull()
  })

  test('P0-b：销项行不渲染抵扣徽标', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 8, name: '销项票', type: 'invoice_out', invoiceKind: 'electronic_regular', isDeducted: false, taxRate: 0.06, amount: 100, taxAmount: 6, receivedAmount: 0, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.queryByText('已抵扣')).toBeNull()
    expect(screen.queryByText('未抵扣')).toBeNull()
  })

  test('T4b：allocatedAmount 有值时渲染「已核销」与「未核销」', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 9, name: '部分核销发票', type: 'invoice_in', invoiceKind: 'paper_special', taxRate: 0.06, amount: 1000, taxAmount: 60, receivedAmount: 100, allocatedAmount: 400, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getByText('已核销')).toBeTruthy()
    expect(screen.getByText('¥400')).toBeTruthy()
    expect(screen.getByText('未核销 ¥600')).toBeTruthy()
    // 既有「已收金额」列保留，不与核销列混淆
    expect(screen.getByText('已收金额')).toBeTruthy()
    expect(screen.getByText('¥100')).toBeTruthy()
  })

  test('T4b：核销金额等于开票金额时不显示「未核销」', () => {
    render(React.createElement(InvoiceList, {
      invoices: [
        { id: 10, name: '已核销发票', type: 'invoice_in', invoiceKind: 'paper_special', taxRate: 0.06, amount: 1000, taxAmount: 60, receivedAmount: 100, allocatedAmount: 1000, status: 'issued' } as any,
      ],
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onPrint: vi.fn(),
      onPreview: vi.fn(),
    }))
    expect(screen.getAllByText('¥1,000').length).toBeGreaterThan(0)
    expect(screen.queryByText(/未核销/)).toBeNull()
  })
})
