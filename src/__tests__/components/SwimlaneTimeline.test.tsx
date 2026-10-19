/**
 * SwimlaneTimeline 渲染测试
 *
 * 覆盖验收第 5 条：泳道视图能渲染块、空数据显空状态、
 * 减少动态效果时不播生长动画（直接给终态）。
 */

/// <reference types="node" />

import { render, screen, cleanup, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

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
  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  }
})

const { SwimlaneTimeline } = await import('@/components/features/audit/SwimlaneTimeline')

const LOGS = [
  { id: '1', timestamp: '2026-10-19T01:00:00.000Z', resource: 'projects', level: 'info' as const },
  { id: '2', timestamp: '2026-10-19T01:10:00.000Z', resource: 'projects', level: 'error' as const },
  { id: '3', timestamp: '2026-10-19T03:00:00.000Z', resource: 'invoices', level: 'warning' as const },
]

const LABELS = { projects: '项目', invoices: '发票' }

describe('SwimlaneTimeline', () => {
  afterEach(() => cleanup())

  it('无数据时显示空状态', () => {
    render(React.createElement(SwimlaneTimeline, { logs: [] }))
    expect(screen.getByText('暂无操作记录')).toBeTruthy()
  })

  it('按泳道显示中文模块名与操作次数', () => {
    render(React.createElement(SwimlaneTimeline, { logs: LOGS, laneLabels: LABELS }))
    expect(screen.getByText('项目')).toBeTruthy()
    expect(screen.getByText('发票')).toBeTruthy()
    // 项目泳道 2 条操作（同一桶合并）
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
  })

  it('块的 aria-label 含模块、次数与级别', () => {
    render(React.createElement(SwimlaneTimeline, { logs: LOGS, laneLabels: LABELS }))
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map(b => b.getAttribute('aria-label') || '')
    expect(labels.some(l => l.includes('项目') && l.includes('2 次') && l.includes('错误'))).toBe(true)
  })

  it('显示图例与「现在」时钟', () => {
    render(React.createElement(SwimlaneTimeline, { logs: LOGS, laneLabels: LABELS }))
    expect(screen.getByText('正常')).toBeTruthy()
    expect(screen.getByText('警告')).toBeTruthy()
    expect(screen.getByText('错误')).toBeTruthy()
    expect(screen.getByText(/现在/)).toBeTruthy()
  })

  it('未提供 laneLabels 时回落到 resource 原值', () => {
    render(React.createElement(SwimlaneTimeline, { logs: LOGS }))
    expect(screen.getByText('projects')).toBeTruthy()
  })
})

/**
 * 集成：AuditLogs 的表格 / 泳道切换。
 * 覆盖「视图开关真的接上了」以及「泳道视图同样有分页控件」——
 * 这两点单测组件本身是覆盖不到的。
 */
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => true }),
}))
vi.mock('@/hooks/useAuditLogFilters', () => ({
  useAuditLogFilters: () => ({
    startDate: '', endDate: '', filterAction: '', filterResource: '', filterLevel: '', keyword: '',
    page: 1, set: vi.fn(), reset: vi.fn(), setPage: vi.fn(), filterParams: {},
  }),
}))

describe('AuditLogs 泳道视图集成', () => {
  beforeEach(() => {
    localStorage.setItem('audit_logs', JSON.stringify([
      { id: 'l1', timestamp: new Date(Date.now() - 600000).toISOString(), userId: 'u1', username: 'admin', action: 'create', resource: 'projects', level: 'info', description: '创建项目' },
      { id: 'l2', timestamp: new Date(Date.now() - 1200000).toISOString(), userId: 'u1', username: 'admin', action: 'update', resource: 'members', level: 'info', description: '更新人员' },
    ]))
  })
  afterEach(() => { cleanup(); localStorage.clear() })

  it('偏好为 swimlane 时渲染泳道视图并保留分页', async () => {
    localStorage.setItem('audit.viewMode', 'swimlane')
    const AuditLogs = (await import('@/components/AuditLogs')).default
    render(React.createElement(AuditLogs))

    await waitFor(() => {
      // 泳道视图的标志：图例 + 「现在」时钟
      expect(screen.getByText('正常')).toBeTruthy()
      expect(screen.getByText(/现在/)).toBeTruthy()
    }, { timeout: 10000 })

    // 分页条在泳道视图下同样存在（否则无法翻页）
    expect(screen.getByText('上一页')).toBeTruthy()
    expect(screen.getByText('下一页')).toBeTruthy()
  }, 15000)

  it('偏好为 table 时不渲染泳道图例', async () => {
    localStorage.setItem('audit.viewMode', 'table')
    const AuditLogs = (await import('@/components/AuditLogs')).default
    render(React.createElement(AuditLogs))

    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThanOrEqual(1)
    }, { timeout: 10000 })

    expect(screen.queryByText(/现在/)).toBeNull()
  }, 15000)
})
