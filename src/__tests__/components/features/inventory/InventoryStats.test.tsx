import React from 'react'
import { render, screen } from '@testing-library/react'

import { InventoryStats } from '@/components/features/inventory/InventoryStats'

describe('InventoryStats', () => {
  test('应渲染4个统计卡片', () => {
    render(React.createElement(InventoryStats, {
      totalItems: 15,
      lowStock: 3,
      totalValue: 50000,
      totalMaterials: 8,
    }))
    expect(screen.getByText('物料种类')).toBeTruthy()
    expect(screen.getByText('库存预警')).toBeTruthy()
    expect(screen.getByText('库存总值')).toBeTruthy()
    expect(screen.getByText('项目材料')).toBeTruthy()
  })

  test('应正确显示数值', () => {
    render(React.createElement(InventoryStats, {
      totalItems: 15,
      lowStock: 3,
      totalValue: 50000,
      totalMaterials: 8,
    }))
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('8')).toBeTruthy()
  })

  test('零值应正常显示', () => {
    render(React.createElement(InventoryStats, {
      totalItems: 0,
      lowStock: 0,
      totalValue: 0,
      totalMaterials: 0,
    }))
    expect(screen.getByText('库存预警')).toBeTruthy()
  })
})
