// @ts-nocheck
/**
 * Dashboard.tsx 组件测试
 *
 * Phase 5 第二阶段：带 Zustand store 的组件测试
 * 依赖：useAuth (Zustand store)
 */

/// <reference types="node" />

// ═══════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════

// 1. Mock framer-motion —— 禁用动画，直接渲染 children
vi.mock('framer-motion', () => {
  const React = require('react')
  const createMotionComponent = (tag: string) => {
    const Component = React.forwardRef((props: any, ref: any) => {
      const { children, initial, animate, whileHover, whileTap, transition, variants, ...rest } = props
      return React.createElement(tag, { ...rest, ref }, children)
    })
    Component.displayName = `motion.${tag}`
    return Component
  }

  const motion: any = new Proxy({}, {
    get(_: any, prop: string) {
      return createMotionComponent(prop === 'custom' ? 'div' : prop)
    },
  })

  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
    useSpring: () => ({ get: () => 0, set: vi.fn(), on: () => () => {} }),
  }
})

// 2. Mock recharts —— 图表组件直接渲染 children
vi.mock('recharts', () => {
  const React = require('react')
  const Passthrough = (props: any) => React.createElement(React.Fragment, null, props.children)
  return {
    BarChart: Passthrough,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: Passthrough,
    PieChart: Passthrough,
    Pie: () => null,
    Cell: () => null,
  }
})

// 3. Mock useAuth —— 路径必须与 Dashboard.tsx 中的 import 路径完全一致
//    Dashboard.tsx: import { useAuth } from '../hooks/useAuth'
//    ⚠️ vi.mock 的路径是模块标识符，必须与源文件 import 语句的路径字符串完全相同
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      userId: 'admin-001',
      username: 'admin',
      displayName: '管理员',
      roleId: 'role-admin',
      roleName: '管理员',
      permissions: ['*'],
    },
    isAuthenticated: true,
    isLocked: false,
    login: vi.fn(),
    logout: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
  }),
  useAuthStore: {},
}))

// 4. Mock window.electronAPI
const mockGetDashboardStats = vi.fn()
const mockGetInvoices = vi.fn()

Object.defineProperty(window, 'electronAPI', {
  value: {
    getDashboardStats: mockGetDashboardStats,
    getInvoices: mockGetInvoices,
  },
  writable: true,
})

// ═══════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// 动态导入被测组件（路径与 Dashboard.tsx 的 export default 匹配）
const Dashboard = (await import('@/components/Dashboard')).default

// ═══════════════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════════════

const WAIT_TIMEOUT = 10000
const TEST_TIMEOUT = 15000

describe('Dashboard.tsx —— 加载状态', () => {
  test('应显示骨架屏（加载中）', () => {
    // 不 resolve Promise，让组件处于 loading 状态
    mockGetDashboardStats.mockReturnValue(new Promise(() => {}))
    mockGetInvoices.mockReturnValue(new Promise(() => {}))

    render(React.createElement(Dashboard))

    // 骨架屏特征：animate-pulse 元素
    const pulseEls = document.querySelectorAll('.animate-pulse')
    expect(pulseEls.length).toBeGreaterThan(0)
  })
})

describe('Dashboard.tsx —— 数据加载成功', () => {
  beforeEach(() => {
    mockGetDashboardStats.mockResolvedValue({
      success: true,
      data: {
        projectsCount: 8,
        inProgressProjects: 3,
        membersCount: 120,
        totalExpenses: 5800000,
        invoicesCount: 15,
        inventoryItemsCount: 42,
        expenseByCategory: { '材料费': 3200000, '人工费': 1800000, '机械费': 800000 },
      },
    })

    mockGetInvoices.mockResolvedValue({
      success: true,
      data: [
        { id: 'inv-1', invoiceNo: 'FP20240001', status: 'received', amount: 500000, receivedAmount: 500000, buyerName: '发包单位A' },
        { id: 'inv-2', invoiceNo: 'FP20240002', status: 'partially_paid', amount: 300000, receivedAmount: 150000, sellerName: '供应商B' },
      ],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('应显示用户问候语', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      expect(screen.getByText(/早上好|上午好|中午好|下午好|晚上好|夜深了/)).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })
  }, TEST_TIMEOUT)

  test('应显示用户名', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      expect(screen.getByText(/管理员/)).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })
  }, TEST_TIMEOUT)

  test('应显示项目总数', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      // CountUp 组件渲染数字，可能在 span 中，用正则匹配
      expect(screen.getByText(/8/)).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })
  }, TEST_TIMEOUT)

  test('应显示发票记录卡片', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      expect(screen.getByText('发票记录')).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })
  }, TEST_TIMEOUT)

  test('应显示最近发票列表', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      expect(screen.getByText('FP20240001')).toBeTruthy()
      expect(screen.getByText('FP20240002')).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })
  }, TEST_TIMEOUT)
})

describe('Dashboard.tsx —— 数据加载失败', () => {
  beforeEach(() => {
    mockGetDashboardStats.mockResolvedValue({ success: false, error: '网络错误' })
    mockGetInvoices.mockResolvedValue({ success: true, data: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('应显示错误提示和重试按钮', async () => {
    render(React.createElement(Dashboard))
    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeTruthy()
    }, { timeout: WAIT_TIMEOUT })

    const retryBtn = screen.getByText('重试')
    expect(retryBtn).toBeTruthy()
  }, TEST_TIMEOUT)
})
