import React from 'react'
import { render, screen } from '@testing-library/react'

import { PaymentList } from '@/components/features/invoices/PaymentList'

describe('PaymentList', () => {
  const baseRecords = [
    {
      id: 1, type: 'invoice_out', amount: 10000, recordDate: '2026-01-15',
      partnerName: 'A公司', remarks: '首笔回款', fileUrl: null, fileType: null,
      invoiceInfos: [{ invoiceId: 1, invoiceNo: 'INV-001', invoiceAmount: 20000 }],
    } as any,
    {
      id: 2, type: 'invoice_in', amount: 5000, recordDate: '2026-02-15',
      partnerName: 'B公司', remarks: '', fileUrl: null, fileType: null,
      invoiceInfos: [],
    } as any,
  ]

  const baseProps = {
    records: baseRecords,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPrint: vi.fn(),
    onPreview: vi.fn(),
  }

  test('空列表应显示空状态', () => {
    render(React.createElement(PaymentList, { ...baseProps, records: [] }))
    expect(screen.getByText('暂无回款/付款记录')).toBeTruthy()
  })

  test('有数据时应渲染表格', () => {
    render(React.createElement(PaymentList, baseProps))
    expect(screen.getByText('日期')).toBeTruthy()
    expect(screen.getByText('金额')).toBeTruthy()
  })

  test('应显示记录信息', () => {
    render(React.createElement(PaymentList, baseProps))
    expect(screen.getByText('A公司')).toBeTruthy()
    expect(screen.getByText('B公司')).toBeTruthy()
  })

  test('应显示回款/付款类型', () => {
    render(React.createElement(PaymentList, baseProps))
    expect(screen.getByText('回款')).toBeTruthy()
    expect(screen.getByText('付款')).toBeTruthy()
  })
})
