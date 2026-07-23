import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock ProjectCard
vi.mock('@/components/features/projects/ProjectCard', () => ({
  ProjectCard: ({ project, members, index, onClick, onEdit, onDelete }: any) => (
    <div data-testid={`project-card-${project.id}`}>{project.name}</div>
  ),
}))

// Mock EmptyState
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: any) => (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}))

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/projects/ProjectList')

describe('ProjectList', () => {
  const baseProps = {
    projects: [
      { id: 1, name: '安岳项目', status: 'in_progress', budget: 5000000 } as any,
      { id: 2, name: '成都项目', status: 'completed', budget: 3000000 } as any,
    ],
    members: [],
    loading: false,
    onProjectClick: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAdd: vi.fn(),
  }

  afterEach(cleanup)

  test('loading 状态应显示骨架屏', async () => {
    const { ProjectList } = await importModule()
    const { container } = render(React.createElement(ProjectList, { ...baseProps, loading: true }))
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  test('空列表应显示空状态', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, { ...baseProps, projects: [] }))
    expect(screen.getByText('暂无项目')).toBeTruthy()
  })

  // 注：概览横幅（"项目投资组合概览" + 总数/进行中计数）已从 ProjectList 提取到
  // Projects.tsx 页面头部（subtitle "投资组合概览 · 共 N 个项目"）。
  // ProjectList 现在仅渲染项目卡片网格，以下测试断言其当前真实行为。

  test('有项目时应渲染卡片网格而非空状态', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.queryByText('暂无项目')).toBeNull()
    expect(screen.getAllByTestId(/^project-card-/)).toHaveLength(2)
  })

  test('渲染的卡片数量应等于项目总数', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getAllByTestId(/^project-card-/)).toHaveLength(baseProps.projects.length)
  })

  test('进行中项目应被渲染', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    // 安岳项目 status 为 in_progress
    expect(screen.getByTestId('project-card-1')).toBeTruthy()
    expect(screen.getByText('安岳项目')).toBeTruthy()
  })

  test('应渲染项目卡片', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getByTestId('project-card-1')).toBeTruthy()
    expect(screen.getByTestId('project-card-2')).toBeTruthy()
  })
})
