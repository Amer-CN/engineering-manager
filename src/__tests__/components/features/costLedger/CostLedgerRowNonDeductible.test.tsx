import { render, screen, waitFor } from '@testing-library/react'
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

// Mock api-adapter：getInvoices 返回关联发票（含不得抵扣原因）
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn(async () => ({
    getInvoices: vi.fn(async (projectId: number) => ({
      success: true,
      data: projectId === 1
        ? [{ id: 7, invoiceNo: 'INV-007', nonDeductibleReason: 'abnormal_loss' }]
        : [],
    })),
  })),
}))

import { CostLedgerRow, clearLinkedInvoiceReasonCache } from '@/components/features/costLedger/CostLedgerRow'

const baseEntry: any = {
  id: 1,
  projectId: 1,
  voucherNo: 'PZ-001',
  date: '2026-01-15',
  direction: 'expense' as const,
  category: 'labor',
  counterparty: '张三劳务',
  channel: '银行转账',
  amount: 50000,
  summary: '1月劳务费',
  notes: '',
}

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()

describe('CostLedgerRow FP08 不得抵扣联动', () => {
  beforeEach(() => {
    clearLinkedInvoiceReasonCache()
  })

  test('有关联发票且原因非空应显示不得抵扣徽标', async () => {
    render(React.createElement(CostLedgerRow, {
      entry: { ...baseEntry, linkedInvoiceId: 7 }, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    await waitFor(() => {
      expect(screen.getByText('不得抵扣·非正常损失')).toBeTruthy()
    })
  })

  test('无关联发票不显示徽标', () => {
    render(React.createElement(CostLedgerRow, {
      entry: baseEntry, categoryLevel: 'level1', onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.queryByText(/不得抵扣·/)).toBeNull()
  })
})
