import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

import OverdueBanner from '@/components/features/wages/OverdueBanner'

describe('OverdueBanner', () => {
  const mockOnViewDetail = vi.fn()

  const baseStats = {
    overdueWorkerCount: 5,
    totalOverdueAmount: 50000,
    maxOverdueDays: 30,
  } as any

  test('stats 为 null 时不应渲染', () => {
    const { container } = render(React.createElement(OverdueBanner, { stats: null, onViewDetail: mockOnViewDetail }))
    expect(container.innerHTML).toBe('')
  })

  test('overdueWorkerCount 为 0 时不应渲染', () => {
    const { container } = render(React.createElement(OverdueBanner, {
      stats: { ...baseStats, overdueWorkerCount: 0 }, onViewDetail: mockOnViewDetail,
    }))
    expect(container.innerHTML).toBe('')
  })

  test('有欠薪时应显示预警信息', () => {
    render(React.createElement(OverdueBanner, { stats: baseStats, onViewDetail: mockOnViewDetail }))
    expect(screen.getByText(/欠薪预警/)).toBeTruthy()
    expect(screen.getByText(/5 名工人/)).toBeTruthy()
  })

  test('点击查看详情应触发 onViewDetail', () => {
    render(React.createElement(OverdueBanner, { stats: baseStats, onViewDetail: mockOnViewDetail }))
    fireEvent.click(screen.getByText('查看详情'))
    expect(mockOnViewDetail).toHaveBeenCalled()
  })

  test('点击关闭按钮应隐藏横幅', () => {
    render(React.createElement(OverdueBanner, { stats: baseStats, onViewDetail: mockOnViewDetail }))
    const closeBtn = screen.getByText('×')
    fireEvent.click(closeBtn)
    // 横幅应该消失（visible 变为 false）
    expect(screen.queryByText(/欠薪预警/)).toBeNull()
  })
})
