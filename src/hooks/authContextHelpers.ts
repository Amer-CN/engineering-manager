/**
 * AuthContext helpers - extracted from AuthContext.tsx
 */
import { setCurrentUser as setPermissionsUser, type AuthContext as PermissionsAuthContext } from '../types/permissions'
import { setCurrentAuditUser, logAudit } from '../utils/audit'
import { getAPI } from '../services/api-adapter'
import type { StoredAuth } from '@/store/authStore'

/**
 * 同步登录状态到各模块（权限模块、审计、主进程 session）
 */
export function syncAuthSession(userData: StoredAuth) {
  const permissionsUser: PermissionsAuthContext = {
    userId: userData.userId,
    username: userData.username,
    roleId: userData.roleId,
    roleName: userData.roleName,
    permissions: userData.permissions as any
  }
  setPermissionsUser(permissionsUser)
  setCurrentAuditUser(userData.userId, userData.username)
  getAPI().then(api => api?.setSession?.({
    userId: userData.userId,
    username: userData.username,
    roleId: userData.roleId,
    permissions: userData.permissions
  })).catch((err: any) => console.warn('同步 session 到主进程失败:', err))
}

/**
 * 清除登录状态（权限模块、审计、主进程 session）
 */
export function clearAuthSession() {
  setPermissionsUser(null)
  setCurrentAuditUser(null, null)
  getAPI().then(api => api?.clearSession?.()).catch((err: any) => console.warn('清除主进程 session 失败:', err))
}

/**
 * 执行登录回调：设置状态 + 持久化 + 同步模块 + 审计
 */
export function handleLogin(
  userData: StoredAuth,
  setCurrentUser: (u: StoredAuth) => void,
  setIsAuthenticated: (v: boolean) => void
) {
  setCurrentUser(userData)
  setIsAuthenticated(true)
  localStorage.setItem('engineering_auth', JSON.stringify(userData))
  syncAuthSession(userData)
  logAudit('login', 'auth', `用户登录: ${userData.username}`, { resourceName: userData.username })
}

/**
 * 执行登出回调：清除状态 + 持久化 + 同步模块 + 审计
 */
export function handleLogout(
  currentUser: StoredAuth | null,
  setCurrentUser: (u: null) => void,
  setIsAuthenticated: (v: boolean) => void
) {
  if (currentUser) {
    logAudit('logout', 'auth', `用户登出: ${currentUser.username}`, { resourceName: currentUser.username })
  }
  setCurrentUser(null)
  setIsAuthenticated(false)
  localStorage.removeItem('engineering_auth')
  clearAuthSession()
}

/**
 * 从 localStorage 恢复登录状态（返回恢复的用户数据或 null）
 */
export function restoreAuthSession(): StoredAuth | null {
  const pendingLogin = localStorage.getItem('pending_login')
  if (pendingLogin === 'true') {
    localStorage.removeItem('pending_login')
  }
  const stored = localStorage.getItem('engineering_auth')
  if (stored) {
    try {
      const userData: StoredAuth = JSON.parse(stored)
      syncAuthSession(userData)
      return userData
    } catch (e) {
      console.error('恢复登录状态失败:', e)
      localStorage.removeItem('engineering_auth')
    }
  }
  return null
}

