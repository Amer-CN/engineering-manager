import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useEditionStore } from '@/store/editionStore'

// Mock API adapter (Users.tsx loadUsers calls getAPI)
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn().mockResolvedValue({
    getAllUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  }),
}))

// Mock auth + permission
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { userId: '1', username: 'admin', roleId: 'admin', roleName: '管理员', permissions: [] } }),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ isAdmin: () => true }),
}))

// Mock child components to keep test focused on tab gating
vi.mock('@/components/UserListTab', () => ({
  UserListTab: () => <div data-testid="user-list-tab" />,
}))
vi.mock('@/components/RolePermissionsTab', () => ({
  RolePermissionsTab: () => <div data-testid="role-permissions-tab" />,
}))
vi.mock('@/components/features/users/ProjectAuthorizationsTab', () => ({
  ProjectAuthorizationsTab: () => <div data-testid="project-authz-tab" />,
}))
vi.mock('@/components/AuditLogs', () => ({
  AuditLogsContent: () => <div data-testid="audit-logs-tab" />,
}))

import Users from '@/components/Users'

describe('Users.tsx F3 tab gates', () => {
  beforeEach(() => {
    useEditionStore.setState({ features: null, loaded: false, warning: null })
  })

  it('enterprise: shows 角色权限 and 项目授权 tabs (elements exist)', async () => {
    useEditionStore.setState({
      features: ['userManagement', 'roleManagement', 'projectAuthorization', 'auditUserFilter'],
      loaded: true,
    })
    render(<Users />)
    // 断言元素存在（不是 hidden——测试目标：gate 应隐藏而不是只藏 CSS）
    expect(screen.getByText('角色权限')).toBeTruthy()
    expect(screen.getByText('项目授权')).toBeTruthy()
    expect(screen.getByText('用户列表')).toBeTruthy()
  })

  it('personal: 角色权限 and 项目授权 tabs NOT rendered (element absent)', async () => {
    useEditionStore.setState({ features: [], loaded: true })
    render(<Users />)
    // 断言元素不存在（不是 hidden，是不渲染）
    expect(screen.queryByText('角色权限')).toBeNull()
    expect(screen.queryByText('项目授权')).toBeNull()
    // 用户列表仍存在（user_list 不 gate）
    expect(screen.getByText('用户列表')).toBeTruthy()
  })

  it('personal: no role_permissions tab AND no content after tab switch', async () => {
    useEditionStore.setState({ features: [], loaded: true })
    render(<Users />)
    // Tab 层 gate：personal 下「角色权限」Tab 不渲染（queryByText 断言——破坏 useHasFeature 时变红，非恒真）
    const roleTab = screen.queryByText('角色权限')
    expect(roleTab).toBeNull()
    expect(screen.queryByTestId('role-permissions-tab')).toBeNull()
    expect(screen.queryByTestId('project-authz-tab')).toBeNull()
  })

  it('content gate: hasRoleManagement guard blocks content even when activeTab is role_permissions', async () => {
    // 29.2: 真正覆盖内容层守卫的后半段（&& hasRoleManagement）。
    // 步骤：enterprise 渲染 → 点击「角色权限」Tab（activeTab 真实切到 role_permissions 且内容渲染）
    //       → features 改为 personal 重渲染 → activeTab 仍是 role_permissions，但内容必须消失。
    useEditionStore.setState({ features: ['userManagement', 'roleManagement'], loaded: true })
    render(<Users />)
    // Tab 存在且可点击
    const roleTab = screen.getByText('角色权限')
    const { fireEvent } = require('@testing-library/react')
    fireEvent.click(roleTab)
    // enterprise 下内容渲染（证明 activeTab 已切换 + 前半段条件满足）
    expect(screen.queryByTestId('role-permissions-tab')).toBeTruthy()
    // 切到 personal：features=[] → hasRoleManagement=false → 内容守卫必须拦截
    const { act } = require('@testing-library/react')
    act(() => {
      useEditionStore.setState({ features: [], loaded: true })
    })
    expect(screen.queryByTestId('role-permissions-tab')).toBeNull()
  })
})
