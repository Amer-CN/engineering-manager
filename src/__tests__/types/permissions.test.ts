import type { PermissionCode, AuthContext } from '../../types/permissions'
import {
  setCurrentUser,
  getCurrentUser,
  isAuthenticated,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  hasRole,
  getUserRole,
  getPermissionLabel,
  SYSTEM_ROLES,
  RESOURCE_LABELS,
  ACTION_LABELS,
} from '../../types/permissions'

describe('permissions.ts', () => {
  beforeEach(() => {
    // 每个测试前清空用户状态
    setCurrentUser(null)
  })

  // ─── SYSTEM_ROLES ───────────────────────────────────────────
  describe('SYSTEM_ROLES', () => {
    it('应包含 4 个系统角色', () => {
      expect(SYSTEM_ROLES).toHaveLength(4)
    })

    it('应包含 admin 角色', () => {
      const admin = SYSTEM_ROLES.find(r => r.id === 'admin')
      expect(admin).toBeDefined()
      expect(admin!.isSystem).toBe(true)
      expect(admin!.permissions.length).toBeGreaterThan(0)
    })

    it('admin 应拥有最多权限', () => {
      const admin = SYSTEM_ROLES.find(r => r.id === 'admin')
      const worker = SYSTEM_ROLES.find(r => r.id === 'worker')
      expect(admin!.permissions.length).toBeGreaterThan(worker!.permissions.length)
    })
  })

  // ─── 用户认证状态 ────────────────────────────────────────────
  describe('用户认证状态', () => {
    it('未登录时 isAuthenticated 应返回 false', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('登录后 isAuthenticated 应返回 true', () => {
      setCurrentUser({
        userId: '1',
        username: 'admin',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read', 'projects:create'],
      })
      expect(isAuthenticated()).toBe(true)
    })

    it('getCurrentUser 应返回当前用户', () => {
      const user: AuthContext = {
        userId: '1',
        username: 'admin',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'] as PermissionCode[],
      }
      setCurrentUser(user)
      const current = getCurrentUser()
      expect(current).not.toBeNull()
      expect(current!.username).toBe('admin')
    })
  })

  // ─── 权限检查 ──────────────────────────────────────────────
  describe('权限检查', () => {
    const adminUser: AuthContext = {
      userId: '1',
      username: 'admin',
      roleId: 'admin',
      roleName: '管理员',
      permissions: ['projects:read', 'projects:create', 'contracts:read'] as PermissionCode[],
    }

    const workerUser: AuthContext = {
      userId: '2',
      username: 'worker',
      roleId: 'worker',
      roleName: '普通员工',
      permissions: ['projects:read'] as PermissionCode[],
    }

    describe('hasPermission', () => {
      it('未登录时应返回 false', () => {
        expect(hasPermission('projects:read')).toBe(false)
      })

      it('拥有权限时应返回 true', () => {
        setCurrentUser(adminUser)
        expect(hasPermission('projects:read')).toBe(true)
      })

      it('无权限时应返回 false', () => {
        setCurrentUser(workerUser)
        expect(hasPermission('projects:delete')).toBe(false)
      })
    })

    describe('hasAllPermissions', () => {
      it('拥有全部权限时应返回 true', () => {
        setCurrentUser(adminUser)
        expect(hasAllPermissions(['projects:read', 'projects:create'])).toBe(true)
      })

      it('缺少任一权限时应返回 false', () => {
        setCurrentUser(workerUser)
        expect(hasAllPermissions(['projects:read', 'projects:create'])).toBe(false)
      })
    })

    describe('hasAnyPermission', () => {
      it('拥有任一权限时应返回 true', () => {
        setCurrentUser(workerUser)
        expect(hasAnyPermission(['projects:read', 'projects:create'])).toBe(true)
      })

      it('全无权限时应返回 false', () => {
        setCurrentUser(workerUser)
        expect(hasAnyPermission(['projects:delete', 'contracts:delete'])).toBe(false)
      })
    })

    describe('isAdmin', () => {
      it('admin 角色应返回 true', () => {
        setCurrentUser(adminUser)
        expect(isAdmin()).toBe(true)
      })

      it('非 admin 角色应返回 false', () => {
        setCurrentUser(workerUser)
        expect(isAdmin()).toBe(false)
      })

      it('未登录应返回 false', () => {
        expect(isAdmin()).toBe(false)
      })
    })

    describe('hasRole', () => {
      it('角色匹配时应返回 true', () => {
        setCurrentUser(adminUser)
        expect(hasRole('admin')).toBe(true)
      })

      it('角色不匹配时应返回 false', () => {
        setCurrentUser(adminUser)
        expect(hasRole('worker')).toBe(false)
      })
    })

    describe('getUserRole', () => {
      it('应返回匹配的角色定义', () => {
        setCurrentUser(adminUser)
        const role = getUserRole()
        expect(role).toBeDefined()
        expect(role!.id).toBe('admin')
      })

      it('未登录时应返回 undefined', () => {
        expect(getUserRole()).toBeUndefined()
      })
    })
  })

  // ─── 标签映射 ──────────────────────────────────────────────
  describe('标签映射', () => {
    it('RESOURCE_LABELS 应包含所有资源类型', () => {
      const resources = ['dashboard', 'projects', 'contracts', 'members', 'wages', 'settings']
      resources.forEach(r => {
        expect(RESOURCE_LABELS[r as keyof typeof RESOURCE_LABELS]).toBeDefined()
      })
    })

    it('ACTION_LABELS 应包含所有操作类型', () => {
      const actions = ['create', 'read', 'update', 'delete', 'export', 'import', 'approve']
      actions.forEach(a => {
        expect(ACTION_LABELS[a as keyof typeof ACTION_LABELS]).toBeDefined()
      })
    })

    it('getPermissionLabel 应返回正确格式', () => {
      const label = getPermissionLabel('projects:create')
      expect(label).toContain('项目管理')
      expect(label).toContain('新增')
    })
  })
})
