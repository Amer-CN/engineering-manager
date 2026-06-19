import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import { SettlementItemsTable } from '@/components/features/settlement/SettlementItemsTable'

describe('SettlementItemsTable', () => {
  const baseProps = {
    items: [
      { description: '水泥', spec: 'P.O 42.5', quantity: 100, unit: '吨', unitPrice: 500, amount: 50000, remarks: '' },
      { description: '钢筋', spec: 'HRB400', quantity: 50, unit: '吨', unitPrice: 4000, amount: 200000, remarks: '' },
    ],
    isMaterial: true,
    taxInclusive: true,
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onSetTaxInclusive: vi.fn(),
    onDownloadTemplate: vi.fn(),
    onUploadTemplate: vi.fn(),
    onImportExcel: vi.fn(),
    onTemplateFileChange: vi.fn(),
    templateInputRef: { current: null } as any,
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染结算明细标签', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    expect(screen.getByText('结算明细')).toBeTruthy()
  })

  test('有数据时应渲染表格', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    // description 输入框里的 value
    const inputs = screen.getAllByDisplayValue('水泥')
    expect(inputs.length).toBeGreaterThan(0)
  })

  test('材料模式应显示模板操作按钮', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    expect(screen.getByText('下载模板')).toBeTruthy()
    expect(screen.getByText('上传模板')).toBeTruthy()
    expect(screen.getByText('导入其他表')).toBeTruthy()
  })

  test('非材料模式不应显示模板操作按钮', () => {
    render(React.createElement(SettlementItemsTable, { ...baseProps, isMaterial: false }))
    expect(screen.queryByText('下载模板')).toBeNull()
    expect(screen.queryByText('上传模板')).toBeNull()
  })

  test('应显示合计金额', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    expect(screen.getByText('合计金额:')).toBeTruthy()
  })

  test('点击添加明细按钮应触发 onAdd', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    fireEvent.click(screen.getByText('+ 添加明细'))
    expect(baseProps.onAdd).toHaveBeenCalled()
  })

  test('点击删除按钮应触发 onRemove', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    const removeButtons = screen.getAllByText('✕')
    fireEvent.click(removeButtons[0])
    expect(baseProps.onRemove).toHaveBeenCalledWith(0)
  })

  test('无数据时应显示提示', () => {
    render(React.createElement(SettlementItemsTable, { ...baseProps, items: [] }))
    expect(screen.getByText('点击上方按钮添加结算明细')).toBeTruthy()
  })

  test('材料模式应显示含税/不含税切换', () => {
    render(React.createElement(SettlementItemsTable, baseProps))
    // 含税单价同时出现在切换按钮和表头中
    const taxInclusiveButtons = screen.getAllByText('含税单价')
    expect(taxInclusiveButtons.length).toBeGreaterThanOrEqual(1)
  })
})
