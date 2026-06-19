import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { WageRecordRow } from '@/components/features/wages/WageRecordRow'

describe('WageRecordRow', () => {
  const baseRecord = {
    id: 1, memberName: '张三', yearMonth: '2026-01', workDays: 22,
    actualWage: 5500, paymentLocked: false, bankReceiptPath: null,
  } as any

  const baseProps = {
    record: baseRecord,
    isSelected: false,
    paidAmount: '5500',
    paidDate: '2026-01-31',
    onToggleSelect: vi.fn(),
    onPaymentChange: vi.fn(),
  }

  test('应渲染工人姓名和月份', () => {
    render(React.createElement(WageRecordRow, baseProps))
    expect(screen.getByText('张三')).toBeTruthy()
    expect(screen.getByText('2026-01')).toBeTruthy()
  })

  test('应显示工作天数', () => {
    render(React.createElement(WageRecordRow, baseProps))
    expect(screen.getByText('22 天')).toBeTruthy()
  })

  test('应显示应发工资', () => {
    render(React.createElement(WageRecordRow, baseProps))
    expect(screen.getByText('¥5500.00')).toBeTruthy()
  })

  test('勾选应触发 onToggleSelect', () => {
    render(React.createElement(WageRecordRow, baseProps))
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(baseProps.onToggleSelect).toHaveBeenCalledWith(1)
  })

  test('差额为零应显示绿色', () => {
    const { container } = render(React.createElement(WageRecordRow, baseProps))
    // diff = 5500 - 5500 = 0, color should be green
    const diffCell = container.querySelector('.text-green-600')
    expect(diffCell).toBeTruthy()
  })

  test('差额为正应显示红色', () => {
    render(React.createElement(WageRecordRow, { ...baseProps, paidAmount: '6000' }))
    // diff = 6000 - 5500 = +500, color should be red
    const diffText = screen.getByText(/\+¥500\.00/)
    expect(diffText).toBeTruthy()
    expect(diffText.className).toContain('text-red-600')
  })
})
