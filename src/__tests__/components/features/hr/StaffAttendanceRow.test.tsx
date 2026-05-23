import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock attendance constants
vi.mock('@/constants/attendance', () => ({
  STATUS_META: [
    { key: 'work', label: '出勤', color: 'bg-emerald-500' },
    { key: 'holiday', label: '休息', color: 'bg-slate-400' },
    { key: 'sick_leave', label: '病假', color: 'bg-amber-500' },
    { key: 'personal_leave', label: '事假', color: 'bg-orange-500' },
  ],
  summaryDot: { work: 'bg-emerald-500', holiday: 'bg-slate-400', sick_leave: 'bg-amber-500', personal_leave: 'bg-orange-500' },
  summaryLabel: { work: '出勤', holiday: '休息', sick_leave: '病假', personal_leave: '事假' },
  computeAttendanceSummary: (dailyStatus: Record<string, string>, daysInMonth: number, entryDay: number) => {
    if (!dailyStatus) return { counts: {}, daysOff: daysInMonth, presentRate: 0 }
    const counts: any = { work: 0, holiday: 0, sick_leave: 0, personal_leave: 0 }
    for (const d of Object.values(dailyStatus)) {
      if (counts[d] !== undefined) counts[d]++
    }
    return { counts, daysOff: counts.holiday + counts.sick_leave + counts.personal_leave, presentRate: 0.8 }
  },
}))

import { StaffAttendanceRow } from '@/components/features/hr/StaffAttendanceRow'

const mockOnToggleSelect = vi.fn()
const mockOnTimeline = vi.fn()
const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()

const baseStaff = { id: 1, name: '王五' }

const baseAtt = {
  id: 10,
  dailyStatus: { 1: 'work', 2: 'work', 3: 'holiday', 4: 'sick_leave' },
}

describe('StaffAttendanceRow', () => {
  test('应渲染员工姓名', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('王五')).toBeTruthy()
  })

  test('点击姓名应触发 onTimeline', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('王五'))
    expect(mockOnTimeline).toHaveBeenCalledWith(baseStaff)
  })

  test('无考勤记录时操作列应显示"创建"按钮', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: null, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('创建')).toBeTruthy()
  })

  test('有考勤记录时操作列应显示"编辑"和"删除"', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('编辑')).toBeTruthy()
    expect(screen.getByText('删除')).toBeTruthy()
  })

  test('点击编辑应触发 onEdit', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('编辑'))
    expect(mockOnEdit).toHaveBeenCalledWith(1, '2026-01')
  })

  test('有历史月份时应显示年份和月数', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: false, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: ['2025-11', '2025-12', '2026-01'], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('2年 · 3个月')).toBeTruthy()
  })

  test('勾选框状态应与 isSelected 一致', () => {
    render(React.createElement(StaffAttendanceRow, {
      s: baseStaff, att: baseAtt, isSelected: true, daysInMonth: 30,
      yearMonth: '2026-01', historyMonths: [], deptName: '工程部', entryDay: 1,
      onToggleSelect: mockOnToggleSelect, onTimeline: mockOnTimeline,
      onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })
})
