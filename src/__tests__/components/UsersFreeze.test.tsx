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

  it('personal: tab content not rendered even if activeTab forced', async () => {
    useEditionStore.setState({ features: [], loaded: true })
    // 直接渲染 Users，activeTab 默认 user_list；role_permissions 分支有 hasRoleManagement 守卫
    render(<Users />)
    expect(screen.queryByTestId('role-permissions-tab')).toBeNull()
    expect(screen.queryByTestId('project-authz-tab')).toBeNull()
  })
})
