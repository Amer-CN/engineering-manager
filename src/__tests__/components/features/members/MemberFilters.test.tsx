import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

import { MemberFilters } from '@/components/features/members/MemberFilters'

const baseProps = {
  searchTerm: '',
  filterProject: null,
  filterTeam: null,
  filterStatus: 'all' as const,
  projects: [
    { id: 1, name: '安岳高标准农田' },
    { id: 2, name: '简阳道路工程' },
  ],
  teams: [
    { id: 1, name: '钢筋班' },
    { id: 2, name: '泥工班' },
  ],
  memberType: 'worker' as const,
  onSearchChange: vi.fn(),
  onProjectChange: vi.fn(),
  onTeamChange: vi.fn(),
  onStatusChange: vi.fn(),
}

describe('MemberFilters', () => {
  test('应渲染搜索框', () => {
    render(React.createElement(MemberFilters, baseProps))
    expect(screen.getByPlaceholderText('搜索姓名、电话...')).toBeTruthy()
  })

  test('应渲染项目选项', () => {
    render(React.createElement(MemberFilters, baseProps))
    expect(screen.getByText('全部项目')).toBeTruthy()
    expect(screen.getByText('安岳高标准农田')).toBeTruthy()
    expect(screen.getByText('简阳道路工程')).toBeTruthy()
  })

  test('worker 类型应显示班组和状态筛选', () => {
    render(React.createElement(MemberFilters, baseProps))
    expect(screen.getByText('全部班组')).toBeTruthy()
    expect(screen.getByText('全部状态')).toBeTruthy()
  })

  test('staff 类型不应显示班组和状态筛选', () => {
    render(React.createElement(MemberFilters, { ...baseProps, memberType: 'staff' }))
    expect(screen.queryByText('全部班组')).toBeNull()
    expect(screen.queryByText('全部状态')).toBeNull()
  })

  test('搜索框输入应触发 onSearchChange', () => {
    render(React.createElement(MemberFilters, baseProps))
    fireEvent.change(screen.getByPlaceholderText('搜索姓名、电话...'), { target: { value: '张三' } })
    expect(baseProps.onSearchChange).toHaveBeenCalledWith('张三')
  })

  test('选择项目应触发 onProjectChange', () => {
    render(React.createElement(MemberFilters, baseProps))
    fireEvent.change(screen.getByDisplayValue('全部项目'), { target: { value: '1' } })
    expect(baseProps.onProjectChange).toHaveBeenCalledWith(1)
  })
})
