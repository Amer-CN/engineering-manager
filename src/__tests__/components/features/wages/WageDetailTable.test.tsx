// @ts-nocheck
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { WageDetailTable } from '@/components/features/wages/WageDetailTable'

describe('WageDetailTable.tsx', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => cleanup())

  const baseProps = {
    scopeData: [
      { id: 1, memberName: '张三', teamName: 'A班', yearMonth: '2026-01', workDays: 22, dailyWage: 300, paidAmount: 6600, paymentLocked: false },
      { id: 2, memberName: '李四', teamName: 'B班', yearMonth: '2026-01', workDays: 20, dailyWage: 280, paidAmount: 0, paymentLocked: false },
    ],
    selectedIds: new Set<number>(),
    paymentEdits: new Map(),
    onToggleSelect: () => {},
    onToggleAll: () => {},
    onPaymentChange: () => {},
  }

  test('应渲染表头 (scope=project)', () => {
    render(React.createElement(WageDetailTable, { ...baseProps, scope: 'project' }))
    expect(screen.getByText('姓名')).toBeTruthy()
    expect(screen.getByText('班组')).toBeTruthy()
    expect(screen.getByText('应发')).toBeTruthy()
  }, 15000)

  test('scope=all 时应显示项目列', () => {
    render(React.createElement(WageDetailTable, { ...baseProps, scope: 'all' }))
    expect(screen.getByText('项目')).toBeTruthy()
  }, 15000)

  test('应渲染数据行', () => {
    render(React.createElement(WageDetailTable, { ...baseProps, scope: 'project' }))
    expect(screen.getByText('张三')).toBeTruthy()
    expect(screen.getByText('李四')).toBeTruthy()
  }, 15000)

  test('应显示日薪', () => {
    render(React.createElement(WageDetailTable, { ...baseProps, scope: 'project' }))
    // ¥{dailyWage}/天 → 匹配 "300/天"
    expect(screen.queryAllByText(/300\/天/).length).toBeGreaterThan(0)
  }, 15000)

  test('应显示应发金额', () => {
    render(React.createElement(WageDetailTable, { ...baseProps, scope: 'project' }))
    // ¥{actualWage.toFixed(2)} → ¥6600.00
    expect(screen.queryAllByText(/6600\.00/).length).toBeGreaterThan(0)
  }, 15000)
})
