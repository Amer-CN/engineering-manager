/**
 * InsightPanel.test.tsx — 智能建议面板测试
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──
const mockGetAPI = vi.hoisted(() => vi.fn())
vi.mock('@/services/api-adapter', () => ({
  getAPI: mockGetAPI,
}))

const mockCan = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: mockCan,
    isAdmin: vi.fn(() => false),
    hasRole: vi.fn(() => false),
  }),
}))

vi.mock('@/types/permissions', () => ({
  hasPermission: vi.fn(() => true),
  hasAllPermissions: vi.fn(() => true),
  hasAnyPermission: vi.fn(() => true),
  isAdmin: vi.fn(() => false),
  hasRole: vi.fn(() => false),
  getCurrentUser: vi.fn(() => null),
}))

import InsightPanel from '../InsightPanel'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('InsightPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCan.mockReturnValue(true)
    mockGetAPI.mockResolvedValue({
      getInvoices: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getDashboardStats: vi.fn().mockResolvedValue({
        success: true,
        data: {
          projectsCount: 5, membersCount: 10, materialsCount: 20,
          totalExpenses: 100000, settlementsCount: 0, invoicesCount: 0,
          inventoryItemsCount: 30, inProgressProjects: 2, recentProjects: [],
        },
      }),
      getWageOverdueStats: vi.fn().mockResolvedValue({
        success: true,
        data: { totalOverdueAmount: 0, overdueWorkerCount: 0, overdueProjectCount: 0, maxOverdueDays: 0 },
      }),
    })
  })

  test('can(invoices:read) 为 false 时 → 不请求发票、相关洞察不渲染', async () => {
    // 只拒绝 invoices:read
    mockCan.mockImplementation((perm: string) => perm !== 'invoices:read')

    renderWithProviders(<InsightPanel onAsk={vi.fn()} />)

    // 等待加载完成
    await waitFor(() => {
      expect(screen.getByText('智能建议')).toBeTruthy()
    })

    // 应显示空态（无待处理事项）
    await waitFor(() => {
      expect(screen.getByText('一切正常，暂无待处理事项')).toBeTruthy()
    })

    // 不应出现发票相关洞察
    expect(screen.queryByText(/发票待处理/)).toBeNull()
  })

  test('有待办结算时 → 渲染对应建议', async () => {
    mockGetAPI.mockResolvedValue({
      getInvoices: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getDashboardStats: vi.fn().mockResolvedValue({
        success: true,
        data: {
          projectsCount: 5, membersCount: 10, materialsCount: 20,
          totalExpenses: 100000, settlementsCount: 3, invoicesCount: 0,
          inventoryItemsCount: 30, inProgressProjects: 2, recentProjects: [],
        },
      }),
      getWageOverdueStats: vi.fn().mockResolvedValue({
        success: true,
        data: { totalOverdueAmount: 0, overdueWorkerCount: 0, overdueProjectCount: 0, maxOverdueDays: 0 },
      }),
    })

    renderWithProviders(<InsightPanel onAsk={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/3 项待办结算/)).toBeTruthy()
    })
  })
})
