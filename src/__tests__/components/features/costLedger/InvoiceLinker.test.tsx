import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { InvoiceLinker } from '@/components/features/costLedger/InvoiceLinker'

describe('InvoiceLinker', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getInvoices = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 1, invoiceNo: 'INV-001', counterparty: '供应商A' },
        { id: 2, invoiceNo: 'INV-002', sellerName: '供应商B' },
      ],
    })
  })

  test('未选择发票时应显示搜索框', async () => {
    render(React.createElement(InvoiceLinker, { projectId: 1, value: undefined, onChange: mockOnChange }))
    // 等待组件异步加载完成（消除 Act 警告）
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索发票号或对方名称...')).toBeTruthy()
    })
  })

  test('已选择发票应显示发票信息和清除按钮', async () => {
    render(React.createElement(InvoiceLinker, { projectId: 1, value: 1, onChange: mockOnChange }))
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeTruthy()
    })
    expect(screen.getByText('清除')).toBeTruthy()
  })

  test('点击清除应调用 onChange(undefined)', async () => {
    render(React.createElement(InvoiceLinker, { projectId: 1, value: 1, onChange: mockOnChange }))
    await waitFor(() => {
      expect(screen.getByText('清除')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('清除'))
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(undefined)
    })
  })

  test('搜索应过滤发票列表', async () => {
    render(React.createElement(InvoiceLinker, { projectId: 1, value: undefined, onChange: mockOnChange }))
    const input = screen.getByPlaceholderText('搜索发票号或对方名称...')
    fireEvent.change(input, { target: { value: 'INV-001' } })
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeTruthy()
      expect(screen.queryByText('INV-002')).toBeNull()
    })
  })

  test('projectId 为 0 时不应加载发票', () => {
    render(React.createElement(InvoiceLinker, { projectId: 0, value: undefined, onChange: mockOnChange }))
    expect((window.electronAPI as any).getInvoices).not.toHaveBeenCalled()
  })
})
