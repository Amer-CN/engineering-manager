import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock usePermission
vi.mock('@/hooks/usePermission.tsx', () => ({
  usePermission: () => ({ can: () => true }),
}))

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/projects/ProjectFilters')

describe('ProjectFilters', () => {
  const baseProps = {
    searchTerm: '',
    status: null,
    manager: null,
    managers: [{ id: 1, name: '张经理' }, { id: 2, name: '李经理' }] as any,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onManagerChange: vi.fn(),
    onAdd: vi.fn(),
    onExport: vi.fn(),
    projectCount: 10,
  }

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染搜索框', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    expect(screen.getByPlaceholderText('搜索项目名称...')).toBeTruthy()
  })

  test('应渲染状态筛选下拉', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    expect(screen.getByText('全部状态')).toBeTruthy()
  })

  test('应渲染负责人下拉', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    expect(screen.getByText('全部负责人')).toBeTruthy()
    expect(screen.getByText('张经理')).toBeTruthy()
    expect(screen.getByText('李经理')).toBeTruthy()
  })

  test('应渲染项目计数', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    expect(screen.getByText('共 10 个项目')).toBeTruthy()
  })

  test('应渲染新增和导出按钮', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    expect(screen.getByText('导出')).toBeTruthy()
    expect(screen.getByText('新增项目')).toBeTruthy()
  })

  test('搜索输入应触发 onSearchChange', async () => {
    const { ProjectFilters } = await importModule()
    render(React.createElement(ProjectFilters, baseProps))
    fireEvent.change(screen.getByPlaceholderText('搜索项目名称...'), { target: { value: '安岳' } })
    expect(baseProps.onSearchChange).toHaveBeenCalledWith('安岳')
  })
})
