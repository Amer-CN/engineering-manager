import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// Mock usePermission
vi.mock('@/hooks/usePermission.tsx', () => ({
  usePermission: () => ({ can: () => true }),
}))

const importModule = () => import('@/components/features/projects/ProjectCard')

describe('ProjectCard', () => {
  const mockOnClick = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const baseProject = {
    id: 1,
    name: '安岳高标准农田项目',
    status: 'in_progress',
    budget: 5000000,
    totalExpenses: 1000000,
    healthScore: 85,
    startDate: '2025-01-01',
    endDate: '2026-12-31',
  } as any

  const baseMembers = [
    { id: 1, name: '张经理', role: 'manager' },
    { id: 2, name: '李工', role: 'staff' },
  ] as any

  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  test('应渲染项目名称', async () => {
    const { ProjectCard } = await importModule()
    render(React.createElement(ProjectCard, {
      project: baseProject, members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('安岳高标准农田项目')).toBeTruthy()
  })

  test('进行中项目应显示进行中标签', async () => {
    const { ProjectCard } = await importModule()
    render(React.createElement(ProjectCard, {
      project: baseProject, members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('进行中')).toBeTruthy()
  })

  test('已完成项目应显示已完成标签', async () => {
    const { ProjectCard } = await importModule()
    render(React.createElement(ProjectCard, {
      project: { ...baseProject, status: 'completed' },
      members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('已完成')).toBeTruthy()
  })

  test('筹备中项目应显示筹备中标签', async () => {
    const { ProjectCard } = await importModule()
    render(React.createElement(ProjectCard, {
      project: { ...baseProject, status: 'planning' },
      members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    expect(screen.getByText('筹备中')).toBeTruthy()
  })

  test('应渲染健康环 SVG', async () => {
    const { ProjectCard } = await importModule()
    const { container } = render(React.createElement(ProjectCard, {
      project: baseProject, members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  test('点击卡片应触发 onClick', async () => {
    const { ProjectCard } = await importModule()
    render(React.createElement(ProjectCard, {
      project: baseProject, members: baseMembers, index: 0,
      onClick: mockOnClick, onEdit: mockOnEdit, onDelete: mockOnDelete,
    }))
    fireEvent.click(screen.getByText('安岳高标准农田项目'))
    expect(mockOnClick).toHaveBeenCalledWith(baseProject)
  })
})
