// @ts-nocheck
/**
 * WageRecordRow.tsx 组件测试
 */
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const { WageRecordRow } = await import('@/components/features/wages/WageRecordRow')

const record = { id: 2, memberName: '李四', yearMonth: '2026-04', workDays: 22, actualWage: 6600, paymentLocked: false }

describe('WageRecordRow.tsx', () => {
  test('应显示姓名', () => {
    render(React.createElement(WageRecordRow, { record, isSelected: false, paidAmount: '6600', paidDate: '', onToggleSelect: vi.fn(), onPaymentChange: vi.fn() }))
    expect(screen.getByText('李四')).toBeTruthy()
  })

  test('应显示年月', () => {
    render(React.createElement(WageRecordRow, { record, isSelected: false, paidAmount: '6600', paidDate: '', onToggleSelect: vi.fn(), onPaymentChange: vi.fn() }))
    expect(screen.getByText('2026-04')).toBeTruthy()
  })

  test('应显示实发工资', () => {
    render(React.createElement(WageRecordRow, { record, isSelected: false, paidAmount: '6600', paidDate: '', onToggleSelect: vi.fn(), onPaymentChange: vi.fn() }))
    expect(screen.getByText('¥6600.00')).toBeTruthy()
  })

  test('勾选应调用 onToggleSelect', () => {
    const fn = vi.fn()
    render(React.createElement(WageRecordRow, { record, isSelected: false, paidAmount: '6600', paidDate: '', onToggleSelect: fn, onPaymentChange: vi.fn() }))
    fireEvent.click(screen.getByRole('checkbox'))
    expect(fn).toHaveBeenCalledWith(2)
  })
})
