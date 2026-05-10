/**
 * AuthContext - 认证状态 Context
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { setCurrentUser as setPermissionsUser, type AuthContext as PermissionsAuthContext } from '../types/permissions'
import { setCurrentAuditUser, logAudit } from '../utils/audit'

// 存储键
const AUTH_STORAGE_KEY = 'engineering_auth'
const PENDING_LOGIN_KEY = 'pending_login'

// 认证信息
export interface StoredAuth {
  userId: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
}

// Context 类型
interface AuthContextType {
  isAuthenticated: boolean
  isLocked: boolean
  currentUser: StoredAuth | null
  login: (userData: StoredAuth) => void
  logout: () => void
  lock: () => void
  unlock: (username: string, password: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredAuth | null>(null)

  // 初始化时检查是否有待处理的登录
  useEffect(() => {
    const pendingLogin = localStorage.getItem(PENDING_LOGIN_KEY)
    if (pendingLogin === 'true') {
      console.log('🔵 发现待处理登录，清除标记')
      localStorage.removeItem(PENDING_LOGIN_KEY)
    }
    
    // 从 localStorage 恢复登录状态
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      try {
        const userData = JSON.parse(stored)
        console.log('🔵 从 localStorage 恢复登录状态:', userData.username)
        setCurrentUser(userData)
        setIsAuthenticated(true)
        
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
  }, [])

  const login = useCallback((userData: StoredAuth) => {
    console.log('🔵 设置登录状态:', userData.username)
    setCurrentUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
    
    // 同步到权限模块
    const permissionsUser: PermissionsAuthContext = {
      userId: userData.userId,
      username: userData.username,
      roleId: userData.roleId,
      roleName: userData.roleName,
      permissions: userData.permissions as any // PermissionCode[] 本质上是字符串
    }
    setPermissionsUser(permissionsUser)
    // 接通审计用户 + 记录登录
    setCurrentAuditUser(userData.userId, userData.username)
    logAudit('login', 'auth', `用户登录: ${userData.username}`, { resourceName: userData.username })
  }, [])

  const logout = useCallback(() => {
    // 记录登出
    if (currentUser) {
      logAudit('logout', 'auth', `用户登出: ${currentUser.username}`, { resourceName: currentUser.username })
    }
    setCurrentUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem(AUTH_STORAGE_KEY)

    // 同步到权限模块
    setPermissionsUser(null)
    // 清除审计用户
    setCurrentAuditUser(null, null)
  }, [currentUser])

  const lock = useCallback(() => {
    if (currentUser) {
      logAudit('lock', 'auth', `用户锁定屏幕: ${currentUser.username}`, { resourceName: currentUser.username })
    }
    setIsLocked(true)
  }, [currentUser])

  const unlock = useCallback(async (username: string, password: string) => {
    if (!window.electronAPI?.login) return false
    try {
      const result = await window.electronAPI.login(username, password)
      if (result.success) {
        setIsLocked(false)
        logAudit('unlock', 'auth', `用户解锁屏幕: ${username}`, { resourceName: username })
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const value = {
    isAuthenticated,
    isLocked,
    currentUser,
    login,
    logout,
    lock,
    unlock,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
