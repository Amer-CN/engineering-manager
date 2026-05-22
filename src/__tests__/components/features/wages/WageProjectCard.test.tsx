// @ts-nocheck
/**
 * WageProjectCard.tsx 组件测试
 */

import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => React.createElement('span', { 'data-icon': name }, `[${name}]`),
}))

vi.mock('@/utils/format', () => ({
  formatMoney: (v: number) => v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
}))

// wage 子组件测试需要正确路径
const { WageProjectCard } = await import('@/components/features/wages/WageProjectCard')

const mockData = {
  projectId: 1,
  projectName: '安岳县高标准农田项目',
  totalWages: 125000,
  recordCount: 42,
  latestMonth: '2026-04',
  currentMonthWages: 8500,
  currentMonthCount: 15,
}

describe('WageProjectCard.tsx', () => {
  test('应显示项目名称', () => {
    render(React.createElement(WageProjectCard, { data: mockData, selectedMonth: '2026-05', onClick: vi.fn() }))
    expect(screen.getByText('安岳县高标准农田项目')).toBeTruthy()
  })

  test('应显示格式化后的金额', () => {
    render(React.createElement(WageProjectCard, { data: mockData, selectedMonth: '2026-05', onClick: vi.fn() }))
    expect(screen.getByText('¥125,000.00')).toBeTruthy()
    expect(screen.getByText('¥8,500.00')).toBeTruthy()
  })

  test('点击应调用 onClick 回调', () => {
    const onClick = vi.fn()
    render(React.createElement(WageProjectCard, { data: mockData, selectedMonth: '2026-05', onClick }))
    fireEvent.click(screen.getByText('安岳县高标准农田项目'))
    expect(onClick).toHaveBeenCalledWith(1)
  })
})
