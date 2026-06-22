/**
 * AuthContext - 认证状态 Context
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { getAPI } from '../services/api-adapter'
import { logAudit } from '../utils/audit'
import { handleLogin as doLogin, handleLogout as doLogout, restoreAuthSession } from './authContextHelpers'

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

  // 初始化时恢复登录状态
  useEffect(() => {
    const restored = restoreAuthSession()
    if (restored) {
      setCurrentUser(restored)
      setIsAuthenticated(true)
    }
  }, [])

  const login = useCallback((userData: StoredAuth) => {
    doLogin(userData, setCurrentUser, setIsAuthenticated)
  }, [])

  const logout = useCallback(() => {
    doLogout(currentUser, setCurrentUser, setIsAuthenticated)
  }, [currentUser])

  const lock = useCallback(() => {
    if (currentUser) {
      logAudit('lock', 'auth', `用户锁定屏幕: ${currentUser.username}`, { resourceName: currentUser.username })
    }
    setIsLocked(true)
  }, [currentUser])

  const unlock = useCallback(async (username: string, password: string) => {
    try {
      const api = await getAPI()
      if (!api?.login) return false
      const result = await api.login(username, password)
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
