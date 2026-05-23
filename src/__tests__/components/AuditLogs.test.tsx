/**
 * AuditLogs.tsx �������
 * Phase 5 �����׶Σ��� Hook �������������
 *
 * ���ԣ�localStorage Ԥ������ + ��ʵ queryAuditLogs���� mock��
 * ע�⣺vi.mock() ·�������뱻������� import ·����ȫһ�£�alias @/��
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
      { id: 'log_001', timestamp: '2026-05-21T14:00:00.000Z', userId: 'admin-001', username: 'admin', action: 'create', resource: 'projects', resourceName: '������Ŀ', level: 'info', description: '������Ŀ' },
      { id: 'log_002', timestamp: '2026-05-21T13:30:00.000Z', userId: 'admin-001', username: 'admin', action: 'update', resource: 'members', resourceName: '����', level: 'info', description: '����Ա��' },
    ]))
  })
  afterEach(() => { cleanup(); localStorage.clear() })

  test('Ӧ��ʾ�û��� admin', async () => {
    render(React.createElement(AuditLogs))
    await waitFor(() => {
      const el = screen.queryAllByText('admin')
      expect(el.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 10000 })
  }, 15000)

  test('Ӧ��ʾ������ǩ�����͸���', async () => {
    render(React.createElement(AuditLogs))
    await waitFor(() => {
      expect(screen.getByText('����')).toBeTruthy()
      expect(screen.getByText('����')).toBeTruthy()
    }, { timeout: 10000 })
  }, 15000)
})
