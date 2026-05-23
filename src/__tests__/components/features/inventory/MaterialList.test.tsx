import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

import { MaterialList } from '@/components/features/inventory/MaterialList'

describe('MaterialList', () => {
  const baseMaterials = [
    { id: 1, name: 'PVC管', projectId: 1, category: '管材', unit: '米', quantity: 500, price: 15 } as any,
    { id: 2, name: '电缆', projectId: 2, category: '电气', unit: '米', quantity: 200, price: 30 } as any,
  ]
  const baseProjects = [
    { id: 1, name: '安岳项目' },
    { id: 2, name: '成都项目' },
  ] as any

  const baseProps = {
    materials: baseMaterials,
    projects: baseProjects,
    filterProject: '' as number | '',
    materialCategories: ['管材', '电气'],
    categoryIcons: { '管材': '🔧', '电气': '⚡' },
    categoryColors: { '管材': 'bg-blue-100 text-blue-800', '电气': 'bg-yellow-100 text-yellow-800' },
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  test('有数据时应渲染材料列表', () => {
    render(React.createElement(MaterialList, baseProps))
    expect(screen.getByText('PVC管')).toBeTruthy()
    expect(screen.getByText('电缆')).toBeTruthy()
  })

  test('应显示项目名称', () => {
    render(React.createElement(MaterialList, baseProps))
    expect(screen.getByText('安岳项目')).toBeTruthy()
    expect(screen.getByText('成都项目')).toBeTruthy()
  })

  test('点击编辑应触发 onEdit', () => {
    render(React.createElement(MaterialList, baseProps))
    const editBtns = screen.getAllByText('编辑')
    fireEvent.click(editBtns[0])
    expect(baseProps.onEdit).toHaveBeenCalledWith(baseMaterials[0])
  })

  test('点击删除应触发 onDelete', () => {
    render(React.createElement(MaterialList, baseProps))
    const deleteBtns = screen.getAllByText('删除')
    fireEvent.click(deleteBtns[0])
    expect(baseProps.onDelete).toHaveBeenCalledWith(1)
  })

  test('空列表应显示空状态', () => {
    render(React.createElement(MaterialList, { ...baseProps, materials: [] }))
    expect(screen.getByText('暂无项目材料')).toBeTruthy()
  })
})
