import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/settlement/SettlementPrintTemplate')

describe('SettlementPrintTemplate', () => {
  const baseSettlement = {
    id: 1,
    name: '材料结算单',
    settlementNo: 'JS-2026-001',
    projectId: 1,
    partnerId: 1,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    amount: 100000,
    submittedBy: '张三',
    submittedAt: '2026-01-15T10:00:00Z',
    approvedBy: '李四',
    approvedAt: '2026-01-16T10:00:00Z',
    paidAt: null,
    items: [
      { id: 1, description: '水泥', quantity: 100, unit: '吨', unitPrice: 500, amount: 50000 },
      { id: 2, description: '钢筋', quantity: 20, unit: '吨', unitPrice: 2500, amount: 50000 },
    ],
  } as any

  const baseProps = {
    settlement: baseSettlement,
    projects: [{ id: 1, name: '安岳项目' } as any],
    partners: [{ id: 1, name: '材料公司' } as any],
  }

  afterEach(cleanup)

  test('应渲染结算单名称', async () => {
    const { PrintContent } = await importModule()
    render(React.createElement(PrintContent, baseProps))
    expect(screen.getByText('材料结算单')).toBeTruthy()
  })

  test('应渲染项目名称和单位名称', async () => {
    const { PrintContent } = await importModule()
    render(React.createElement(PrintContent, baseProps))
    expect(screen.getByText(/安岳项目/)).toBeTruthy()
    expect(screen.getByText(/材料公司/)).toBeTruthy()
  })

  test('应渲染结算周期', async () => {
    const { PrintContent } = await importModule()
    render(React.createElement(PrintContent, baseProps))
    expect(screen.getByText(/2026-01-01 至 2026-01-31/)).toBeTruthy()
  })

  test('应渲染明细表格', async () => {
    const { PrintContent } = await importModule()
    render(React.createElement(PrintContent, baseProps))
    expect(screen.getByText('项目描述')).toBeTruthy()
    expect(screen.getByText('水泥')).toBeTruthy()
    expect(screen.getByText('钢筋')).toBeTruthy()
  })

  test('应渲染签字区域', async () => {
    const { PrintContent } = await importModule()
    render(React.createElement(PrintContent, baseProps))
    expect(screen.getByText('提交人签字:')).toBeTruthy()
    expect(screen.getByText('审核人签字:')).toBeTruthy()
    expect(screen.getByText('付款人签字:')).toBeTruthy()
  })
})
