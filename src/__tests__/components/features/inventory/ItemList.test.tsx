import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { ItemList } from '@/components/features/inventory/ItemList'

describe('ItemList', () => {
  const baseItems = [
    { id: 1, code: 'M001', name: '水泥', category: '建材', specifications: 'P.O 42.5', unit: '吨', currentStock: 100, minStock: 10, purchasePrice: 400, salePrice: 450 } as any,
    { id: 2, code: 'M002', name: '钢筋', category: '建材', specifications: 'HRB400', unit: '吨', currentStock: 5, minStock: 10, purchasePrice: 4000, salePrice: 4200 } as any,
  ]

  const baseProps = {
    items: baseItems,
    partners: [],
    filterCategory: '',
    categories: ['建材'],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onTrans: vi.fn(),
  }

  test('有数据时应渲染表格', () => {
    render(React.createElement(ItemList, baseProps))
    expect(screen.getByText('M001')).toBeTruthy()
    expect(screen.getByText('水泥')).toBeTruthy()
  })

  test('库存不足应显示警告', () => {
    render(React.createElement(ItemList, baseProps))
    expect(screen.getByText('库存不足')).toBeTruthy()
  })

  test('点击编辑应触发 onEdit', () => {
    render(React.createElement(ItemList, baseProps))
    const editBtns = screen.getAllByText('编辑')
    fireEvent.click(editBtns[0])
    expect(baseProps.onEdit).toHaveBeenCalledWith(baseItems[0])
  })

  test('点击删除应触发 onDelete', () => {
    render(React.createElement(ItemList, baseProps))
    const deleteBtns = screen.getAllByText('删除')
    fireEvent.click(deleteBtns[0])
    expect(baseProps.onDelete).toHaveBeenCalledWith(1)
  })

  test('点击出入库应触发 onTrans', () => {
    render(React.createElement(ItemList, baseProps))
    const transBtns = screen.getAllByText('出入库')
    fireEvent.click(transBtns[0])
    expect(baseProps.onTrans).toHaveBeenCalledWith(baseItems[0])
  })

  test('空列表应显示空状态', () => {
    render(React.createElement(ItemList, { ...baseProps, items: [] }))
    expect(screen.getByText('暂无物料')).toBeTruthy()
  })

  test('按类别筛选应过滤结果', () => {
    const mixedItems = [
      { ...baseItems[0], category: '建材' },
      { ...baseItems[1], category: '五金' },
    ] as any
    render(React.createElement(ItemList, { ...baseProps, items: mixedItems, filterCategory: '建材' }))
    expect(screen.getByText('水泥')).toBeTruthy()
    expect(screen.queryByText('钢筋')).toBeNull()
  })
})
