/**
 * authStore - Zustand 认证状态管理
 * 
 * 替代 AuthContext，提供登录状态管理和权限检查
 * 注意：每次打开应用都需要重新登录，不会自动恢复登录状态
 * 这是为了安全考虑，防止他人未经授权访问
 */

import { create } from 'zustand'
import { setCurrentUser as setPermissionsUser, type AuthContext as PermissionsAuthContext } from '../types/permissions'
import { setCurrentAuditUser, logAudit } from '../utils/audit'

// 存储键
const AUTH_STORAGE_KEY = 'engineering_auth'

// 认证信息
export interface StoredAuth {
  userId: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
}

// Auth Store 接口
interface AuthState {
  isAuthenticated: boolean
  isLocked: boolean
  currentUser: StoredAuth | null
  
  // 操作方法
  login: (userData: StoredAuth) => void
  logout: () => void
  lock: () => void
  unlock: (username: string, password: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 初始化时从 localStorage 恢复登录状态
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  let initialAuthenticated = false
  let initialUser = null
  
  if (stored) {
    try {
      const userData = JSON.parse(stored)
      console.log('🔵 从 localStorage 恢复登录状态:', userData.username)
      initialAuthenticated = true
      initialUser = userData
      
      // 同步到权限模块
      const permissionsUser: PermissionsAuthContext = {
        userId: userData.userId,
        username: userData.username,
        roleId: userData.roleId,
        roleName: userData.roleName,
        permissions: userData.permissions as any
      }
      setPermissionsUser(permissionsUser)
      // 接通审计用户
      setCurrentAuditUser(userData.userId, userData.username)
    } catch (e) {
      console.error('恢复登录状态失败:', e)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }
  
  return {
    isAuthenticated: initialAuthenticated,
    isLocked: false,
    currentUser: initialUser,
    
    login: (userData: StoredAuth) => {
      console.log('🔵 设置登录状态:', userData.username)
      set({
        currentUser: userData,
        isAuthenticated: true,
      })
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      
      // 同步到权限模块
      const permissionsUser: PermissionsAuthContext = {
        userId: userData.userId,
        username: userData.username,
        roleId: userData.roleId,
        roleName: userData.roleName,
        permissions: userData.permissions as any
      }
      setPermissionsUser(permissionsUser)
      // 接通审计用户 + 记录登录
      setCurrentAuditUser(userData.userId, userData.username)
      logAudit('login', 'auth', `用户登录: ${userData.username}`, { resourceName: userData.username })
    },
    
    logout: () => {
      const state = get()
      // 记录登出
      if (state.currentUser) {
        logAudit('logout', 'auth', `用户登出: ${state.currentUser.username}`, { resourceName: state.currentUser.username })
      }
      
      set({
        currentUser: null,
        isAuthenticated: false,
      })
      localStorage.removeItem(AUTH_STORAGE_KEY)
      
      // 同步到权限模块
      setPermissionsUser(null)
      // 清除审计用户
      setCurrentAuditUser(null, null)
    },
    
    lock: () => {
      const state = get()
      if (state.currentUser) {
        logAudit('lock', 'auth', `用户锁定屏幕: ${state.currentUser.username}`, { resourceName: state.currentUser.username })
      }
      set({ isLocked: true })
    },
    
    unlock: async (username: string, password: string) => {
      if (!window.electronAPI?.login) return false
      try {
        const result = await window.electronAPI.login(username, password)
        if (result.success) {
          set({ isLocked: false })
          logAudit('unlock', 'auth', `用户解锁屏幕: ${username}`, { resourceName: username })
          return true
        }
        return false
      } catch {
        return false
      }
    },
  }
})

// 兼容旧代码的 Hook
export function useAuth() {
  const { isAuthenticated, isLocked, currentUser, login, logout, lock, unlock } = useAuthStore()
  return { isAuthenticated, isLocked, currentUser, login, logout, lock, unlock }
}
