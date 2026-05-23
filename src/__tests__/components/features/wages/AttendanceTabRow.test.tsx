import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock attendance constants
vi.mock('@/constants/attendance', () => ({
  summaryDot: { work: 'bg-emerald-500', holiday: 'bg-slate-400', sick_leave: 'bg-amber-500', personal_leave: 'bg-orange-500' },
  summaryLabel: { work: '出勤', holiday: '休息', sick_leave: '病假', personal_leave: '事假' },
}))

import { AttendanceTabRow } from '@/components/features/wages/AttendanceTabRow'

const mockOnToggleSelect = vi.fn()
const mockOnOpenDetail = vi.fn()
const mockOnOpenHistory = vi.fn()
const mockOnDelete = vi.fn()

const baseRecord = {
  id: 1,
  memberName: '赵六',
  teamName: '钢筋班',
  projectWorkerId: 10,
  workDays: 20,
  dailyStatus: { 1: 'work', 2: 'work', 3: 'holiday', 4: 'sick_leave' },
}

describe('AttendanceTabRow', () => {
  test('应渲染工人姓名', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('赵六')).toBeTruthy()
  })

  test('应渲染班组名称', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('钢筋班')).toBeTruthy()
  })

  test('点击编辑应触发 onOpenDetail', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('编辑'))
    expect(mockOnOpenDetail).toHaveBeenCalledWith(baseRecord)
  })

  test('点击删除应触发 onDelete', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('删除'))
    expect(mockOnDelete).toHaveBeenCalledWith(baseRecord)
  })

  test('点击历史应触发 onOpenHistory', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('历史'))
    expect(mockOnOpenHistory).toHaveBeenCalledWith(10, '赵六', '钢筋班')
  })

  test('勾选框应触发 onToggleSelect', () => {
    render(React.createElement(AttendanceTabRow, {
      a: baseRecord, isSelected: false, daysInMonth: 30,
      onToggleSelect: mockOnToggleSelect, onOpenDetail: mockOnOpenDetail,
      onOpenHistory: mockOnOpenHistory, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByRole('checkbox'))
    expect(mockOnToggleSelect).toHaveBeenCalledWith(1)
  })
})
