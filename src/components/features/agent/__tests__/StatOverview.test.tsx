/**
 * StatOverview.test.tsx — 统计概览卡测试
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ──
const mockGetDashboardStats = vi.hoisted(() => vi.fn())
const mockGetAPI = vi.hoisted(() => vi.fn())
vi.mock('@/services/api-adapter', () => ({
  getAPI: mockGetAPI,
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: vi.fn(() => true),
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

import StatOverview from '../StatOverview'

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockStats = {
  projectsCount: 12,
  membersCount: 35,
  materialsCount: 100,
  totalExpenses: 1500000,
  settlementsCount: 5,
  invoicesCount: 28,
  inventoryItemsCount: 50,
  inProgressProjects: 3,
  recentProjects: [],
}

describe('StatOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAPI.mockResolvedValue({
      getDashboardStats: mockGetDashboardStats,
    })
  })

  test('mock stats 返回 → 6 张卡渲染正确', async () => {
    mockGetDashboardStats.mockResolvedValue({
      success: true,
      data: mockStats,
    })

    renderWithProviders(<StatOverview />)

    await waitFor(() => {
      expect(screen.getByText('项目')).toBeTruthy()
      expect(screen.getByText('待办结算')).toBeTruthy()
      expect(screen.getByText('发票')).toBeTruthy()
      expect(screen.getByText('成本')).toBeTruthy()
      expect(screen.getByText('库存')).toBeTruthy()
      expect(screen.getByText('人员')).toBeTruthy()
    })

    // 成本应显示 formatCurrency 格式 (1500000 → ¥150.0万)
    expect(screen.getByText('¥150.0万')).toBeTruthy()
  })

  test('失败时显示重试', async () => {
    mockGetDashboardStats.mockResolvedValue({
      success: false,
      error: 'network error',
    })

    renderWithProviders(<StatOverview />)

    await waitFor(() => {
      expect(screen.getByText('数据加载失败')).toBeTruthy()
      expect(screen.getByText('点击重试')).toBeTruthy()
    })
  })
})
