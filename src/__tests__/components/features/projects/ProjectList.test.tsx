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

  test('有项目应显示概览横幅', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getByText('项目投资组合概览')).toBeTruthy()
  })

  test('概览应显示项目总数', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getByText('2')).toBeTruthy()
  })

  test('概览应显示进行中数量', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getByText('1')).toBeTruthy()
  })

  test('应渲染项目卡片', async () => {
    const { ProjectList } = await importModule()
    render(React.createElement(ProjectList, baseProps))
    expect(screen.getByTestId('project-card-1')).toBeTruthy()
    expect(screen.getByTestId('project-card-2')).toBeTruthy()
  })
})
