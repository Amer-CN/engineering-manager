import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import { SettlementProjectCard } from '@/components/features/settlement/SettlementProjectCard'

describe('SettlementProjectCard', () => {
  const mockOnClick = vi.fn()

  const baseData = {
    projectId: 1,
    projectName: '安岳高标准农田',
    totalCount: 10,
    pendingCount: 3,
    completedCount: 5,
    archivedCount: 2,
    totalAmount: 500000,
    incomeAmount: 300000,
    expenseAmount: 200000,
    latestDate: '2026-01-15',
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染项目名称', () => {
    render(React.createElement(SettlementProjectCard, { data: baseData, onClick: mockOnClick }))
    expect(screen.getByText('安岳高标准农田')).toBeTruthy()
  })

  test('应渲染收入和支出金额', () => {
    render(React.createElement(SettlementProjectCard, { data: baseData, onClick: mockOnClick }))
    expect(screen.getByText('收入结算')).toBeTruthy()
    expect(screen.getByText('支出结算')).toBeTruthy()
  })

  test('应渲染结算笔数', () => {
    render(React.createElement(SettlementProjectCard, { data: baseData, onClick: mockOnClick }))
    expect(screen.getByText('10 笔')).toBeTruthy()
  })

  test('有待办时应显示待办数', () => {
    render(React.createElement(SettlementProjectCard, { data: baseData, onClick: mockOnClick }))
    expect(screen.getByText('3 笔待办')).toBeTruthy()
  })

  test('无待办时不显示待办文本', () => {
    render(React.createElement(SettlementProjectCard, {
      data: { ...baseData, pendingCount: 0 },
      onClick: mockOnClick,
    }))
    expect(screen.queryByText(/笔待办/)).toBeNull()
  })

  test('无最近结算日期时不显示日期行', () => {
    render(React.createElement(SettlementProjectCard, {
      data: { ...baseData, latestDate: '' },
      onClick: mockOnClick,
    }))
    expect(screen.queryByText(/最近结算/)).toBeNull()
  })

  test('点击卡片应触发 onClick', () => {
    render(React.createElement(SettlementProjectCard, { data: baseData, onClick: mockOnClick }))
    // onClick 在外层 div 上
    const card = screen.getByText('安岳高标准农田').closest('.cursor-pointer')!
    fireEvent.click(card)
    expect(mockOnClick).toHaveBeenCalledWith(1)
  })
})
