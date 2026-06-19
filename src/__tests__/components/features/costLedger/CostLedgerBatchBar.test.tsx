import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { CostLedgerBatchBar } from '@/components/features/costLedger/CostLedgerBatchBar'

describe('CostLedgerBatchBar', () => {
  const baseBatches: import('@/types').CostLedgerBatch[] = [
    { id: 0, projectId: 1, name: '初始版', createdAt: '2024-01-01' },
    { id: 1, projectId: 1, name: '第二版', createdAt: '2024-01-02' },
  ]

  const baseProps = {
    batches: baseBatches,
    currentBatchId: 0,
    onChangeBatch: vi.fn(),
    onCreateBatch: vi.fn().mockResolvedValue({ id: 2, name: '新建版' }),
    onCopyBatch: vi.fn().mockResolvedValue({ id: 3, name: '副本' }),
    onRenameBatch: vi.fn().mockResolvedValue(true),
    onDeleteBatch: vi.fn().mockResolvedValue(true),
    onCompare: vi.fn(),
    onImport: vi.fn(),
  }

  test('应渲染版本选择器', () => {
    render(React.createElement(CostLedgerBatchBar, baseProps))
    expect(screen.getByText('版本')).toBeTruthy()
  })

  test('应渲染功能按钮', () => {
    render(React.createElement(CostLedgerBatchBar, baseProps))
    expect(screen.getByText('导入 Excel')).toBeTruthy()
    expect(screen.getByText('对比版本')).toBeTruthy()
    expect(screen.getByText('复制版本')).toBeTruthy()
  })

  test('点击导入应触发 onImport', () => {
    render(React.createElement(CostLedgerBatchBar, baseProps))
    fireEvent.click(screen.getByText('导入 Excel'))
    expect(baseProps.onImport).toHaveBeenCalled()
  })

  test('点击对比应触发 onCompare', () => {
    render(React.createElement(CostLedgerBatchBar, baseProps))
    fireEvent.click(screen.getByText('对比版本'))
    expect(baseProps.onCompare).toHaveBeenCalled()
  })

  test('只有一个版本时对比按钮应禁用', () => {
    render(React.createElement(CostLedgerBatchBar, { ...baseProps, batches: [{ id: 0, name: '初始版', projectId: 0, createdAt: '' }] as any }))
    expect(screen.getByText('对比版本')).toBeDisabled()
  })

  test('点击新建版本应显示输入框', () => {
    render(React.createElement(CostLedgerBatchBar, baseProps))
    fireEvent.click(screen.getByText('+ 新建版本'))
    expect(screen.getByPlaceholderText('版本名称')).toBeTruthy()
  })

  test('初始版不应显示删除按钮', () => {
    render(React.createElement(CostLedgerBatchBar, { ...baseProps, currentBatchId: 0 }))
    // 初始版（id=0）不应有删除按钮
    expect(screen.queryByText('确认删除')).toBeNull()
  })

  test('非初始版应显示删除按钮', () => {
    render(React.createElement(CostLedgerBatchBar, { ...baseProps, currentBatchId: 1 }))
    // 应该有删除SVG按钮（title="删除此版本及数据"）
    const deleteBtn = screen.getByTitle('删除此版本及数据')
    expect(deleteBtn).toBeTruthy()
  })
})
