/**
 * WageDetailRow.tsx 组件测试
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const { WageDetailRow } = await import('@/components/features/wages/WageDetailRow')

const mockRecord = {
  id: 1,
  memberName: '张三',
  teamName: '瓦工班',
  yearMonth: '2026-05',
  workDays: 25,
  dailyWage: 300,
  paymentLocked: false,
}

describe('WageDetailRow.tsx', () => {
  const baseProps = {
    record: mockRecord,
    scope: 'project' as const,
    isSelected: false,
    paidAmount: '0',
    paidDate: '',
    onToggleSelect: vi.fn(),
    onPaymentChange: vi.fn(),
  }

  test('应显示工人姓名', () => {
    render(React.createElement(WageDetailRow, baseProps))
    expect(screen.getByText('张三')).toBeTruthy()
  })

  test('应显示班组名称', () => {
    render(React.createElement(WageDetailRow, baseProps))
    expect(screen.getByText('瓦工班')).toBeTruthy()
  })

  test('应显示考勤天数', () => {
    render(React.createElement(WageDetailRow, baseProps))
    expect(screen.getByText('25 天')).toBeTruthy()
  })

  test('应显示日工资', () => {
    render(React.createElement(WageDetailRow, baseProps))
    expect(screen.getByText('¥300/天')).toBeTruthy()
  })

  test('应显示应发工资 = 日工资 × 天数', () => {
    render(React.createElement(WageDetailRow, baseProps))
    // 300 * 25 = 7500.00
    expect(screen.getByText('¥7500.00')).toBeTruthy()
  })

  test('勾选复选框应调用 onToggleSelect', () => {
    const onToggle = vi.fn()
    render(React.createElement(WageDetailRow, { ...baseProps, onToggleSelect: onToggle }))
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith(1)
  })

  test('锁定记录应禁用输入框', () => {
    const lockedRecord = { ...mockRecord, paymentLocked: true }
    render(React.createElement(WageDetailRow, { ...baseProps, record: lockedRecord }))
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(amountInput.disabled).toBe(true)
  })
})
