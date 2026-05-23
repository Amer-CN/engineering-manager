import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/projects/ProjectStats')

describe('ProjectStats', () => {
  const baseStats = {
    totalExpenses: 100000,
    incomeTotal: 500000, expenseTotal: 100000, invoiceInTotal: 80000,
    invoiceOutTotal: 300000, receivedInTotal: 200000, receivedOutTotal: 100000,
    staffCount: 5, workerCount: 30, teamCount: 4,
    materialTotal: 50000, settlementIncomeTotal: 100000, settlementExpenseTotal: 80000,
    totalRevenue: 500000, totalCost: 200000, netProfit: 300000,
    daysElapsed: 100, totalDays: 365, timeProgress: 27,
    partnerCount: 10, materialCount: 20, workerCountTotal: 30,
  }

  afterEach(cleanup)

  test('应渲染合同价', async () => {
    const { ProjectStats } = await importModule()
    render(React.createElement(ProjectStats, { budget: 500000, stats: baseStats }))
    expect(screen.getByText('合同价')).toBeTruthy()
  })

  test('应渲染已支出', async () => {
    const { ProjectStats } = await importModule()
    render(React.createElement(ProjectStats, { budget: 500000, stats: baseStats }))
    expect(screen.getByText('已支出')).toBeTruthy()
  })

  test('应渲染人员统计', async () => {
    const { ProjectStats } = await importModule()
    render(React.createElement(ProjectStats, { budget: 500000, stats: baseStats }))
    expect(screen.getByText('管理人员')).toBeTruthy()
    expect(screen.getByText('农民工')).toBeTruthy()
    expect(screen.getByText('班组')).toBeTruthy()
  })

  test('应显示正确的人员数量', async () => {
    const { ProjectStats } = await importModule()
    render(React.createElement(ProjectStats, { budget: 500000, stats: baseStats }))
    expect(screen.getByText('5人')).toBeTruthy()
    expect(screen.getByText('30人')).toBeTruthy()
    expect(screen.getByText('4个')).toBeTruthy()
  })
})
