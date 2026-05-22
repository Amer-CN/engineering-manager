// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { render } from '@testing-library/react'
import {
  usePermission,
  RequirePermission,
  RequireAnyPermission,
  RequireAdmin,
} from '../../hooks/usePermission'

// mock permissions 模块
const mockHasPermission = vi.fn()
const mockHasAllPermissions = vi.fn()
const mockHasAnyPermission = vi.fn()
const mockIsAdmin = vi.fn()
const mockHasRole = vi.fn()
const mockIsAuthenticated = vi.fn()
const mockGetCurrentUser = vi.fn()

vi.mock('../../types/permissions', () => ({
  hasPermission: (...args: unknown[]) => mockHasPermission(...args),
  hasAllPermissions: (...args: unknown[]) => mockHasAllPermissions(...args),
  hasAnyPermission: (...args: unknown[]) => mockHasAnyPermission(...args),
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
  hasRole: (...args: unknown[]) => mockHasRole(...args),
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  PermissionCode: undefined,
}))

describe('usePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('can 应调用 hasPermission', () => {
    mockHasPermission.mockReturnValue(true)
    const { result } = renderHook(() => usePermission())

    expect(result.current.can('projects:delete' as never)).toBe(true)
    expect(mockHasPermission).toHaveBeenCalledWith('projects:delete')
  })

  it('canAll 应调用 hasAllPermissions', () => {
    mockHasAllPermissions.mockReturnValue(false)
    const { result } = renderHook(() => usePermission())

    expect(result.current.canAll(['a', 'b'] as never[])).toBe(false)
    expect(mockHasAllPermissions).toHaveBeenCalledWith(['a', 'b'])
  })

  it('canAny 应调用 hasAnyPermission', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const { result } = renderHook(() => usePermission())

    expect(result.current.canAny(['a', 'b'] as never[])).toBe(true)
    expect(mockHasAnyPermission).toHaveBeenCalledWith(['a', 'b'])
  })

  it('isAdmin 应调用 isAdmin', () => {
    mockIsAdmin.mockReturnValue(true)
    const { result } = renderHook(() => usePermission())

    expect(result.current.isAdmin()).toBe(true)
    expect(mockIsAdmin).toHaveBeenCalled()
  })

  it('isLoggedIn 应调用 isAuthenticated', () => {
    mockIsAuthenticated.mockReturnValue(true)
    const { result } = renderHook(() => usePermission())

    expect(result.current.isLoggedIn()).toBe(true)
    expect(mockIsAuthenticated).toHaveBeenCalled()
  })

  it('getUser 应调用 getCurrentUser', () => {
    const mockUser = { userId: '1', username: 'admin' }
    mockGetCurrentUser.mockReturnValue(mockUser)
    const { result } = renderHook(() => usePermission())

    expect(result.current.getUser()).toEqual(mockUser)
    expect(mockGetCurrentUser).toHaveBeenCalled()
  })

  it('hasRole 应调用 hasRole', () => {
    mockHasRole.mockReturnValue(false)
    const { result } = renderHook(() => usePermission())

    expect(result.current.hasRole('manager')).toBe(false)
    expect(mockHasRole).toHaveBeenCalledWith('manager')
  })
})

describe('RequirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('有权限时应渲染 children', () => {
    mockHasPermission.mockReturnValue(true)
    const { container } = render(
      <RequirePermission permission={'projects:delete' as never}>
        <span>Delete Button</span>
      </RequirePermission>
    )
    expect(container.textContent).toContain('Delete Button')
  })

  it('无权限时应渲染 fallback', () => {
    mockHasPermission.mockReturnValue(false)
    const { container } = render(
      <RequirePermission permission={'projects:delete' as never} fallback={<span>No Access</span>}>
        <span>Delete Button</span>
      </RequirePermission>
    )
    expect(container.textContent).toContain('No Access')
  })

  it('无权限且无 fallback 应渲染空', () => {
    mockHasPermission.mockReturnValue(false)
    const { container } = render(
      <RequirePermission permission={'projects:delete' as never}>
        <span>Delete Button</span>
      </RequirePermission>
    )
    expect(container.textContent).toBe('')
  })
})

describe('RequireAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('有任一权限应渲染 children', () => {
    mockHasAnyPermission.mockReturnValue(true)
    const { container } = render(
      <RequireAnyPermission permissions={['a', 'b'] as never[]}>
        <span>Content</span>
      </RequireAnyPermission>
    )
    expect(container.textContent).toContain('Content')
  })

  it('无任一权限应渲染 fallback', () => {
    mockHasAnyPermission.mockReturnValue(false)
    const { container } = render(
      <RequireAnyPermission permissions={['a', 'b'] as never[]} fallback={<span>Denied</span>}>
        <span>Content</span>
      </RequireAnyPermission>
    )
    expect(container.textContent).toContain('Denied')
  })
})

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('是管理员应渲染 children', () => {
    mockIsAdmin.mockReturnValue(true)
    const { container } = render(
      <RequireAdmin><span>Admin Panel</span></RequireAdmin>
    )
    expect(container.textContent).toContain('Admin Panel')
  })

  it('非管理员应渲染 fallback', () => {
    mockIsAdmin.mockReturnValue(false)
    const { container } = render(
      <RequireAdmin fallback={<span>Not Admin</span>}>
        <span>Admin Panel</span>
      </RequireAdmin>
    )
    expect(container.textContent).toContain('Not Admin')
  })
})
