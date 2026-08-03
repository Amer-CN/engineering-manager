import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useEditionStore, useHasFeature } from '@/store/editionStore'

// Mock API adapter (Users.tsx loadUsers calls getAPI)
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn().mockResolvedValue({
    getAllUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { userId: '1', username: 'admin', roleId: 'admin', roleName: '管理员', permissions: [] } }),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ isAdmin: () => true }),
}))

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
import Sidebar from '@/components/Sidebar'

// 直接渲染一个消费 useHasFeature 的探针组件（避免 renderHook 的 zustand 兼容问题）
function FeatureProbe({ onValue }: { onValue: (v: boolean) => void }) {
  const v = useHasFeature('userManagement')
  onValue(v)
  return <div data-testid="probe">{String(v)}</div>
}

describe('F4: first-paint timing (features=null must not flash enterprise entries)', () => {
  beforeEach(() => {
    // 初始状态 = 首屏未加载（features=null, loaded=false）
    useEditionStore.setState({ features: null, loaded: false, warning: null })
  })

  it('useHasFeature returns false when features=null (未加载不闪现)', () => {
    let seen: boolean | null = null
    render(<FeatureProbe onValue={(v) => { seen = v }} />)
    expect(seen).toBe(false)
    expect(useEditionStore.getState().loaded).toBe(false)
  })

  it('Users page: enterprise tab NOT rendered while features=null', () => {
    render(<Users />)
    // 未加载时企业 Tab 不应出现（不闪现）
    expect(screen.queryByText('角色权限')).toBeNull()
    expect(screen.queryByText('项目授权')).toBeNull()
    // 用户列表是 users 页基础功能，可渲染
    expect(screen.getByText('用户列表')).toBeTruthy()
  })

  it('Sidebar: 用户管理 menu NOT rendered while features=null', () => {
    render(<Sidebar currentPage="dashboard" onNavigate={() => {}} navItems={[]} />)
    expect(screen.queryByText('用户管理')).toBeNull()
  })
})
