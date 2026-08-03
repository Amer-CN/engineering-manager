/**
 * AuditLogs.tsx 单元测试
 * Phase 5 质量收敛阶段，补 Hook 集成测试覆盖
 *
 * 策略：localStorage 预置数据 + 调用真实 queryAuditLogs，不过 mock。
 * 注意：vi.mock() 路径必须与被测代码的 import 路径完全一致，alias @/ 开头。
 */

/// <reference types="node" />

import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'

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
  const motion: any = new Proxy({}, { get(_: any, p: string) { return createMotionComponent(p === 'custom' ? 'div' : p) } })
  return { motion, AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children) }
})

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: (perm: string) => true }),
}))

const fixedF = { startDate: '', endDate: '', filterAction: '', filterResource: '', filterLevel: '', keyword: '', page: 1, set: vi.fn(), reset: vi.fn(), setPage: vi.fn(), filterParams: {} }
vi.mock('@/hooks/useAuditLogFilters', () => ({
  useAuditLogFilters: () => fixedF,
}))

const AuditLogs = (await import('@/components/AuditLogs')).default

describe('AuditLogs.tsx', () => {
  beforeEach(() => {
    localStorage.setItem('audit_logs', JSON.stringify([
      { id: 'log_001', timestamp: '2026-05-21T14:00:00.000Z', userId: 'admin-001', username: 'admin', action: 'create', resource: 'projects', resourceName: '测试项目', level: 'info', description: '创建项目' },
      { id: 'log_002', timestamp: '2026-05-21T13:30:00.000Z', userId: 'admin-001', username: 'admin', action: 'update', resource: 'members', resourceName: '会员', level: 'info', description: '更新成员' },
    ]))
  })
  afterEach(() => { cleanup(); localStorage.clear() })

  test('应显示用户名 admin', async () => {
    render(React.createElement(AuditLogs))
    await waitFor(() => {
      const el = screen.queryAllByText('admin')
      expect(el.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 10000 })
  }, 15000)

  test('应显示操作标签和分页', async () => {
    render(React.createElement(AuditLogs))
    await waitFor(() => {
      expect(screen.getByText('创建')).toBeTruthy()
      expect(screen.getByText('更新')).toBeTruthy()
    }, { timeout: 10000 })
  }, 15000)
})
