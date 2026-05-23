/**
 * WageManagement.tsx 组件测试
 * @vitest-environment jsdom
 */
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// ─── Mock useToastStore (Zustand) ───────────────────────────────────────────────
vi.mock('@/store/toastStore', () => ({
  useToastStore: vi.fn((selector?) => {
    const store = {
      toasts: [],
      showToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      removeToast: vi.fn(),
    }
    if (typeof selector === 'function') return selector(store)
    return store
  }),
}))

// ─── Mock useConfirm hook ────────────────────────────────────────────────────────
const mockConfirm = vi.fn().mockResolvedValue(true)
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockConfirm,
    ConfirmDialog: null,
  }),
}))

// ─── Mock audit utils ─────────────────────────────────────────────────────────────
vi.mock('@/utils/audit', () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
}))

// ─── Mock child components ────────────────────────────────────────────────────────
vi.mock('@/components/features/wages/WageCycleDetail', () => ({
  default: vi.fn((props) => {
    return React.createElement('div', { 'data-testid': 'wage-cycle-detail' },
      `CycleDetail:project=${props.selectedProject?.name || 'none'},month=${props.selectedMonth}`
    )
  })
}))

vi.mock('@/components/features/wages/WageProjectList', () => ({
  default: vi.fn((props) => {
    // 渲染可点击的项目卡片，使用传入的第一个项目来测试视图切换
    const firstProject = props.projects?.[0]
    return React.createElement('div', { 'data-testid': 'wage-project-list' },
      React.createElement('div', {
        'data-testid': 'project-card',
        onClick: () => {
          if (firstProject && props.onProjectClick) {
            props.onProjectClick(firstProject)
          }
        }
      }, `ProjectList:${props.projects?.length || 0}个项目`)
    )
  })
}))

// ─── Mock window.electronAPI ────────────────────────────────────────────────────
const createMockElectronAPI = () => ({
  getProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkerTeams: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAttendances: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWages: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getProjectWorkers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateDefaultAttendancesV2: vi.fn().mockResolvedValue({ success: true, data: { count: 0 } }),
  deleteAttendance: vi.fn().mockResolvedValue({ success: true }),
  generateProjectWages: vi.fn().mockResolvedValue({ success: true, data: [], newCount: 0, archivedSkipped: 0 }),
  batchDeleteAttendances: vi.fn().mockResolvedValue({ success: true }),
  batchDeleteWages: vi.fn().mockResolvedValue({ success: true }),
  batchArchivePayments: vi.fn().mockResolvedValue({ success: true, data: { archived: 0 } }),
  batchSaveWages: vi.fn().mockResolvedValue({ success: true }),
  parseBankReceipt: vi.fn().mockResolvedValue({ success: false, error: 'not implemented' }),
  batchImportAttendances: vi.fn().mockResolvedValue({ success: true, data: { created: 0, updated: 0 } }),
  getWageStats: vi.fn().mockResolvedValue({ success: true, data: null }),
  getWageOverdueStats: vi.fn().mockResolvedValue({ success: true, data: null }),
})

let mockElectronAPI: ReturnType<typeof createMockElectronAPI>

beforeEach(() => {
  vi.clearAllMocks()
  mockElectronAPI = createMockElectronAPI()
  ;(window as any).electronAPI = mockElectronAPI
})

afterEach(() => {
  cleanup()
  delete (window as any).electronAPI
})

// ─── 动态 import 组件 ────────────────────────────────────────────────────────────
let WageManagement: React.ComponentType<any>

beforeEach(async () => {
  const mod = await import('@/components/WageManagement')
  WageManagement = mod.default
})

// ════════════════════════════════════════════════════════════════════════════
// 测试用例
// ════════════════════════════════════════════════════════════════════════════

describe('WageManagement', () => {
  describe('Dashboard 视图（默认）', () => {
    it('应渲染 dashboard 视图（WageProjectList）', async () => {
      await act(async () => {
        render(<WageManagement />)
      })
      await waitFor(() => {
        expect(screen.getByTestId('wage-project-list')).toBeInTheDocument()
      })
    })

    it('应调用 getProjects 和 getWorkerTeams 加载基础数据', async () => {
      await act(async () => {
        render(<WageManagement />)
      })
      await waitFor(() => {
        expect(mockElectronAPI.getProjects).toHaveBeenCalled()
        expect(mockElectronAPI.getWorkerTeams).toHaveBeenCalled()
      })
    })

    it('应过滤掉 archived 状态的项目', async () => {
      mockElectronAPI.getProjects.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: '活跃项目', status: 'active' },
          { id: 2, name: '已归档', status: 'archived' },
        ]
      })

      await act(async () => {
        render(<WageManagement />)
      })

      await waitFor(() => {
        expect(mockElectronAPI.getProjects).toHaveBeenCalled()
      })
      // WageProjectList 收到的 projects 应该只有 active 的
      // 通过 mock 组件的渲染文本来验证
      await waitFor(() => {
        expect(screen.getByText(/1个项目/)).toBeInTheDocument()
      })
    })
  })

  describe('视图切换', () => {
    it('点击项目卡片应切换到 cycle 视图', async () => {
      mockElectronAPI.getProjects.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: '测试项目', status: 'active' }]
      })

      await act(async () => {
        render(<WageManagement />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('project-card')).toBeInTheDocument()
      })

      // 点击项目卡片
      await act(async () => {
        fireEvent.click(screen.getByTestId('project-card'))
      })

      // 应切换到 cycle 视图，显示 WageCycleDetail
      await waitFor(() => {
        expect(screen.getByTestId('wage-cycle-detail')).toBeInTheDocument()
      })
    })

    it('cycle 视图应传入正确的 project 和 month', async () => {
      mockElectronAPI.getProjects.mockResolvedValue({
        success: true,
        data: [{ id: 42, name: '白玉村项目', status: 'active' }]
      })

      await act(async () => {
        render(<WageManagement />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('project-card')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('project-card'))
      })

      await waitFor(() => {
        const detail = screen.getByTestId('wage-cycle-detail')
        expect(detail).toBeInTheDocument()
        expect(detail.textContent).toContain('白玉村项目')
      })
    })
  })

  describe('IPC 调用', () => {
    it('loadBaseData 应正确调用 getProjects 和 getWorkerTeams', async () => {
      await act(async () => {
        render(<WageManagement />)
      })
      await waitFor(() => {
        expect(mockElectronAPI.getProjects).toHaveBeenCalledTimes(1)
        expect(mockElectronAPI.getWorkerTeams).toHaveBeenCalledTimes(1)
      })
    })

    it('getProjects 失败时应静默处理（不崩溃）', async () => {
      mockElectronAPI.getProjects.mockRejectedValue(new Error('网络错误'))
      expect(() => render(<WageManagement />)).not.toThrow()
      // 等待异步处理完成
      await waitFor(() => {
        expect(mockElectronAPI.getProjects).toHaveBeenCalled()
      })
    })
  })

  describe('Loading 状态处理', () => {
    it('加载数据时不应崩溃', async () => {
      // 模拟慢速响应
      let resolveProjects: (value: any) => void
      mockElectronAPI.getProjects.mockReturnValue(
        new Promise(resolve => { resolveProjects = resolve })
      )

      await act(async () => {
        render(<WageManagement />)
      })

      // 完成加载
      await act(async () => {
        resolveProjects!({ success: true, data: [] })
      })

      await waitFor(() => {
        expect(mockElectronAPI.getProjects).toHaveBeenCalled()
      })
    })
  })
})
