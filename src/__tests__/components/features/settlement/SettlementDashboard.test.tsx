import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock SettlementProjectCard
vi.mock('@/components/features/settlement/SettlementProjectCard', () => ({
  SettlementProjectCard: ({ data, onClick }: any) => (
    <div data-testid={`settlement-card-${data.projectId}`}>{data.projectName}</div>
  ),
}))

const importModule = () => import('@/components/features/settlement/SettlementDashboard')

describe('SettlementDashboard', () => {
  const baseProps = {
    settlements: [
      { id: 1, projectId: 1, type: 'income', amount: 100000, status: 'draft', periodStart: '2026-01-01', periodEnd: '2026-01-31' } as any,
      { id: 2, projectId: 1, type: 'expense', amount: 50000, status: 'completed', periodStart: '2026-01-01', periodEnd: '2026-01-31' } as any,
      { id: 3, projectId: 2, type: 'income', amount: 200000, status: 'pending', periodStart: '2026-02-01', periodEnd: '2026-02-28' } as any,
    ],
    projects: [
      { id: 1, name: '安岳项目', status: 'in_progress' } as any,
      { id: 2, name: '成都项目', status: 'in_progress' } as any,
    ],
    onProjectClick: vi.fn(),
  }

  afterEach(cleanup)

  test('应渲染统计卡片', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, baseProps))
    expect(screen.getByText('结算项目')).toBeTruthy()
    expect(screen.getByText('待办结算')).toBeTruthy()
    expect(screen.getByText('结算总笔数')).toBeTruthy()
    expect(screen.getByText('结算总金额')).toBeTruthy()
  })

  test('应渲染结算笔数', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, baseProps))
    expect(screen.getByText('3')).toBeTruthy()
  })

  test('应显示待办数量', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, baseProps))
    // draft + pending = 2, should show amber color
    const amberText = screen.getByText('2', { selector: '.text-amber-600' })
    expect(amberText).toBeTruthy()
  })

  test('应渲染项目概览标题', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, baseProps))
    expect(screen.getByText('项目结算概览')).toBeTruthy()
  })

  test('应渲染项目结算卡片', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, baseProps))
    expect(screen.getByTestId('settlement-card-1')).toBeTruthy()
    expect(screen.getByTestId('settlement-card-2')).toBeTruthy()
  })

  test('空项目应显示提示', async () => {
    const { default: SettlementDashboard } = await importModule()
    render(React.createElement(SettlementDashboard, { ...baseProps, projects: [] }))
    expect(screen.getByText('暂无项目数据')).toBeTruthy()
  })
})
