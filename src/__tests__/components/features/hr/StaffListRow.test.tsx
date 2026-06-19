import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock config first (hoisted)
vi.mock('@/components/features/hr/config', () => ({
  HR_STATUS_LABELS: { active: '在职', left: '离职' },
  HR_STATUS_COLORS: { active: 'bg-green-100 text-green-700', left: 'bg-slate-100 text-slate-500' },
}))

import { StaffListRow } from '@/components/features/hr/StaffListRow'

describe('StaffListRow.tsx', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => cleanup())

  const baseProps = {
    m: { name: '张三', position: '班组长', phone: '13800001111', status: 'active', entryDate: '2025-03-01', leaveDate: null },
    deptName: '施工一组',
    onEdit: () => {},
    onStatusChange: () => {},
    onSalaryHistory: () => {},
  }

  test('应显示姓名', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('张三')).toBeTruthy()
  }, 15000)

  test('应显示部门名称', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('施工一组')).toBeTruthy()
  }, 15000)

  test('应显示职位', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('班组长')).toBeTruthy()
  }, 15000)

  test('应显示手机号', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('13800001111')).toBeTruthy()
  }, 15000)

  test('应显示入职日期', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('2025-03-01')).toBeTruthy()
  }, 15000)

  test('应显示状态标签（在职）', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('在职')).toBeTruthy()
  }, 15000)

  test('应显示编辑按钮', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.getByText('编辑')).toBeTruthy()
  }, 15000)

  test('应显示薪资按钮', () => {
    render(React.createElement(StaffListRow, baseProps))
    expect(screen.queryAllByText(/薪资/).length).toBeGreaterThan(0)
  }, 15000)
})
