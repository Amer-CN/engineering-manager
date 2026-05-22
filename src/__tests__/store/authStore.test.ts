// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../store/authStore'

// 模拟依赖模块（authStore 依赖 permissions 和 audit）
vi.mock('../../types/permissions', () => ({
  setCurrentUser: vi.fn(),
}))

vi.mock('../../utils/audit', () => ({
  setCurrentAuditUser: vi.fn(),
  logAudit: vi.fn(),
}))

describe('authStore', () => {
  beforeEach(() => {
    // 每次测试前重置 store
    useAuthStore.setState({
      isAuthenticated: false,
      isLocked: false,
      currentUser: null,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  // ─── login ─────────────────────────────────────────────────
  describe('login', () => {
    it('应设置登录状态', () => {
      const userData = {
        userId: '1',
        username: 'admin',
        displayName: '管理员',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'],
      }

      useAuthStore.getState().login(userData)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.currentUser).not.toBeNull()
      expect(state.currentUser!.username).toBe('admin')
    })

    it('应将用户数据存入 localStorage', () => {
      const userData = {
        userId: '1',
        username: 'admin',
        displayName: '管理员',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'],
      }

      useAuthStore.getState().login(userData)

      const stored = localStorage.getItem('engineering_auth')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.username).toBe('admin')
    })
  })

  // ─── logout ────────────────────────────────────────────────
  describe('logout', () => {
    it('应清除登录状态', () => {
      // 先登录
      useAuthStore.getState().login({
        userId: '1',
        username: 'admin',
        displayName: '管理员',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'],
      })

      // 登出
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.currentUser).toBeNull()
    })

    it('应清除 localStorage', () => {
      useAuthStore.getState().login({
        userId: '1',
        username: 'admin',
        displayName: '管理员',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'],
      })

      useAuthStore.getState().logout()

      expect(localStorage.getItem('engineering_auth')).toBeNull()
    })
  })

  // ─── lock / unlock ────────────────────────────────────────
  describe('lock / unlock', () => {
    it('lock 应设置锁定状态', () => {
      useAuthStore.getState().login({
        userId: '1',
        username: 'admin',
        displayName: '管理员',
        roleId: 'admin',
        roleName: '管理员',
        permissions: ['projects:read'],
      })

      useAuthStore.getState().lock()

      expect(useAuthStore.getState().isLocked).toBe(true)
    })

    it('unlock 成功时应解锁', async () => {
      // 模拟 window.electronAPI.login
      const mockLogin = vi.fn().mockResolvedValue({ success: true })
      vi.stubGlobal('window', {
        ...globalThis.window,
        electronAPI: { login: mockLogin },
      })

      useAuthStore.getState().lock()
      expect(useAuthStore.getState().isLocked).toBe(true)

      const result = await useAuthStore.getState().unlock('admin', 'password')

      expect(result).toBe(true)
      expect(useAuthStore.getState().isLocked).toBe(false)

      vi.unstubAllGlobals()
    })

    it('unlock 失败时应保持锁定', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ success: false })
      vi.stubGlobal('window', {
        ...globalThis.window,
        electronAPI: { login: mockLogin },
      })

      useAuthStore.getState().lock()
      const result = await useAuthStore.getState().unlock('admin', 'wrong')

      expect(result).toBe(false)
      expect(useAuthStore.getState().isLocked).toBe(true)

      vi.unstubAllGlobals()
    })
  })
})
