/**
 * CapabilityGrid.test.tsx — 能力模块卡测试
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'

// ── Mocks ──
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

import CapabilityGrid from '../CapabilityGrid'

describe('CapabilityGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('无权限项不渲染', () => {
    // 只允许 projects:read
    mockCan.mockImplementation((perm: string) => perm === 'projects:read')

    render(React.createElement(CapabilityGrid))

    expect(screen.getByText('项目管理')).toBeTruthy()
    // 其他模块不应该出现
    expect(screen.queryByText('合同管理')).toBeNull()
    expect(screen.queryByText('发票管理')).toBeNull()
    expect(screen.queryByText('仓库管理')).toBeNull()
  })

  test('全部权限时渲染所有模块', () => {
    mockCan.mockReturnValue(true)

    render(React.createElement(CapabilityGrid))

    expect(screen.getByText('项目管理')).toBeTruthy()
    expect(screen.getByText('合同管理')).toBeTruthy()
    expect(screen.getByText('发票管理')).toBeTruthy()
    expect(screen.getByText('仓库管理')).toBeTruthy()
    expect(screen.getByText('人事管理')).toBeTruthy()
  })
})
