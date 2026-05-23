import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock config
vi.mock('@/components/features/costLedger/config', () => ({
  DIRECTION_CONFIG: {
    expense: { label: '支出', color: 'text-red-600', bg: 'bg-red-50' },
    income: { label: '收入', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  },
  getCategoryDisplayLabel: (code: string, level: string) => code,
  getLevel1Color: () => '#f97316',
  isCategoryMissing: () => false,
}))

// Mock utils
vi.mock('@/utils/format', () => ({ formatMoney: (n: number) => n.toLocaleString() }))
vi.mock('@/utils/date', () => ({ normalizeDate: (d: string) => d }))

import { CostLedgerRow } from '@/components/features/costLedger/CostLedgerRow'

const baseEntry: any = {
  id: 1,
  voucherNo: 'PZ-001',
  date: '2026-01-15',
  direction: 'expense' as const,
  category: 'labor',
  counterparty: '张三劳务',
  channel: '银行转账',
  amount: 50000,
  summary: '1月劳务费',
  notes: '已付清',
}

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()

describe('CostLedgerRow', () => {
  test('应渲染支出方向行', () => {
    render(React.createElement(CostLedgerRow, {
      entry: baseEntry, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('PZ-001')).toBeTruthy()
    expect(screen.getByText('支出')).toBeTruthy()
    expect(screen.getByText('张三劳务')).toBeTruthy()
  })

  test('支出金额应显示减号', () => {
    render(React.createElement(CostLedgerRow, {
      entry: baseEntry, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('-50,000')).toBeTruthy()
  })

  test('收入金额应显示加号', () => {
    render(React.createElement(CostLedgerRow, {
      entry: { ...baseEntry, direction: 'income' }, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('+50,000')).toBeTruthy()
  })

  test('点击编辑应触发 onEdit', () => {
    render(React.createElement(CostLedgerRow, {
      entry: baseEntry, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('编辑'))
    expect(mockOnEdit).toHaveBeenCalledWith(baseEntry)
  })

  test('点击删除应触发 onDelete', () => {
    render(React.createElement(CostLedgerRow, {
      entry: baseEntry, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('删除'))
    expect(mockOnDelete).toHaveBeenCalledWith(1)
  })

  test('无凭证号应显示短横线', () => {
    render(React.createElement(CostLedgerRow, {
      entry: { ...baseEntry, voucherNo: '' }, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('-')).toBeTruthy()
  })

  test('备注为空应显示短横线', () => {
    render(React.createElement(CostLedgerRow, {
      entry: { ...baseEntry, notes: '' }, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    // 多个 '-' (voucherNo 和 notes 都可能为空)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})
