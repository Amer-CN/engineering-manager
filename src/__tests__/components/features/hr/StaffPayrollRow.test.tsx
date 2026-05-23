import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

import { StaffPayrollRow } from '@/components/features/hr/StaffPayrollRow'

const mockOnPaidChange = vi.fn()
const mockOnDeleteWage = vi.fn()

const baseWage = {
  id: 1,
  memberName: '李四',
  yearMonth: '2026-01',
  baseSalary: 10000,
  attendanceDays: 22,
  subsidy: 500,
  deduction: 200,
  netSalary: 10300,
  paidAmount: 10100,
  paidDate: '2026-02-05',
}

describe('StaffPayrollRow', () => {
  test('应渲染员工薪酬行', () => {
    render(React.createElement(StaffPayrollRow, {
      wage: baseWage, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    expect(screen.getByText('李四')).toBeTruthy()
    expect(screen.getByText('2026-01')).toBeTruthy()
  })

  test('应显示基础薪资', () => {
    render(React.createElement(StaffPayrollRow, {
      wage: baseWage, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    expect(screen.getByText('10,000')).toBeTruthy()
  })

  test('补贴大于0应显示加号前缀', () => {
    render(React.createElement(StaffPayrollRow, {
      wage: baseWage, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    expect(screen.getByText('+500')).toBeTruthy()
  })

  test('补贴为0应显示短横线', () => {
    render(React.createElement(StaffPayrollRow, {
      wage: { ...baseWage, subsidy: 0 }, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    expect(screen.getByText('-')).toBeTruthy()
  })

  test('点击删除按钮应触发 onDeleteWage', () => {
    render(React.createElement(StaffPayrollRow, {
      wage: baseWage, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    fireEvent.click(screen.getByTitle('删除此记录'))
    expect(mockOnDeleteWage).toHaveBeenCalledWith(baseWage)
  })

  test('已结清时余额显示绿色', () => {
    const settledWage = { ...baseWage, paidAmount: 10100, netSalary: 10300, deduction: 200 }
    // diff = netSalary - deduction - paidAmount = 10300 - 200 - 10100 = 0
    render(React.createElement(StaffPayrollRow, {
      wage: settledWage, staffName: '李四', onPaidChange: mockOnPaidChange, onDeleteWage: mockOnDeleteWage,
    }))
    expect(screen.getByText('已结清')).toBeTruthy()
  })
})
