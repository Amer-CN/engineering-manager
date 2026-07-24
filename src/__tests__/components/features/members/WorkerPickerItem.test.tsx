import { screen, cleanup } from '@testing-library/react'
import React from 'react'
import { WorkerPickerItem } from '@/components/features/members/WorkerPickerItem'
import { renderWithProviders, setMaskEnabled } from '@/test-utils/render'

describe('WorkerPickerItem.tsx', () => {
  beforeEach(() => { localStorage.clear(); setMaskEnabled(false) })
  afterEach(() => cleanup())

  const baseProps = {
    w: { name: '王五', gender: '男', idCard: '510***1234', projectCount: 2 },
    isExisting: false,
    isSelected: false,
    onToggle: () => {},
  }

  test('应显示姓名', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, baseProps))
    expect(screen.getByText('王五')).toBeTruthy()
  }, 15000)

  test('应显示性别', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, baseProps))
    expect(screen.getByText('男')).toBeTruthy()
  }, 15000)

  test('应显示身份证脱敏', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, baseProps))
    expect(screen.getByText(/510.*1234/)).toBeTruthy()
  }, 15000)

  test('projectCount>0 时应显示项目数标签', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, baseProps))
    expect(screen.getByText('2 个项目')).toBeTruthy()
  }, 15000)

  test('isExisting=true 时应显示"已加入"标签', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, { ...baseProps, isExisting: true }))
    expect(screen.getByText('已加入')).toBeTruthy()
  }, 15000)

  test('isSelected=true 时应勾选 checkbox', () => {
    renderWithProviders(React.createElement(WorkerPickerItem, { ...baseProps, isSelected: true }))
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  }, 15000)
})
