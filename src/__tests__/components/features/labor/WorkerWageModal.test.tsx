import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const importModule = () => import('@/components/features/labor/WorkerWageModal')

describe('WorkerWageModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getWorkerStats = vi.fn()
  })
  afterEach(cleanup)

  test('show=false 时不渲染', async () => {
    const { WorkerWageModal } = await importModule()
    const { container } = render(React.createElement(WorkerWageModal, {
      show: false, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    expect(container.innerHTML).toBe('')
  })

  test('show=true 应渲染弹窗', async () => {
    ;(window.electronAPI as any).getWorkerStats.mockResolvedValue({ success: false })
    const { WorkerWageModal } = await importModule()
    render(React.createElement(WorkerWageModal, {
      show: true, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeTruthy()
    })
    expect(screen.getByText('工资统计')).toBeTruthy()
  })

  test('应调用 getWorkerStats API', async () => {
    ;(window.electronAPI as any).getWorkerStats.mockResolvedValue({ success: false })
    const { WorkerWageModal } = await importModule()
    render(React.createElement(WorkerWageModal, {
      show: true, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect((window.electronAPI as any).getWorkerStats).toHaveBeenCalledWith(1)
    })
  })

  test('应显示无数据提示', async () => {
    ;(window.electronAPI as any).getWorkerStats.mockResolvedValue({ success: false })
    const { WorkerWageModal } = await importModule()
    render(React.createElement(WorkerWageModal, {
      show: true, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('暂无工资数据')).toBeTruthy()
    })
  })

  test('有数据时应显示统计', async () => {
    ;(window.electronAPI as any).getWorkerStats.mockResolvedValue({
      success: true,
      data: {
        projectCount: 3,
        totalEarnings: 50000,
        projectBreakdown: [
          { projectId: 1, projectName: '项目A', total: 30000 },
          { projectId: 2, projectName: '项目B', total: 20000 },
        ],
      },
    })
    const { WorkerWageModal } = await importModule()
    render(React.createElement(WorkerWageModal, {
      show: true, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('参与项目')).toBeTruthy()
      expect(screen.getByText('3')).toBeTruthy()
    })
    expect(screen.getByText('累计领取')).toBeTruthy()
    expect(screen.getByText('各项目明细')).toBeTruthy()
  })

  test('点击关闭应触发 onClose', async () => {
    ;(window.electronAPI as any).getWorkerStats.mockResolvedValue({ success: false })
    const { WorkerWageModal } = await importModule()
    const { container } = render(React.createElement(WorkerWageModal, {
      show: true, workerId: 1, workerName: '张三', onClose: mockOnClose,
    }))
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeTruthy()
    })
    // 点击 overlay（外层 fixed div）
    fireEvent.click(container.firstElementChild!)
    expect(mockOnClose).toHaveBeenCalled()
  })
})
