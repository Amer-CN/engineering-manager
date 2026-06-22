import React from 'react'
import {
  hasPermission,
  hasAnyPermission,
  isAdmin,
  PermissionCode,
} from '../types/permissions'

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
  children,
}: RequirePermissionProps) {
  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

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
  children,
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
  children,
}: {
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  if (!isAdmin()) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
