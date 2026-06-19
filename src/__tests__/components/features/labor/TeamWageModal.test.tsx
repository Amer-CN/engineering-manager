import { render, screen, cleanup, waitFor } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/labor/TeamWageModal')

describe('TeamWageModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getTeamWages = vi.fn()
  })
  afterEach(cleanup)

  test('show=false 时不渲染', async () => {
    const { TeamWageModal } = await importModule()
    const { container } = render(React.createElement(TeamWageModal, {
      show: false, teamId: 1, teamName: 'A班', projectId: 10, projectName: '安岳项目', onClose: mockOnClose,
    }))
    expect(container.innerHTML).toBe('')
  })

  test('show=true 应渲染弹窗', async () => {
    ;(window.electronAPI as any).getTeamWages.mockResolvedValue({ success: false })
    const { TeamWageModal } = await importModule()
    render(React.createElement(TeamWageModal, {
      show: true, teamId: 1, teamName: 'A班', projectId: 10, projectName: '安岳项目', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('A班')).toBeTruthy()
    })
    expect(screen.getByText('安岳项目 · 工资汇总')).toBeTruthy()
  })

  test('应调用 getTeamWages API', async () => {
    ;(window.electronAPI as any).getTeamWages.mockResolvedValue({ success: false })
    const { TeamWageModal } = await importModule()
    render(React.createElement(TeamWageModal, {
      show: true, teamId: 1, teamName: 'A班', projectId: 10, projectName: '安岳项目', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect((window.electronAPI as any).getTeamWages).toHaveBeenCalledWith(10, 1)
    })
  })

  test('应显示无数据提示', async () => {
    ;(window.electronAPI as any).getTeamWages.mockResolvedValue({ success: false })
    const { TeamWageModal } = await importModule()
    render(React.createElement(TeamWageModal, {
      show: true, teamId: 1, teamName: 'A班', projectId: 10, projectName: '安岳项目', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('暂无工资数据')).toBeTruthy()
    })
  })

  test('有数据时应显示 KPI 和明细表格', async () => {
    ;(window.electronAPI as any).getTeamWages.mockResolvedValue({
      success: true,
      data: {
        workerCount: 5,
        teamTotal: 150000,
        details: [
          { workerName: '张三', months: 6, workDays: 180, dailyWage: 280, totalWage: 50400 },
          { workerName: '李四', months: 6, workDays: 160, dailyWage: 300, totalWage: 48000 },
        ],
      },
    })
    const { TeamWageModal } = await importModule()
    render(React.createElement(TeamWageModal, {
      show: true, teamId: 1, teamName: 'A班', projectId: 10, projectName: '安岳项目', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('班组人数')).toBeTruthy()
      expect(screen.getByText('5')).toBeTruthy()
    })
    expect(screen.getByText('累计工资')).toBeTruthy()
    expect(screen.getByText('人员明细')).toBeTruthy()
    expect(screen.getByText('张三')).toBeTruthy()
    expect(screen.getByText('李四')).toBeTruthy()
  })
})
