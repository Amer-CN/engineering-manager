import React from 'react'
import { render, screen } from '@testing-library/react'

import { TransList } from '@/components/features/inventory/TransList'

describe('TransList', () => {
  const baseTransactions = [
    { id: 1, type: 'purchase', itemId: 1, projectId: 1, counterpartyId: 1, quantity: 50, totalAmount: 20000, transactionDate: '2026-01-15', documentNo: 'PO-001' } as any,
    { id: 2, type: 'sale', itemId: 2, projectId: 1, counterpartyId: 2, quantity: 10, totalAmount: 4500, transactionDate: '2026-02-15', documentNo: 'SO-001' } as any,
  ]
  const baseItems = [
    { id: 1, name: '水泥' } as any,
    { id: 2, name: '钢筋' } as any,
  ]
  const baseProjects = [{ id: 1, name: '安岳项目' }] as any
  const basePartners = [{ id: 1, name: 'A公司' }, { id: 2, name: 'B公司' }] as any

  const baseProps = {
    transactions: baseTransactions,
    items: baseItems,
    projects: baseProjects,
    partners: basePartners,
    filterProject: '' as number | '',
    onDelete: vi.fn(),
  }

  test('有数据时应渲染交易记录', () => {
    render(React.createElement(TransList, baseProps))
    expect(screen.getByText('水泥')).toBeTruthy()
    expect(screen.getByText('采购入库')).toBeTruthy()
    expect(screen.getByText('钢筋')).toBeTruthy()
    expect(screen.getByText('销售出库')).toBeTruthy()
  })

  test('应显示单号和项目名', () => {
    render(React.createElement(TransList, baseProps))
    // 单号和项目名在同一行文本中
    expect(screen.getAllByText(/安岳项目/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/PO-001/).length).toBeGreaterThanOrEqual(1)
  })

  test('空列表应显示空状态', () => {
    render(React.createElement(TransList, { ...baseProps, transactions: [] }))
    expect(screen.getByText('暂无出入库记录')).toBeTruthy()
  })

  test('按项目筛选应过滤结果', () => {
    const multiTrans = [
      { ...baseTransactions[0], projectId: 1 },
      { ...baseTransactions[1], projectId: 2 },
    ]
    render(React.createElement(TransList, { ...baseProps, transactions: multiTrans, filterProject: 1 }))
    expect(screen.getByText('水泥')).toBeTruthy()
  })
})
