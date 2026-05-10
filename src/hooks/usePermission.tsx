/**
 * 权限守卫 Hook

 * 提供组件级别的权限检查能力
 */

import { useCallback } from 'react'
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  hasRole,
  isAuthenticated,
  getCurrentUser,
  PermissionCode,
} from '../types/permissions'

/**
 * 权限检查 Hook
 * 
 * @example
 * ```tsx
 * const { can, canAny, isAdmin, isLoggedIn } = usePermission()
 * 
 * // 在组件中条件渲染
 * {can('projects:delete') && <DeleteButton />}
 * {isAdmin() && <AdminPanel />}
 * ```
 */
export function usePermission() {
  /**
   * 检查单个权限
   */
  const can = useCallback((permission: PermissionCode): boolean => {
    return hasPermission(permission)
  }, [])

  /**
   * 检查是否拥有所有指定权限
   */
  const canAll = useCallback((permissions: PermissionCode[]): boolean => {
    return hasAllPermissions(permissions)
  }, [])

  /**
   * 检查是否拥有任一指定权限
   */
  const canAny = useCallback((permissions: PermissionCode[]): boolean => {
    return hasAnyPermission(permissions)
  }, [])

  /**
   * 检查是否为管理员
   */
  const checkIsAdmin = useCallback((): boolean => {
    return isAdmin()
  }, [])

  /**
   * 检查是否已登录
   */
  const checkIsLoggedIn = useCallback((): boolean => {
    return isAuthenticated()
  }, [])

  /**
   * 获取当前用户信息
   */
  const getUser = useCallback(() => {
    return getCurrentUser()
  }, [])

  const checkHasRole = useCallback((roleId: string): boolean => {
    return hasRole(roleId)
  }, [])

  return {
    can,
    canAll,
    canAny,
    isAdmin: checkIsAdmin,
    isLoggedIn: checkIsLoggedIn,
    getUser: getUser,
    hasRole: checkHasRole,
  }
}

/**
 * 权限检查组件 Props
 */
export interface RequirePermissionProps {
  /** 必需拥有的权限 */
  permission: PermissionCode
  /** 未授权时显示的组件 */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * 权限检查组件
 * 
 * @example
 * ```tsx
 * <RequirePermission permission="projects:delete" fallback={<span>无权限</span>}>
 *   <DeleteButton />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({ 
  permission, 
  fallback = null, 
  children 
}: RequirePermissionProps) {
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

/**
 * 多个权限检查组件 Props
 */
export interface RequireAnyPermissionProps {
  /** 至少拥有其一即可 */
  permissions: PermissionCode[]
  /** 未授权时显示的组件 */
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * 多权限检查组件（拥有任一即可）
 */
export function RequireAnyPermission({ 
  permissions, 
  fallback = null, 
  children 
}: RequireAnyPermissionProps) {
  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

/**
 * 管理员检查组件
 */
export function RequireAdmin({ 
  fallback = null, 
  children 
}: { 
  fallback?: React.ReactNode
  children: React.ReactNode 
}) {
  if (!isAdmin()) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
