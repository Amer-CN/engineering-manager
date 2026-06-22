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
export {
  RequirePermission,
  RequireAnyPermission,
  RequireAdmin,
} from './permissionHelpers'
export type {
  RequirePermissionProps,
  RequireAnyPermissionProps,
} from './permissionHelpers'

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
  const can = useCallback((permission: PermissionCode): boolean => {
    return hasPermission(permission)
  }, [])

  const canAll = useCallback((permissions: PermissionCode[]): boolean => {
    return hasAllPermissions(permissions)
  }, [])

  const canAny = useCallback((permissions: PermissionCode[]): boolean => {
    return hasAnyPermission(permissions)
  }, [])

  const checkIsAdmin = useCallback((): boolean => {
    return isAdmin()
  }, [])

  const checkIsLoggedIn = useCallback((): boolean => {
    return isAuthenticated()
  }, [])

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
    getUser,
    hasRole: checkHasRole,
  }
}
