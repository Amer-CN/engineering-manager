/**
 * 无权限路由拒绝测试
 *
 * 验证审核第五轮反馈第 5 项：
 * - RequirePermission 组件：有权限时渲染子组件
 * - RequirePermission 组件：无权限时渲染 fallback
 * - RequireAdmin 组件：admin 用户渲染子组件
 * - RequireAdmin 组件：非 admin 用户渲染 fallback
 * - 路由级：knowledge:read 权限缺失时 SpeechKnowledgePage 不可见
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ═══════════════════════════════════════════════════════════════
// Import permission utilities
// ═══════════════════════════════════════════════════════════════

import {
  RequirePermission,
  RequireAdmin,
  RequireAnyPermission,
} from '@/hooks/permissionHelpers'
import {
  setCurrentUser,
  getCurrentUser,
} from '@/types/permissions'
import type { AuthContext } from '@/types/permissions'

// ═══════════════════════════════════════════════════════════════
// Test fixtures
// ═══════════════════════════════════════════════════════════════

function makeUser(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 1,
    username: 'admin',
    displayName: '管理员',
    roleId: 'admin',
    roleName: '管理员',
    permissions: [
      'dashboard:read', 'projects:read', 'projects:create', 'projects:update', 'projects:delete',
      'contracts:read', 'contracts:create', 'contracts:update', 'contracts:delete',
      'partners:read', 'partners:create', 'partners:update', 'partners:delete',
      'members:read', 'members:create', 'members:update', 'members:delete',
      'wages:read', 'wages:create', 'wages:update', 'wages:delete',
      'settlement:read', 'settlement:create', 'settlement:update', 'settlement:delete',
      'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete',
      'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete',
      'expenses:read', 'expenses:create', 'expenses:update', 'expenses:delete',
      'costLedger:read', 'costLedger:create', 'costLedger:update', 'costLedger:delete',
      'drawings:read', 'drawings:create', 'drawings:update', 'drawings:delete',
      'knowledge:read', 'knowledge:create', 'knowledge:update', 'knowledge:delete',
      'settings:read', 'settings:create', 'settings:update', 'settings:delete',
      'users:read', 'users:create', 'users:update', 'users:delete',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete',
      'audit_logs:read',
    ] as AuthContext['permissions'],
    ...overrides,
  }
}

function makeWorkerUser(): AuthContext {
  return makeUser({
    userId: 2,
    username: 'worker1',
    displayName: '工人',
    roleId: 'worker',
    roleName: '工人',
    permissions: [
      'dashboard:read',
      'projects:read',
    ] as AuthContext['permissions'],
  })
}

// ═══════════════════════════════════════════════════════════════
// Tests: RequirePermission
// ═══════════════════════════════════════════════════════════════

describe('RequirePermission — 权限守卫', () => {
  beforeEach(() => { setCurrentUser(null) })
  afterEach(() => { setCurrentUser(null) })

  it('有权限 → 渲染子组件', () => {
    setCurrentUser(makeUser())
    render(
      <RequirePermission permission="knowledge:read">
        <div data-testid="protected-content">知识库内容</div>
      </RequirePermission>
    )
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('无权限 → 不渲染子组件', () => {
    setCurrentUser(makeWorkerUser())
    render(
      <RequirePermission permission="knowledge:read">
        <div data-testid="protected-content">知识库内容</div>
      </RequirePermission>
    )
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('无权限 → 渲染自定义 fallback', () => {
    setCurrentUser(makeWorkerUser())
    render(
      <RequirePermission
        permission="knowledge:read"
        fallback={<div data-testid="no-access">无权限访问</div>}
      >
        <div data-testid="protected-content">知识库内容</div>
      </RequirePermission>
    )
    expect(screen.getByTestId('no-access')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('未登录 → 不渲染子组件', () => {
    setCurrentUser(null)
    render(
      <RequirePermission permission="knowledge:read">
        <div data-testid="protected-content">知识库内容</div>
      </RequirePermission>
    )
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('无权限 → 默认 fallback 为 null（不渲染任何内容）', () => {
    setCurrentUser(makeWorkerUser())
    const { container } = render(
      <RequirePermission permission="knowledge:delete">
        <div>不应出现</div>
      </RequirePermission>
    )
    // 默认 fallback=null，容器内不应有子内容
    expect(container.innerHTML).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: RequireAdmin
// ═══════════════════════════════════════════════════════════════

describe('RequireAdmin — 管理员守卫', () => {
  beforeEach(() => { setCurrentUser(null) })
  afterEach(() => { setCurrentUser(null) })

  it('admin 用户 → 渲染子组件', () => {
    setCurrentUser(makeUser())
    render(
      <RequireAdmin>
        <div data-testid="admin-content">管理面板</div>
      </RequireAdmin>
    )
    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
  })

  it('非 admin 用户 → 不渲染子组件', () => {
    setCurrentUser(makeWorkerUser())
    render(
      <RequireAdmin>
        <div data-testid="admin-content">管理面板</div>
      </RequireAdmin>
    )
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
  })

  it('未登录 → 不渲染子组件', () => {
    setCurrentUser(null)
    render(
      <RequireAdmin>
        <div data-testid="admin-content">管理面板</div>
      </RequireAdmin>
    )
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
  })

  it('非 admin 用户 → 渲染自定义 fallback', () => {
    setCurrentUser(makeWorkerUser())
    render(
      <RequireAdmin fallback={<div data-testid="not-admin">仅管理员可访问</div>}>
        <div>管理面板</div>
      </RequireAdmin>
    )
    expect(screen.getByTestId('not-admin')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: RequireAnyPermission
// ═══════════════════════════════════════════════════════════════

describe('RequireAnyPermission — 多权限守卫（任一即可）', () => {
  beforeEach(() => { setCurrentUser(null) })
  afterEach(() => { setCurrentUser(null) })

  it('拥有其中一个权限 → 渲染子组件', () => {
    setCurrentUser(makeWorkerUser()) // 只有 dashboard:read 和 projects:read
    render(
      <RequireAnyPermission permissions={['knowledge:read', 'projects:read']}>
        <div data-testid="content">内容</div>
      </RequireAnyPermission>
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('没有任何一个权限 → 不渲染子组件', () => {
    setCurrentUser(makeWorkerUser()) // 没有 knowledge:* 和 settings:*
    render(
      <RequireAnyPermission permissions={['knowledge:read', 'settings:read']}>
        <div data-testid="content">内容</div>
      </RequireAnyPermission>
    )
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests: 模拟路由级守卫
// ═══════════════════════════════════════════════════════════════

describe('路由级权限守卫 — knowledge:read', () => {
  beforeEach(() => { setCurrentUser(null) })
  afterEach(() => { setCurrentUser(null) })

  it('worker 用户无法访问 knowledge 路由', () => {
    // 模拟 App.tsx 中的路由守卫逻辑：
    // case 'knowledge': return <RequirePermission permission="knowledge:read"><SpeechKnowledgePage /></RequirePermission>
    setCurrentUser(makeWorkerUser())

    const MockKnowledgePage = () => React.createElement('div', { 'data-testid': 'knowledge-page' }, '语音知识库')

    render(
      <RequirePermission permission="knowledge:read">
        <MockKnowledgePage />
      </RequirePermission>
    )

    // worker 没有 knowledge:read 权限，不应渲染页面
    expect(screen.queryByTestId('knowledge-page')).not.toBeInTheDocument()
  })

  it('admin 用户可以访问 knowledge 路由', () => {
    setCurrentUser(makeUser())

    const MockKnowledgePage = () => React.createElement('div', { 'data-testid': 'knowledge-page' }, '语音知识库')

    render(
      <RequirePermission permission="knowledge:read">
        <MockKnowledgePage />
      </RequirePermission>
    )

    expect(screen.getByTestId('knowledge-page')).toBeInTheDocument()
  })

  it('manager 用户（有 knowledge:read）可以访问 knowledge 路由', () => {
    setCurrentUser(makeUser({
      roleId: 'manager',
      roleName: '经理',
      username: 'manager1',
      displayName: '经理',
    }))

    const MockKnowledgePage = () => React.createElement('div', { 'data-testid': 'knowledge-page' }, '语音知识库')

    render(
      <RequirePermission permission="knowledge:read">
        <MockKnowledgePage />
      </RequirePermission>
    )

    expect(screen.getByTestId('knowledge-page')).toBeInTheDocument()
  })
})
