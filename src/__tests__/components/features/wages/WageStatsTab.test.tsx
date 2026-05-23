import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

import WageStatsTab from '@/components/features/wages/WageStatsTab'

describe('WageStatsTab', () => {
  test('stats 为 null 时应显示空状态', () => {
    render(React.createElement(WageStatsTab, { wageStats: null }))
    expect(screen.getByText('暂无统计数据')).toBeTruthy()
  })

  test('count 为 0 时应显示空状态', () => {
    render(React.createElement(WageStatsTab, { wageStats: { count: 0, totalWage: 0, projectBreakdown: [] } as any }))
    expect(screen.getByText('暂无统计数据')).toBeTruthy()
  })

  test('有数据时应显示工资总额和记录条数', () => {
    render(React.createElement(WageStatsTab, {
      wageStats: { count: 50, totalWage: 200000, projectBreakdown: [] } as any,
      selectedMonth: '2026-01',
    }))
    expect(screen.getByText('¥200000')).toBeTruthy()
    expect(screen.getByText('50')).toBeTruthy()
  })

  test('有项目分布数据时应显示进度条', () => {
    render(React.createElement(WageStatsTab, {
      wageStats: {
        count: 50,
        totalWage: 200000,
        projectBreakdown: [
          { projectId: 1, projectName: '安岳项目', total: 120000, percentage: 60 },
          { projectId: 2, projectName: '简阳项目', total: 80000, percentage: 40 },
        ],
      } as any,
    }))
    expect(screen.getByText('安岳项目')).toBeTruthy()
    expect(screen.getByText('简阳项目')).toBeTruthy()
    expect(screen.getByText('60%')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
  })
})
