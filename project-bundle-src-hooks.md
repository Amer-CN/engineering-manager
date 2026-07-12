This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/hooks/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)


================================================================
Directory Structure
================================================================
src/hooks/authContextHelpers.ts
src/hooks/data/useContracts.ts
src/hooks/data/useCostLedger.ts
src/hooks/data/useDepartments.ts
src/hooks/data/useInvoices.ts
src/hooks/data/useMembers.ts
src/hooks/data/usePartners.ts
src/hooks/data/useProjects.ts
src/hooks/data/useSettlements.ts
src/hooks/data/useTemplates.ts
src/hooks/data/useWorkers.ts
src/hooks/formTypes.ts
src/hooks/index.ts
src/hooks/permissionHelpers.tsx
src/hooks/useAsync.ts
src/hooks/useAuditLogFilters.ts
src/hooks/useAuth.ts
src/hooks/useBankCardOCR.ts
src/hooks/useBankReceiptBatch.ts
src/hooks/useBankReceiptOCR.ts
src/hooks/useBankStatementOCR.ts
src/hooks/useBusinessLicenseOCR.ts
src/hooks/useCompanyQueryOCR.ts
src/hooks/useConfirm.ts
src/hooks/useCostLedgerBatches.ts
src/hooks/useCostLedgerCategories.ts
src/hooks/useCRUDBase.actions.ts
src/hooks/useCRUDBase.loaders.ts
src/hooks/useCRUDBase.ts
src/hooks/useCRUDBase.types.ts
src/hooks/useDataPath.ts
src/hooks/useDataTableFilters.ts
src/hooks/useDataTableState.ts
src/hooks/useDebounce.ts
src/hooks/useDebouncedCallback.ts
src/hooks/useDepartments.ts
src/hooks/useFileUpload.helpers.ts
src/hooks/useFileUpload.ts
src/hooks/useFileUpload.types.ts
src/hooks/useFilters.ts
src/hooks/useFontFamily.ts
src/hooks/useFontSize.ts
src/hooks/useForm.ts
src/hooks/useGeneralReceiptOCR.ts
src/hooks/useHoverScrollbar.helpers.ts
src/hooks/useHoverScrollbar.ts
src/hooks/useIdCardOCR.helpers.ts
src/hooks/useIdCardOCR.ts
src/hooks/useIdCardOCR.types.ts
src/hooks/useInventoryPage.ts
src/hooks/useInventoryPageHelpers.ts
src/hooks/useInvoiceOCR.ts
src/hooks/useInvoicePage.helpers.ts
src/hooks/useInvoicePage.invoice.ts
src/hooks/useInvoicePage.payment.ts
src/hooks/useInvoicePage.ts
src/hooks/useInvoicePageLoaders.ts
src/hooks/useInvoices.ts
src/hooks/useInvoices.types.ts
src/hooks/useInvoices.utils.ts
src/hooks/useLocalStorage.storage.ts
src/hooks/useLocalStorage.ts
src/hooks/useMaskedValue.ts
src/hooks/useMembers.ts
src/hooks/useMembers.types.ts
src/hooks/useMembersActions.ts
src/hooks/useMembersBatch.ts
src/hooks/useMembersEditHandlers.ts
src/hooks/useMembersLoadData.ts
src/hooks/useMembersLoaders.ts
src/hooks/useMembersOCR.ts
src/hooks/useMembersPage.ts
src/hooks/useMembersState.ts
src/hooks/useModal.ts
src/hooks/useModalHelpers.ts
src/hooks/useOCRConfig.ts
src/hooks/usePagination.ts
src/hooks/usePartners.ts
src/hooks/usePartnersHelpers.ts
src/hooks/usePaymentRecords.ts
src/hooks/usePermission.tsx
src/hooks/usePermitOCR.ts
src/hooks/useProjects.ts
src/hooks/useProjects.types.ts
src/hooks/useProjectsActions.ts
src/hooks/useProjectsLoaders.ts
src/hooks/useRegionsAndSupervisors.ts
src/hooks/useRowHoverOpacity.ts
src/hooks/useSqliteSettings.ts
src/hooks/useTheme.ts
src/hooks/useToast.ts
src/hooks/useUpdater.tsx
src/hooks/useWageAttendance.ts
src/hooks/useWageDataLoader.ts
src/hooks/useWageLoaders.ts
src/hooks/useWageManagement.ts
src/hooks/useWageManagementTypes.ts
src/hooks/useWagePaymentOps.ts
src/hooks/useWagePaymentRecords.ts
src/hooks/useWagePayments.ts
src/hooks/useWageProjectWorkers.ts
src/hooks/useWageTable.ts
src/hooks/useWorkerTeams.ts
src/hooks/useWorkerTeams.types.ts
src/hooks/useWorkerTeamsActions.ts
src/hooks/useWorkerTeamsLoaders.ts

================================================================
Files
================================================================

================
File: src/hooks/authContextHelpers.ts
================
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

================
File: src/hooks/data/useContracts.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getContracts()
      if (!res.success) throw new Error(res.error || '获取合同失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useCostLedger.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useCostLedger(projectId?: number) {
  return useQuery({
    queryKey: ['costLedger', projectId],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getCostLedger(projectId)
      if (!res.success) throw new Error(res.error || '获取成本台账失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useDepartments.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getDepartments()
      if (!res.success) throw new Error(res.error || '获取部门失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useInvoices.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useInvoices(projectId?: number) {
  return useQuery({
    queryKey: ['invoices', projectId],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getInvoices(projectId)
      if (!res.success) throw new Error(res.error || '获取发票失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useMembers.ts
================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'
import type { Member } from '../../types/electron'

const MEMBERS_KEY = ['members'] as const

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getMembers()
      if (!res.success) throw new Error(res.error || '获取成员失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: Partial<Member>) => {
      const api = await getAPI()
      const res = await api.createMember(member)
      if (!res.success) throw new Error(res.error || '创建成员失败')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member: Partial<Member>) => {
      const api = await getAPI()
      const res = await api.updateMember(member)
      if (!res.success) throw new Error(res.error || '更新成员失败')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const api = await getAPI()
      const res = await api.deleteMember(id)
      if (!res.success) throw new Error(res.error || '删除成员失败')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

================
File: src/hooks/data/usePartners.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getPartners()
      if (!res.success) throw new Error(res.error || '获取合作伙伴失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useProjects.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error || '获取项目失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useSettlements.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useSettlements() {
  return useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getSettlements()
      if (!res.success) throw new Error(res.error || '获取结算失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useTemplates.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getTemplates()
      if (!res.success) throw new Error(res.error || '获取模板失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/data/useWorkers.ts
================
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getWorkers()
      if (!res.success) throw new Error(res.error || '获取工人失败')
      return res.data
    },
    staleTime: 30_000,
  })
}

================
File: src/hooks/formTypes.ts
================
import type { Result, VoidResult } from '@/types'

export type FieldError = string | null

export type FormErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, FieldError>>

export type TouchedFields<T extends Record<string, unknown>> = Partial<Record<keyof T, boolean>>

export type Validator<T extends Record<string, unknown>> = (values: T) => FormErrors<T>

export type SubmitHandler<T extends Record<string, unknown>, R = void> = (
  values: T
) => Promise<Result<R> | VoidResult>

export interface UseFormReturn<T extends Record<string, unknown>, R = void> {
  values: T
  errors: FormErrors<T>
  touched: TouchedFields<T>
  isSubmitting: boolean

  handleChange: (field: keyof T, value: T[keyof T]) => void
  handleBlur: (field: keyof T) => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: () => void
  setValues: (values: Partial<T>) => void
  setFieldValue: (field: keyof T, value: T[keyof T]) => void

  isValid: boolean
  isDirty: boolean
  getFieldProps: (field: keyof T) => {
    name: keyof T
    value: T[keyof T]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
    onBlur: () => void
  }
}

================
File: src/hooks/index.ts
================
/**
 * Hooks 入口文件
 * 
 * 统一导出所有自定义 Hooks
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 基础 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { useCRUDBase, createCRUDHook } from './useCRUDBase'
export type { CRUDAPI, CRUDState, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase'

// ═══════════════════════════════════════════════════════════════════════════════
// 业务 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { useIdCardOCR } from './useIdCardOCR'
export type { UseIdCardOCRReturn, OCRResult, Toast } from './useIdCardOCR'

// OCR 相关 Hooks
export { useInvoiceOCR } from './useInvoiceOCR'
export { useBankCardOCR } from './useBankCardOCR'
export { useBusinessLicenseOCR } from './useBusinessLicenseOCR'
export { useBankReceiptOCR } from './useBankReceiptOCR'
export { usePermitOCR } from './usePermitOCR'
export { useBankStatementOCR } from './useBankStatementOCR'
export { useGeneralReceiptOCR } from './useGeneralReceiptOCR'
export { useCompanyQueryOCR } from './useCompanyQueryOCR'

// 文件上传
export { useFileUpload } from './useFileUpload'
export type { UseFileUploadOptions, UseFileUploadReturn, UploadedFile } from './useFileUpload'

export { useProjects } from './useProjects'
export { useMembers } from './useMembers'
export { useWorkerTeams, useWorkerTransfers } from './useWorkerTeams'
export { usePartners } from './usePartners'
export { useRegions, useSupervisors } from './useRegionsAndSupervisors'
export { useInvoices, usePaymentRecords } from './useInvoices'
export { useInvoicePage } from './useInvoicePage'
export { useInventoryPage } from './useInventoryPage'
export { useDataPath } from './useDataPath'
export { useDepartments } from './useDepartments'
export { useOCRConfig } from './useOCRConfig'
export { useAuditLogFilters } from './useAuditLogFilters'
export type { AuditLogFilters } from './useAuditLogFilters'
// ═══════════════════════════════════════════════════════════════════════════════
// 通用 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { usePagination } from './usePagination'
export { useFilters } from './useFilters'
export { useModal, useConfirm } from './useModal'
export { useAsync } from './useAsync'
export { useForm } from './useForm'
export { useDebounce } from './useDebounce'
export { useLocalStorage } from './useLocalStorage'
export { useRowHoverOpacity } from './useRowHoverOpacity'

================
File: src/hooks/permissionHelpers.tsx
================
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

================
File: src/hooks/useAsync.ts
================
/**
 * useAsync Hook
 * 
 * 异步操作状态管理 Hook
 */

import { useState, useCallback, useRef } from 'react'
import { handleError, Result } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useAsync 返回类型
 */
export interface UseAsyncReturn<TArgs extends unknown[], TResult> {
  loading: boolean
  error: string | null
  data: TResult | null
  execute: (...args: TArgs) => Promise<Result<TResult>>
  reset: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 异步操作 Hook
 * 
 * @param asyncFunction - 异步函数
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const fetchData = async (id: number): Promise<Result<User>> => {
 *     const response = await api.getUser(id)
 *     return { success: true, data: response }
 *   }
 *   
 *   const { loading, error, data, execute, reset } = useAsync([(id: number) => fetchData(id)])
 *   
 *   const handleLoad = () => {
 *     execute(1) // 调用异步函数
 *   }
 *   
 *   return (
 *     <>
 *       {loading && <Spinner />}
 *       {error && <ErrorMessage error={error} />}
 *       {data && <UserCard user={data} />}
 *     </>
 *   )
 * }
 * ```
 */
export function useAsync<TArgs extends unknown[], TResult>(
  asyncFunction: (...args: TArgs) => Promise<Result<TResult>>
): UseAsyncReturn<TArgs, TResult> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TResult | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (...args: TArgs) => {
    // 取消之前的请求 (如果有)
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const result = await asyncFunction(...args)
      
      if (result.success) {
        setData(result.data)
        return { success: true, data: result.data } as Result<TResult>
      } else {
        const err = (result as { success: false; error: string }).error
        setError(err)
        return { success: false, error: err } as Result<TResult>
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() } as Result<TResult>
    } finally {
      setLoading(false)
    }
  }, [asyncFunction])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
    abortControllerRef.current?.abort()
  }, [])

  return {
    loading,
    error,
    data,
    execute,
    reset,
  }
}

/**
 * 简单异步操作 Hook (不需要参数)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { loading, error, data, execute, reset } = useAsyncSimple(async () => {
 *     const response = await api.getUser()
 *     return response
 *   })
 *   
 *   return (
 *     <button onClick={execute} disabled={loading}>
 *       {loading ? '加载中...' : '加载数据'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useAsyncSimple<TResult>(
  asyncFunction: () => Promise<Result<TResult>>
): Omit<UseAsyncReturn<[], TResult>, 'execute'> & { execute: () => Promise<Result<TResult>> } {
  const asyncHook = useAsync(async () => {
    return await asyncFunction()
  })
  
  return {
    ...asyncHook,
    execute: asyncHook.execute,
  }
}

================
File: src/hooks/useAuditLogFilters.ts
================
import { useState, useCallback } from 'react'
import { AuditAction, AuditLevel } from '../utils/audit'

export interface AuditLogFilters {
  startDate: string
  endDate: string
  filterAction: AuditAction | ''
  filterResource: string
  filterLevel: AuditLevel | ''
  keyword: string
  page: number
}

const INITIAL: AuditLogFilters = {
  startDate: '', endDate: '', filterAction: '', filterResource: '',
  filterLevel: '', keyword: '', page: 1,
}

export function useAuditLogFilters() {
  const [f, setF] = useState<AuditLogFilters>(INITIAL)

  const set = useCallback(<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setF(prev => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setF(INITIAL), [])
  const setPage = useCallback((page: number) => setF(prev => ({ ...prev, page })), [])

  const filterParams = {
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
    action: f.filterAction || undefined,
    resource: f.filterResource || undefined,
    level: f.filterLevel || undefined,
    keyword: f.keyword || undefined,
  }

  return { ...f, set, reset, setPage, filterParams }
}

================
File: src/hooks/useAuth.ts
================
/**
 * useAuth - 认证状态管理 Hook
 * 
 * 提供登录状态管理和权限检查
 * 注意：每次打开应用都需要重新登录，不会自动恢复登录状态
 * 这是为了安全考虑，防止他人未经授权访问
 */

// 从 Zustand store 重新导出
export { useAuth, useAuthStore, type StoredAuth } from '@/store/authStore'

================
File: src/hooks/useBankCardOCR.ts
================
import { useCallback } from 'react'
import { recognizeBankCard, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BankCardOCRData {
  cardNumber: string
  bankName: string
  cardType: string
  validDate: string
}

interface UseBankCardOCRReturn {
  processBankCardFile: (file: File) => Promise<BankCardOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBankCardOCR(): UseBankCardOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP 格式的图片'
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB'
    }
    return null
  }, [])

  const processBankCardFile = useCallback(async (file: File): Promise<BankCardOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result: OCRResult = await recognizeBankCard(base64)

      if (!result.success || !result.bankCard) {
        showToast(result.error || '银行卡识别失败', 'error')
        return null
      }

      const card = result.bankCard

      showToast('银行卡识别成功', 'success')
      return {
        cardNumber: card.cardNumber || '',
        bankName: card.bankName || '',
        cardType: card.cardType || '',
        validDate: card.validDate || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBankCardFile, validateImageFile }
}

================
File: src/hooks/useBankReceiptBatch.ts
================
/**
 * 银行回单批量解析 - 自定义 Hook
 *
 * 管理批量解析和确认的状态和逻辑
 */
import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import type { BatchParseResult, BankReceiptMatch } from '@/types'

interface UseBankReceiptBatchProps {
  selectedMonth?: string
  loadWages: () => Promise<void>
  loadAllRecords: () => Promise<void>
}

interface UseBankReceiptBatchReturn {
  batchResult: BatchParseResult | null
  setBatchResult: (result: BatchParseResult | null) => void
  handleBatchParseComplete: (result: BatchParseResult) => void
  handleBatchCancel: () => void
  handleBatchBack: () => void
  handleBatchConfirm: (confirmedMatches: BankReceiptMatch[]) => Promise<void>
}

export function useBankReceiptBatch({
  selectedMonth,
  loadWages,
  loadAllRecords,
}: UseBankReceiptBatchProps): UseBankReceiptBatchReturn {
  const showToast = useToastStore(state => state.showToast)

  const [batchResult, setBatchResult] = useState<BatchParseResult | null>(null)

  const handleBatchParseComplete = useCallback((result: BatchParseResult) => {
    setBatchResult(result)
  }, [])

  const handleBatchCancel = useCallback(() => {
    setBatchResult(null)
  }, [])

  const handleBatchBack = useCallback(() => {
    setBatchResult(null)
  }, [])

  const handleBatchConfirm = useCallback(async (confirmedMatches: BankReceiptMatch[]) => {
    try {
      const result = await (await getAPI()).batchConfirmMatches(confirmedMatches, selectedMonth)
      if (result.success) {
        showToast(`成功确认 ${result.data?.updated || 0} 条工资记录`, 'success')
        // 刷新工资数据
        await loadWages()
        await loadAllRecords()
        // 返回 cycle 视图
        setBatchResult(null)
      } else {
        showToast(result.error || '确认失败', 'error')
      }
    } catch (error: any) {
      showToast(error?.message || '确认失败', 'error')
    }
  }, [selectedMonth, showToast, loadWages, loadAllRecords])

  return {
    batchResult,
    setBatchResult,
    handleBatchParseComplete,
    handleBatchCancel,
    handleBatchBack,
    handleBatchConfirm,
  }
}

================
File: src/hooks/useBankReceiptOCR.ts
================
import { useCallback } from 'react'
import { recognizeBankReceipt, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BankReceiptOCRData {
  transactionDate: string
  transactionTime: string
  amount: number
  payerName: string
  payerAccount: string
  payeeName: string
  payeeAccount: string
  transactionNo: string
  bankName: string
  remarks: string
}

interface UseBankReceiptOCRReturn {
  processBankReceiptFile: (file: File) => Promise<BankReceiptOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBankReceiptOCR(): UseBankReceiptOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  const processBankReceiptFile = useCallback(async (file: File): Promise<BankReceiptOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        // PDF 需要转图片
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()

        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const scale = 2.0
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        base64 = canvas.toDataURL('image/jpeg', 0.95)
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const result: OCRResult = await recognizeBankReceipt(base64)

      if (!result.success || !result.bankReceipt) {
        showToast(result.error || '银行回单识别失败', 'error')
        return null
      }

      const receipt = result.bankReceipt

      showToast('银行回单识别成功', 'success')
      return {
        transactionDate: receipt.transactionDate || '',
        transactionTime: receipt.transactionTime || '',
        amount: receipt.amount || 0,
        payerName: receipt.payerName || '',
        payerAccount: receipt.payerAccount || '',
        payeeName: receipt.payeeName || '',
        payeeAccount: receipt.payeeAccount || '',
        transactionNo: receipt.transactionNo || '',
        bankName: receipt.bankName || '',
        remarks: receipt.remarks || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBankReceiptFile, validateImageFile }
}

================
File: src/hooks/useBankStatementOCR.ts
================
import { useCallback } from 'react'
import { recognizeBankStatement, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface Transaction {
  date: string
  time: string
  amount: number
  balance: number
  type: string
  counterparty: string
  remark: string
}

interface BankStatementOCRData {
  transactions: Transaction[]
  accountNumber: string
  bankName: string
}

interface UseBankStatementOCRReturn {
  processBankStatementFile: (file: File) => Promise<BankStatementOCRData | null>
  validateFile: (file: File) => string | null
}

export function useBankStatementOCR(): UseBankStatementOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  const processBankStatementFile = useCallback(async (file: File): Promise<BankStatementOCRData | null> => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()

        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const scale = 2.0
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        base64 = canvas.toDataURL('image/jpeg', 0.95)
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const result: OCRResult = await recognizeBankStatement(base64)

      if (!result.success || !result.bankStatement) {
        showToast(result.error || '银行单据识别失败', 'error')
        return null
      }

      const statement = result.bankStatement

      showToast(`银行单据识别成功，共 ${statement.transactions.length} 笔交易`, 'success')
      return {
        transactions: statement.transactions || [],
        accountNumber: statement.accountNumber || '',
        bankName: statement.bankName || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile])

  return { processBankStatementFile, validateFile }
}

================
File: src/hooks/useBusinessLicenseOCR.ts
================
import { useCallback } from 'react'
import { recognizeBusinessLicense, initializeBuiltInConfig, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface BusinessLicenseOCRData {
  creditCode: string
  companyName: string
  legalPerson: string
  registeredCapital: string
  address: string
  businessScope: string
  establishDate: string
  expireDate: string
}

interface UseBusinessLicenseOCRReturn {
  processBusinessLicenseFile: (file: File) => Promise<BusinessLicenseOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function useBusinessLicenseOCR(): UseBusinessLicenseOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  /** 将 PDF 第 N 页转为 base64 图片 */
  const pdfPageToBase64 = async (file: File, pageNum: number): Promise<string | null> => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      if (pageNum > pdf.numPages) return null
      const page = await pdf.getPage(pageNum)
      const scale = 2.0
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise
      return canvas.toDataURL('image/jpeg', 0.95)
    } catch {
      return null
    }
  }

  /** 从单张图片识别营业执照 */
  const recognizeFromImage = async (base64: string): Promise<BusinessLicenseOCRData | null> => {
    const result: OCRResult = await recognizeBusinessLicense(base64)
    if (result.success && result.businessLicense) {
      const license = result.businessLicense
      return {
        creditCode: license.creditCode || '',
        companyName: license.companyName || '',
        legalPerson: license.legalPerson || '',
        registeredCapital: license.registeredCapital || '',
        address: license.address || '',
        businessScope: license.businessScope || '',
        establishDate: license.establishDate || '',
        expireDate: license.expireDate || ''
      }
    }
    return null
  }

  const processBusinessLicenseFile = useCallback(async (file: File): Promise<BusinessLicenseOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    // 确保 OCR 配置已加载
    await initializeBuiltInConfig()

    try {
      if (file.type === 'application/pdf') {
        // PDF：逐页识别，找到营业执照即返回
        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const totalPages = pdf.numPages
        showToast(`PDF 共 ${totalPages} 页，正在逐页识别...`, 'info')

        for (let i = 1; i <= totalPages; i++) {
          const base64 = await pdfPageToBase64(file, i)
          if (!base64) continue
          const data = await recognizeFromImage(base64)
          if (data && (data.creditCode || data.companyName)) {
            showToast(`在第 ${i} 页识别到营业执照`, 'success')
            return data
          }
        }
        showToast('未在 PDF 中识别到营业执照信息', 'error')
        return null
      } else {
        // 图片：直接识别
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        const data = await recognizeFromImage(base64)
        if (data) {
          showToast('营业执照识别成功', 'success')
          return data
        }
        showToast('营业执照识别失败', 'error')
        return null
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processBusinessLicenseFile, validateImageFile }
}

================
File: src/hooks/useCompanyQueryOCR.ts
================
import { useCallback } from 'react'
import { queryCompanyInfo, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface CompanyQueryData {
  creditCode: string
  companyName: string
  legalPerson: string
  registeredCapital: string
  address: string
  businessScope: string
  establishDate: string
  expireDate: string
}

interface UseCompanyQueryOCRReturn {
  queryCompany: (companyName: string) => Promise<CompanyQueryData | null>
}

export function useCompanyQueryOCR(): UseCompanyQueryOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const queryCompany = useCallback(async (companyName: string): Promise<CompanyQueryData | null> => {
    if (!companyName || companyName.length < 2) {
      showToast('请输入至少2个字符的公司名称', 'error')
      return null
    }

    try {
      showToast('正在查询企业信息...', 'info')

      const result: OCRResult = await queryCompanyInfo(companyName)

      if (!result.success || !result.businessLicense) {
        showToast(result.error || '企业查询失败', 'error')
        return null
      }

      const company = result.businessLicense

      showToast('企业信息查询成功', 'success')
      return {
        creditCode: company.creditCode || '',
        companyName: company.companyName || '',
        legalPerson: company.legalPerson || '',
        registeredCapital: company.registeredCapital || '',
        address: company.address || '',
        businessScope: company.businessScope || '',
        establishDate: company.establishDate || '',
        expireDate: company.expireDate || ''
      }
    } catch (err: any) {
      showToast(`查询失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast])

  return { queryCompany }
}

================
File: src/hooks/useConfirm.ts
================
import { useState, useCallback, ReactNode } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog/ConfirmDialog'

interface ConfirmOptions {
  title?: string
  content: ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  onConfirm: () => void
}

const INITIAL_STATE: ConfirmState = {
  isOpen: false,
  content: '',
  onConfirm: () => {},
}

/**
 * 声明式确认对话框 Hook
 * 替代原生 confirm()，返回 confirm 函数和 ConfirmDialog JSX
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm()
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ title: '确认删除', content: '确定要删除吗？', confirmVariant: 'danger' })
 *   if (ok) { // 执行删除 }
 * }
 *
 * return <>{ConfirmDialog}<button onClick={handleDelete}>删除</button></>
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true)
          setState(s => ({ ...s, isOpen: false }))
        },
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }))
  }, [])

  const ConfirmDialogElement = ConfirmDialog({
    isOpen: state.isOpen,
    onClose: handleClose,
    onConfirm: state.onConfirm,
    title: state.title,
    content: state.content,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    confirmVariant: state.confirmVariant,
  })

  return { confirm, ConfirmDialog: ConfirmDialogElement }
}

================
File: src/hooks/useCostLedgerBatches.ts
================
import { useState, useEffect, useCallback } from 'react'
import type { CostLedgerBatch } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function useCostLedgerBatches(projectId: number) {
  const [batches, setBatches] = useState<CostLedgerBatch[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const api = await getAPI()
    if (!api?.getCostLedgerBatches) return
    setLoading(true)
    const res = await api.getCostLedgerBatches(projectId)
    if (res?.success) setBatches(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const createBatch = useCallback(async (name: string) => {
    const api = await getAPI()
    const res = await api.createCostLedgerBatch(projectId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data!
    }
    return null
  }, [projectId])

  const deleteBatch = useCallback(async (batchId: number) => {
    const api = await getAPI()
    const res = await api.deleteCostLedgerBatch(projectId, batchId)
    if (res?.success) {
      setBatches(prev => prev.filter(b => b.id !== batchId))
      return true
    }
    return false
  }, [projectId])

  const copyBatch = useCallback(async (sourceBatchId: number, name: string) => {
    const api = await getAPI()
    const res = await api.copyCostLedgerBatch(projectId, sourceBatchId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data as CostLedgerBatch
    }
    return null
  }, [projectId])

  const renameBatch = useCallback(async (batchId: number, name: string) => {
    const api = await getAPI()
    const res = await api.renameCostLedgerBatch(projectId, batchId, name)
    if (res?.success) {
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, name } : b))
      return true
    }
    return false
  }, [projectId])

  return { batches, loading, reload: load, createBatch, copyBatch, renameBatch, deleteBatch }
}

================
File: src/hooks/useCostLedgerCategories.ts
================
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { COLORS } from '@/components/features/costLedger/costLedgerColors'

export function useCostLedgerCategories() {
  const [categories, setCategories] = useState<CostLedgerCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      if (!api?.getCostLedgerCategories) { setLoading(false); return }
      const res = await api.getCostLedgerCategories()
      if (res?.success) {
        setCategories(res.data || [])
        setError(null)
      } else {
        setError(res?.error || '加载失败')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const expenseCategories = useMemo(
    () => categories.filter(c => c.direction === 'expense'),
    [categories]
  )
  const incomeCategories = useMemo(
    () => categories.filter(c => c.direction === 'income'),
    [categories]
  )

  const getLabel = useCallback((code: string): string => {
    return categories.find(c => c.code === code)?.label || code
  }, [categories])

  const getColor = useCallback((code: string): string => {
    return categories.find(c => c.code === code)?.color || COLORS.finance
  }, [categories])

  const getByDirection = useCallback((dir: 'expense' | 'income') => {
    return categories.filter(c => c.direction === dir)
  }, [categories])

  return {
    categories, loading, error, refresh: load,
    expenseCategories, incomeCategories,
    getLabel, getColor, getByDirection,
  }
}

================
File: src/hooks/useCRUDBase.actions.ts
================
import { useCallback } from 'react'
import { handleError, type Result, type VoidResult } from '@/types'
import type { CRUDAPI } from './useCRUDBase.types'

export interface UseCRUDBaseActionsDeps<T extends { id: number }, CreateDTO, UpdateDTO> {
  api: CRUDAPI<T, CreateDTO, UpdateDTO>
  errorPrefix: string
  loadData: () => Promise<T[]>
  selectedItem: T | null
  setData: React.Dispatch<React.SetStateAction<T[]>>
  setSelectedItem: (item: T | null) => void
  setError: (e: string | null) => void
}

export function useCRUDBaseActions<T extends { id: number }, CreateDTO, UpdateDTO>(deps: UseCRUDBaseActionsDeps<T, CreateDTO, UpdateDTO>) {
  const { api, errorPrefix, loadData, selectedItem, setData, setSelectedItem, setError } = deps

  const create = useCallback(async (createData: CreateDTO): Promise<Result<{ id: number }>> => {
    if (!api.create) return { success: false, error: '不支持创建操作' }
    setError(null)
    try {
      const result = await api.create(createData)
      if (result.success) {
        await loadData()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      const errorMsg = result.error || `创建${errorPrefix}失败`
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      const errorMsg = appError.getUserMessage()
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [api, errorPrefix, loadData, setError])

  const update = useCallback(async (updateData: UpdateDTO): Promise<VoidResult> => {
    if (!api.update) return { success: false, error: '不支持更新操作' }
    setError(null)
    try {
      const result = await api.update(updateData)
      if (result.success) {
        await loadData()
        const updated = updateData as unknown as T
        if (selectedItem?.id === updated.id) setSelectedItem(updated)
        return { success: true }
      }
      const errorMsg = result.error || `更新${errorPrefix}失败`
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      const errorMsg = appError.getUserMessage()
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [api, errorPrefix, loadData, selectedItem, setSelectedItem, setError])

  const deleteItem = useCallback(async (id: number): Promise<VoidResult> => {
    if (!api.delete) return { success: false, error: '不支持删除操作' }
    setError(null)
    try {
      const result = await api.delete(id)
      if (result.success) {
        setData(prev => prev.filter(item => item.id !== id))
        if (selectedItem?.id === id) setSelectedItem(null)
        return { success: true }
      }
      const errorMsg = result.error || `删除${errorPrefix}失败`
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      const errorMsg = appError.getUserMessage()
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [api, errorPrefix, selectedItem, setData, setSelectedItem, setError])

  return { create, update, delete: deleteItem }
}

================
File: src/hooks/useCRUDBase.loaders.ts
================
import { useCallback } from 'react'
import { handleError } from '@/types'

export interface UseCRUDBaseLoadersDeps<T> {
  api: { getAll: () => Promise<{ success: boolean; data?: T | T[]; error?: string }> }
  errorPrefix: string
  mountedRef: React.MutableRefObject<boolean>
  setData: (d: T[]) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  onLoaded?: (data: T[]) => void
}

export function useCRUDBaseLoaders<T>(deps: UseCRUDBaseLoadersDeps<T>) {
  const { api, errorPrefix, mountedRef, setData, setLoading, setError, onLoaded } = deps

  const loadData = useCallback(async (): Promise<T[]> => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getAll()
      if (result.success && result.data) {
        const loadedData = Array.isArray(result.data) ? result.data : [result.data]
        if (mountedRef.current) {
          setData(loadedData)
          onLoaded?.(loadedData)
        }
        return loadedData
      }
      const errorMsg = result.error || `加载${errorPrefix}列表失败`
      if (mountedRef.current) setError(errorMsg)
      return []
    } catch (err) {
      const appError = handleError(err)
      const errorMsg = appError.getUserMessage()
      if (mountedRef.current) setError(errorMsg)
      return []
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [api, errorPrefix, mountedRef, onLoaded, setData, setError, setLoading])

  return { loadData }
}

================
File: src/hooks/useCRUDBase.ts
================
import { useState, useCallback, useEffect, useRef } from 'react'
import type { CRUDAPI, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase.types'
import { useCRUDBaseLoaders } from './useCRUDBase.loaders'
import { useCRUDBaseActions } from './useCRUDBase.actions'

export type { APIResponse, CRUDAPI, CRUDState, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase.types'

export function useCRUDBase<T extends { id: number }, CreateDTO = Partial<T>, UpdateDTO = T>(
  options: UseCRUDBaseOptions<T, CreateDTO, UpdateDTO>
): UseCRUDBaseReturn<T, CreateDTO, UpdateDTO> {
  const { api, initialData = [], autoLoad = true, errorPrefix = '操作', onLoaded } = options

  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const mountedRef = useRef(true)

  const { loadData } = useCRUDBaseLoaders<T>({
    api: { getAll: api.getAll }, errorPrefix, mountedRef, setData, setLoading, setError, onLoaded,
  })
  const { create, update, delete: deleteItem } = useCRUDBaseActions<T, CreateDTO, UpdateDTO>({
    api, errorPrefix, loadData, selectedItem, setData, setSelectedItem, setError,
  })

  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadData() }, [loadData])
  const updateData = useCallback((updater: (prev: T[]) => T[]) => { setData(updater) }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => { if (autoLoad) loadData() }, [autoLoad, loadData])

  return {
    data, loading, error, selectedItem,
    loadData, create, update, delete: deleteItem,
    setSelectedItem, clearError, refresh,
    setData, updateData,
  }
}

export function createCRUDHook<T extends { id: number }, CreateDTO = Partial<T>, UpdateDTO = T>(
  api: CRUDAPI<T, CreateDTO, UpdateDTO>,
  errorPrefix: string = '操作',
  autoLoad: boolean = true
) {
  return (options?: { initialData?: T[]; onLoaded?: (data: T[]) => void }) =>
    useCRUDBase({ api, errorPrefix, autoLoad, ...options })
}

================
File: src/hooks/useCRUDBase.types.ts
================
import type { Result, VoidResult } from '@/types'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface CRUDAPI<T, CreateDTO = Partial<T>, UpdateDTO = T> {
  getAll: () => Promise<APIResponse<T[]>>
  create?: (data: CreateDTO) => Promise<APIResponse<{ id: number }>>
  update?: (data: UpdateDTO) => Promise<APIResponse<void>>
  delete?: (id: number) => Promise<APIResponse<void>>
}

export interface CRUDState<T> {
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
}

export interface UseCRUDBaseOptions<T, CreateDTO, UpdateDTO> {
  api: CRUDAPI<T, CreateDTO, UpdateDTO>
  initialData?: T[]
  autoLoad?: boolean
  errorPrefix?: string
  onLoaded?: (data: T[]) => void
}

export interface UseCRUDBaseReturn<T, CreateDTO, UpdateDTO> {
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
  loadData: () => Promise<T[]>
  create: (data: CreateDTO) => Promise<Result<{ id: number }>>
  update: (item: UpdateDTO) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  setSelectedItem: (item: T | null) => void
  clearError: () => void
  refresh: () => Promise<void>
  setData: (data: T[]) => void
  updateData: (updater: (prev: T[]) => T[]) => void
}

================
File: src/hooks/useDataPath.ts
================
import { useState, useEffect, useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'

export function useDataPath(refresh?: () => void) {
  const [dataPath, setDataPath] = useState('')
  const [defaultPath, setDefaultPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const result = await (await getAPI()).getConfig()
      if (result.success && result.data) {
        setDataPath(result.data.dataPath)
        setDefaultPath(result.data.defaultPath)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleChangeDataPath = useCallback(async () => {
    setMessage(null)
    try {
      const api = await getAPI()
      const result = await api.setDataPath('__select_folder__')

      // 检查是否取消了选择
      if (result.success && (result as { cancelled?: boolean }).cancelled) {
        return
      }

      if (result.success) {
        // 显示迁移中状态
        setMigrating(true)
        // 等待一下让后端完成迁移
        await new Promise(resolve => setTimeout(resolve, 1000))

        const pathResult = await api.getDataPath()
        if (pathResult.success) {
          setDataPath(pathResult.data)
        }
        setMessage({ type: 'success', text: '数据路径已更新，重启应用后生效' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [refresh])

  const handleResetToDefault = useCallback(async () => {
    setMigrating(true); setMessage(null)
    try {
      const api = await getAPI()
      const result = await api.setDataPath(defaultPath)
      if (result.success) {
        const pathResult = await api.getDataPath()
        if (pathResult.success) {
          setDataPath(pathResult.data)
        }
        setMessage({ type: 'success', text: '已恢复为默认路径，重启应用后生效' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [defaultPath, refresh])

  return { dataPath, defaultPath, loading, migrating, message, handleChangeDataPath, handleResetToDefault }
}

================
File: src/hooks/useDataTableFilters.ts
================
import { useCallback } from 'react'

/**
 * useDataTableFilters — DataTable 筛选操作回调 (v0.75.0 拆分)
 *
 * 提供 handleFilterToggle / handleFilterSelectAll / handleFilterClear 三个回调,
 * 配合 useDataTableState 的 setFilters 使用.
 *
 * 注: filterable 列的 onChange 由 useDataTableState.handleFilterChange 处理
 * (接受 Set<string>). 这里三个回调是给 DataTable 内部 ColFilterDropdown UI 用的.
 */
export function useDataTableFilters(
  setFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>,
) {
  const handleFilterToggle = useCallback((colKey: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev }
      const set = new Set(next[colKey] || [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      next[colKey] = set
      return next
    })
  }, [setFilters])

  const handleFilterSelectAll = useCallback((colKey: string, allValues: string[]) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set(allValues),
    }))
  }, [setFilters])

  const handleFilterClear = useCallback((colKey: string) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set<string>(),
    }))
  }, [setFilters])

  return { handleFilterToggle, handleFilterSelectAll, handleFilterClear }
}

================
File: src/hooks/useDataTableState.ts
================
import { useState, useMemo, useCallback } from 'react'
import type { Column } from '../components/DataTable'

/**
 * useDataTableState — DataTable 内部状态逻辑 (sort / filter / pagination)
 *
 * v0.74.0 创建 + v0.75.0 接入 DataTable.tsx. 从 DataTable 函数体内提取出
 * sort / filter / pagination state + memos + handlers, 减 DataTable.tsx 行数.
 * 逻辑等价, 0 业务改动.
 */
export function useDataTableState<T>(
  data: T[],
  columns: Column<T>[],
  defaultSortKey: string | undefined,
  defaultSortOrder: 'asc' | 'desc',
  enablePagination: boolean,
  defaultPageSize: number,
  onSortChange?: (key: string | null, order: 'asc' | 'desc') => void,
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    return [...data].sort((a, b) => {
      if (col?.sorter) return sortOrder === 'asc' ? col.sorter(a, b) : col.sorter(b, a)
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [data, sortKey, sortOrder, columns])

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, s]) => s.size > 0)
    if (activeFilters.length === 0) return sortedData
    return sortedData.filter(item => {
      return activeFilters.every(([key, valueSet]) => {
        const col = columns.find(c => c.key === key)
        const accessor = col?.filterAccessor || ((i: T) => String((i as Record<string, unknown>)[key] ?? ''))
        const itemVal = accessor(item)
        return valueSet.has(itemVal)
      })
    })
  }, [sortedData, filters, columns])

  const paginatedData = useMemo(() => {
    if (!enablePagination || pageSize === 0) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize, enablePagination])

  const totalPages = enablePagination && pageSize > 0 ? Math.ceil(data.length / pageSize) : 1

  const handleSort = useCallback(
    (key: string) => {
      setSortKey(prev => {
        const nextKey = prev === key ? null : key
        const nextOrder = prev === key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
        setSortOrder(nextOrder)
        onSortChange?.(nextKey, nextOrder)
        return nextKey
      })
    },
    [sortOrder, onSortChange],
  )

  const handleFilterChange = useCallback((columnKey: string, values: Set<string>) => {
    setFilters(prev => {
      const next = { ...prev }
      if (values.size === 0) delete next[columnKey]
      else next[columnKey] = values
      return next
    })
    setCurrentPage(1)
  }, [])

  return {
    sortKey, sortOrder, currentPage, pageSize, filters,
    sortedData, filteredData, paginatedData, totalPages,
    setCurrentPage, setPageSize,
    setFilters,
    handleSort, handleFilterChange,
  }
}

================
File: src/hooks/useDebounce.ts
================
/**
 * useDebounce Hook
 *
 * 防抖 Hook
 */

import { useState, useEffect, useRef } from 'react'

export interface UseDebounceReturn<T> {
  value: T
  isPending: boolean
}

/**
 * 防抖值 Hook
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟时间 (毫秒，默认: 300)
 */
export function useDebounce<T>(value: T, delay = 300): UseDebounceReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastValueRef = useRef<T>(value)

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true)
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
      setIsPending(false)
      lastValueRef.current = value
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return { value: debouncedValue, isPending }
}

export type { UseDebouncedCallbackReturn } from './useDebouncedCallback'
export { useDebouncedCallback, useDebouncedFn } from './useDebouncedCallback'

================
File: src/hooks/useDebouncedCallback.ts
================
/**
 * useDebouncedCallback / useDebouncedFn
 *
 * 防抖回调变体 Hook
 */

import { useRef, useCallback, useEffect } from 'react'

export interface UseDebouncedCallbackReturn<TArgs extends unknown[]> {
  callback: (...args: TArgs) => void
  cancel: () => void
}

/**
 * 防抖回调 Hook
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
): UseDebouncedCallbackReturn<TArgs> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback((...args: TArgs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { callback: debouncedCallback, cancel }
}

/**
 * 立即执行防抖 Hook (第一次立即执行，后续防抖)
 */
export function useDebouncedFn<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
): (...args: TArgs) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastArgsRef = useRef<TArgs | null>(null)

  return useCallback((...args: TArgs) => {
    lastArgsRef.current = args

    if (timeoutRef.current) {
      return
    }

    callback(...args)

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      if (lastArgsRef.current) {
        callback(...lastArgsRef.current)
        lastArgsRef.current = null
      }
    }, delay)
  }, [callback, delay])
}

================
File: src/hooks/useDepartments.ts
================
import { useState, useCallback, useEffect } from 'react'
import { Department } from '../types/electron'
import { getAPI } from '@/services/api-adapter'

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const result = await (await getAPI()).getDepartments()
      if (result.success && result.data) setDepartments(result.data)
    } catch (e) {
      console.error('Failed to load departments:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (data: { name: string; managerId?: number; positions?: string[] }) => {
    const result = await (await getAPI()).createDepartment(data)
    if (result.success) await load()
    return result
  }

  const update = async (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => {
    const result = await (await getAPI()).updateDepartment(data)
    if (result.success) await load()
    return result
  }

  const remove = async (id: number) => {
    const result = await (await getAPI()).deleteDepartment(id)
    if (result.success) await load()
    return result
  }

  return { departments, loading, load, create, update, remove }
}

================
File: src/hooks/useFileUpload.helpers.ts
================
/**
 * 生成唯一 ID
 */
export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

/**
 * 获取文件类型
 */
export const getFileType = (file: File): 'pdf' | 'image' | 'word' | 'excel' => {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.includes('word') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word'
  if (file.type.includes('excel') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel'
  return 'image'
}

/**
 * 读取文件为 base64
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 验证文件类型和大小
 */
export const validateFileType = (file: File, accept: string[], maxSizeMB: number): string | null => {
  if (accept.length > 0 && !accept.includes(file.type)) {
    const acceptNames = accept.map(type => {
      if (type.includes('jpeg')) return 'JPG'
      if (type.includes('png')) return 'PNG'
      if (type.includes('webp')) return 'WebP'
      if (type.includes('pdf')) return 'PDF'
      if (type.includes('word')) return 'Word'
      if (type.includes('excel')) return 'Excel'
      return type
    })
    return `只能上传 ${acceptNames.join('、')} 格式的文件`
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return `文件大小不能超过 ${maxSizeMB}MB`
  }

  return null
}

================
File: src/hooks/useFileUpload.ts
================
import { useState, useCallback, useRef } from 'react'
import type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'
import { generateId, getFileType, readFileAsBase64, validateFileType } from './useFileUpload.helpers'
export type { UploadedFile, UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload.types'

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    accept = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMB = 10,
    multiple = false,
    onToast,
    onSuccess,
    onError
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    onToast?.(message, type)
  }, [onToast])

  const validateFile = useCallback((file: File): string | null => {
    return validateFileType(file, accept, maxSizeMB)
  }, [accept, maxSizeMB])

  const addFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      onError?.(error)
      return
    }

    setIsUploading(true)
    try {
      const dataUrl = await readFileAsBase64(file)
      
      const uploadedFile: UploadedFile = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        fileType: getFileType(file)
      }

      setFiles(prev => {
        if (multiple) {
          return [...prev, uploadedFile]
        }
        return [uploadedFile]
      })

      showToast(`文件 ${file.name} 上传成功`, 'success')
      onSuccess?.(uploadedFile)
    } catch (err) {
      console.error('文件读取失败:', err)
      showToast('文件读取失败', 'error')
      onError?.('文件读取失败')
    } finally {
      setIsUploading(false)
    }
  }, [validateFile, onSuccess, onError, multiple])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    showToast('文件已移除', 'info')
  }, [showToast])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      if (multiple) {
        Array.from(droppedFiles).forEach(addFile)
      } else {
        addFile(droppedFiles[0])
      }
    }
  }, [addFile, multiple])

  return {
    files,
    isDragging,
    isUploading,
    preview,
    addFile,
    removeFile,
    clearFiles,
    openFileDialog,
    setPreview,
    inputRef,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    },
    validateFile
  }
}

================
File: src/hooks/useFileUpload.types.ts
================
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  fileType: 'pdf' | 'image' | 'word' | 'excel'
}

export interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

export interface UseFileUploadOptions {
  accept?: string[]
  maxSizeMB?: number
  multiple?: boolean
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void
  onSuccess?: (file: UploadedFile) => void
  onError?: (error: string) => void
}

export interface UseFileUploadReturn {
  files: UploadedFile[]
  isDragging: boolean
  isUploading: boolean
  preview: { data: string; type: 'image' | 'pdf'; title: string } | null
  addFile: (file: File) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  openFileDialog: () => void
  setPreview: (preview: { data: string; type: 'image' | 'pdf'; title: string } | null) => void
  inputRef: React.RefObject<HTMLInputElement>
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  validateFile: (file: File) => string | null
}

================
File: src/hooks/useFilters.ts
================
/**
 * useFilters Hook
 * 
 * 筛选逻辑 Hook - 提供通用的筛选功能
 */

import { useState, useCallback, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useFilters 返回类型
 */
export interface UseFiltersReturn<T extends Record<string, unknown>> {
  // 数据
  filters: Partial<T>
  filteredItems: T[]
  
  // 操作方法
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void
  clearFilters: () => void
  clearFilter: <K extends keyof T>(key: K) => void
  
  // 状态
  hasActiveFilters: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 筛选 Hook
 * 
 * @param items - 原始数据数组
 * @param defaultFilters - 默认筛选条件 (可选)
 * 
 * @example
 * ```tsx
 * function ProductList() {
 *   const {
 *     filteredItems,
 *     filters,
 *     setFilter,
 *     clearFilters,
 *     hasActiveFilters
 *   } = useFilters(products)
 *   
 *   return (
 *     <>
 *       <FilterBar filters={filters} onFilterChange={setFilter} />
 *       {filteredItems.map(product => <ProductItem key={product.id} product={product} />)}
 *       {hasActiveFilters && <button onClick={clearFilters}>清除筛选</button>}
 *     </>
 *   )
 * }
 * ```
 */
export function useFilters<T extends Record<string, unknown>>(
  items: T[],
  defaultFilters?: Partial<T>
): UseFiltersReturn<T> {
  const [filters, setFilters] = useState<Partial<T>>(defaultFilters || {})

  // 过滤后的数据
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        // 空值不筛选
        if (value === undefined || value === null || value === '') {
          return true
        }
        
        const itemValue = item[key as keyof T]
        
        // 字符串模糊匹配
        if (typeof value === 'string' && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase())
        }
        
        // 数组包含检查
        if (Array.isArray(value)) {
          return value.includes(itemValue as never)
        }
        
        // 精确匹配
        return itemValue === value
      })
    })
  }, [items, filters])

  // 设置筛选条件
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // 清除所有筛选条件
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // 清除单个筛选条件
  const clearFilter = useCallback(<K extends keyof T>(key: K) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  // 是否有激活的筛选条件
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => 
      v !== undefined && v !== null && v !== ''
    )
  }, [filters])

  return {
    filters,
    filteredItems,
    setFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters,
  }
}

================
File: src/hooks/useFontFamily.ts
================
/**
 * 全局 UI 字体
 *
 * 固定使用思源黑体，无需切换
 */
import { useSyncExternalStore, useCallback } from 'react'

const HANS_STACK = "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif"

let _listeners: Set<() => void> = new Set()
function subscribe(listener: () => void) { _listeners.add(listener); return () => { _listeners.delete(listener) } }
function getSnapshot() { return 'hans' as const }
function getServerSnapshot() { return 'hans' as const }

if (typeof document !== 'undefined') {
  document.documentElement.style.fontFamily = HANS_STACK
  if (document.body) document.body.style.fontFamily = HANS_STACK
}

export function useFontFamily() {
  const font = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setFont = useCallback(() => {}, [])
  return { font, setFont }
}

================
File: src/hooks/useFontSize.ts
================
/**
 * 全局字号 hook
 *
 * 三档：small(14px) / medium(16px=默认) / large(18px)
 * 通过修改 :root 的 font-size 缩放所有 Tailwind rem 字号
 *
 * 模式与 useTheme 完全一致：useSyncExternalStore + 全局 store
 */
import { useCallback, useSyncExternalStore } from 'react'

export type FontSizeOption = 'small' | 'medium' | 'large'

const KEY = 'app-font-size'

function readSize(): FontSizeOption {
  if (typeof window === 'undefined') return 'medium'
  const stored = localStorage.getItem(KEY)
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored
  return 'medium'
}

let _size: FontSizeOption = readSize()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _size }
function getServerSnapshot(): FontSizeOption { return 'medium' }

function setGlobalSize(s: FontSizeOption) {
  if (s === _size) return
  _size = s
  localStorage.setItem(KEY, s)
  document.documentElement.setAttribute('data-font-size', s)
  _listeners.forEach(fn => fn())
}

// 模块加载时同步设置
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-font-size', _size)
}

export function useFontSize() {
  const size = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setSize = useCallback((s: FontSizeOption) => setGlobalSize(s), [])
  return { size, setSize }
}

================
File: src/hooks/useForm.ts
================
// useForm Hook - 表单状态管理
import { useState, useCallback, useMemo } from 'react'
import type { FieldError, FormErrors, TouchedFields, Validator, SubmitHandler, UseFormReturn } from './formTypes'

export type { FieldError, FormErrors, TouchedFields, Validator, SubmitHandler, UseFormReturn }

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/** 通用表单 Hook — initialValues + validate + onSubmit */
export function useForm<
  T extends Record<string, unknown>,
  R = void
>(options: {
  initialValues: T
  validate?: Validator<T>
  onSubmit: SubmitHandler<T, R>
}): UseFormReturn<T, R> {
  const { initialValues, validate, onSubmit } = options

  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [touched, setTouched] = useState<TouchedFields<T>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialValuesCopy] = useState(initialValues)

  // 是否有错误
  const isValid = useMemo(() => {
    return Object.values(errors).every(e => e === null || e === undefined)
  }, [errors])

  // 是否有修改
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesCopy)
  }, [values, initialValuesCopy])

  // 设置字段值
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }))
  }, [])

  // 处理变更
  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setFieldValue(field, value)
    
    // 如果有验证器，立即验证
    if (validate) {
      const newValues = { ...values, [field]: value }
      const newErrors = validate(newValues)
      setErrors(prev => ({ ...prev, [field]: newErrors[field] }))
    }
  }, [setFieldValue, validate, values])

  // 处理失焦
  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // 失焦时验证
    if (validate) {
      const newErrors = validate(values)
      setErrors(prev => ({ ...prev, [field]: newErrors[field] }))
    }
  }, [validate, values])

  // 获取字段属性 (用于快速绑定到表单元素)
  const getFieldProps = useCallback((field: keyof T) => {
    return {
      name: field,
      value: values[field] as T[keyof T],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target
        const value = target.type === 'checkbox' 
          ? (target as HTMLInputElement).checked 
          : target.value
        handleChange(field, value as T[keyof T])
      },
      onBlur: () => handleBlur(field),
    }
  }, [values, handleChange, handleBlur])

  // 处理提交
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // 标记所有字段为已触碰
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as TouchedFields<T>)
    setTouched(allTouched)

    // 验证
    if (validate) {
      const newErrors = validate(values)
      setErrors(newErrors)
      
      if (Object.values(newErrors).some(e => e !== null && e !== undefined)) {
        return // 有错误，不提交
      }
    }

    setIsSubmitting(true)
    
    try {
      const result = await onSubmit(values)
      
      if (result && 'success' in result && !result.success) {
        // 处理返回的错误
        setErrors({ _form: (result as { error: string }).error } as FormErrors<T>)
      }
    } catch (err) {
      setErrors({ _form: '提交失败，请重试' } as FormErrors<T>)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit])

  // 重置表单
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // 设置多个值
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setFieldValue,
    isValid,
    isDirty,
    getFieldProps,
  }
}

================
File: src/hooks/useGeneralReceiptOCR.ts
================
import { useCallback } from 'react'
import { recognizeGeneralReceipt, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface GeneralReceiptOCRData {
  text: string
  amount: number
  date: string
}

interface UseGeneralReceiptOCRReturn {
  processGeneralReceiptFile: (file: File) => Promise<GeneralReceiptOCRData | null>
  validateFile: (file: File) => string | null
}

export function useGeneralReceiptOCR(): UseGeneralReceiptOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  const processGeneralReceiptFile = useCallback(async (file: File): Promise<GeneralReceiptOCRData | null> => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url).toString()

        showToast('正在解析 PDF...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const page = await pdf.getPage(1)
        const scale = 2.0
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        base64 = canvas.toDataURL('image/jpeg', 0.95)
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      const result: OCRResult = await recognizeGeneralReceipt(base64)

      if (!result.success || !result.generalReceipt) {
        showToast(result.error || '通用票据识别失败', 'error')
        return null
      }

      const receipt = result.generalReceipt

      showToast('通用票据识别成功', 'success')
      return {
        text: receipt.text || '',
        amount: receipt.amount || 0,
        date: receipt.date || ''
      }
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile])

  return { processGeneralReceiptFile, validateFile }
}

================
File: src/hooks/useHoverScrollbar.helpers.ts
================
export interface ThumbParams {
  container: HTMLDivElement | null
  thumb: HTMLDivElement | null
  track: HTMLDivElement | null
}

export function updateThumb(params: ThumbParams): { thumbHeight: number } {
  const { container: el, thumb, track } = params
  if (!el || !thumb || !track) return { thumbHeight: 0 }

  const { scrollTop, scrollHeight, clientHeight } = el
  const isScrollable = scrollHeight > clientHeight + 2

  if (!isScrollable) {
    track.style.display = 'none'
    return { thumbHeight: 0 }
  }

  track.style.display = 'block'

  const thumbRatio = clientHeight / scrollHeight
  const thumbHeight = Math.max(30, clientHeight * thumbRatio)
  const maxScroll = scrollHeight - clientHeight
  const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (clientHeight - thumbHeight) : 0

  thumb.style.height = `${thumbHeight}px`
  thumb.style.top = `${thumbTop}px`

  return { thumbHeight }
}

export function applyExpandedStyle(track: HTMLDivElement, thumb: HTMLDivElement) {
  track.style.width = '16px'
  thumb.style.width = '12px'
  thumb.style.borderRadius = '6px'
  thumb.style.background = 'var(--scrollbar-thumb-hover, rgba(100, 116, 139, 0.7))'
}

export function applyCollapsedStyle(track: HTMLDivElement, thumb: HTMLDivElement) {
  track.style.width = '10px'
  thumb.style.width = '6px'
  thumb.style.borderRadius = '3px'
  thumb.style.background = 'var(--scrollbar-thumb, rgba(148, 163, 184, 0.5))'
}

export function isMouseNear(
  el: HTMLDivElement,
  mouseX: number,
  mouseY: number,
  threshold: number
): boolean {
  const rect = el.getBoundingClientRect()
  const distRight = rect.right - mouseX
  const inVertical = mouseY >= rect.top && mouseY <= rect.bottom
  return inVertical && distRight >= -5 && distRight <= threshold
}

================
File: src/hooks/useHoverScrollbar.ts
================
import { useEffect, useRef, useCallback } from 'react'
import { updateThumb, applyExpandedStyle, applyCollapsedStyle, isMouseNear } from './useHoverScrollbar.helpers'

interface HoverScrollbarReturn {
  containerRef: React.RefObject<HTMLDivElement>
  thumbRef: React.RefObject<HTMLDivElement>
  trackRef: React.RefObject<HTMLDivElement>
  hoveredRef: React.RefObject<boolean>
}

/**
 * 自定义悬浮滚动条 hook
 * 滚动条浮在内容上方，不占据布局空间，鼠标靠近时自动变大
 */
export function useHoverScrollbar(threshold = 15): HoverScrollbarReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef(false)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScrollTop = useRef(0)
  const thumbHeightRef = useRef(0)

  const syncThumb = useCallback(() => {
    const { thumbHeight } = updateThumb({
      container: containerRef.current,
      thumb: thumbRef.current,
      track: trackRef.current,
    })
    thumbHeightRef.current = thumbHeight
  }, [])

  // 鼠标靠近检测
  useEffect(() => {
    const el = containerRef.current
    const track = trackRef.current
    if (!el || !track) return
    let rafId = 0
    let isNear = false
    const expand = () => {
      if (isNear) return
      isNear = true
      hoveredRef.current = true
      const thumb = thumbRef.current
      if (thumb) applyExpandedStyle(track, thumb)
    }
    const shrink = () => {
      if (!isNear) return
      isNear = false
      hoveredRef.current = false
      const thumb = thumbRef.current
      if (thumb) applyCollapsedStyle(track, thumb)
    }
    const checkNear = (mouseX: number, mouseY: number) => {
      if (isDragging.current) return
      isMouseNear(el, mouseX, mouseY, threshold) ? expand() : shrink()
    }
    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => checkNear(e.clientX, e.clientY))
    }
    const onMouseLeave = () => { if (!isDragging.current) shrink() }
    document.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('mouseleave', onMouseLeave)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [threshold])

  // 滚动和拖拽事件
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => { if (!isDragging.current) syncThumb() }
    const onResize = () => syncThumb()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    syncThumb()
    const observer = new MutationObserver(() => requestAnimationFrame(syncThumb))
    observer.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [syncThumb])

  // 拖拽滚动条
  useEffect(() => {
    const thumb = thumbRef.current
    const el = containerRef.current
    if (!thumb || !el) return
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isDragging.current = true
      dragStartY.current = e.clientY
      dragStartScrollTop.current = el.scrollTop
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        const deltaY = e.clientY - dragStartY.current
        const { scrollHeight, clientHeight } = el
        const thumbHeight = thumbHeightRef.current
        const maxScroll = scrollHeight - clientHeight
        const scrollRatio = maxScroll / (clientHeight - thumbHeight)
        el.scrollTop = dragStartScrollTop.current + deltaY * scrollRatio
        syncThumb()
      }
      const onMouseUp = (e: MouseEvent) => {
        isDragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (!isMouseNear(el, e.clientX, e.clientY, threshold)) {
          const trk = trackRef.current
          const t = thumbRef.current
          if (trk && t) applyCollapsedStyle(trk, t)
          hoveredRef.current = false
        }
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
    thumb.addEventListener('mousedown', onMouseDown)
    return () => thumb.removeEventListener('mousedown', onMouseDown)
  }, [syncThumb, threshold])

  // 点击轨道跳转
  useEffect(() => {
    const track = trackRef.current
    const el = containerRef.current
    if (!track || !el) return
    const onClick = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const { scrollHeight, clientHeight } = el
      el.scrollTop = (clickY / rect.height) * (scrollHeight - clientHeight)
      syncThumb()
    }
    track.addEventListener('click', onClick)
    return () => track.removeEventListener('click', onClick)
  }, [syncThumb])

  return { containerRef, thumbRef, trackRef, hoveredRef }
}

================
File: src/hooks/useIdCardOCR.helpers.ts
================
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return '只能上传 JPG、PNG 或 WebP 格式的图片'
  }
  if (file.size > 5 * 1024 * 1024) {
    return '图片大小不能超过 5MB'
  }
  return null
}

export function validateFile(file: File, maxSizeMB: number = 10): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return '只能上传 JPG、PNG、WebP 或 PDF 格式的文件'
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `文件大小不能超过 ${maxSizeMB}MB`
  }
  return null
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

================
File: src/hooks/useIdCardOCR.ts
================
// useIdCardOCR Hook - 身份证 OCR 识别和文件处理
import { useState, useCallback, useEffect } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '@/services/ocr'
import { validateImageFile, validateFile, readFileAsBase64 } from './useIdCardOCR.helpers'

export type { Toast, OCRResult, UseIdCardOCRReturn } from './useIdCardOCR.types'
export { validateImageFile, validateFile, readFileAsBase64 } from './useIdCardOCR.helpers'

import type { OCRResult, UseIdCardOCRReturn } from './useIdCardOCR.types'

export function useIdCardOCR(options?: {
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}): UseIdCardOCRReturn {
  const { onOCRResult, onFileChange } = options || {}

  const [loading, setLoading] = useState(false)
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    const config = getOCRConfig()
    setOcrMode(config.provider)
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const processIdCardFile = useCallback(async (file: File): Promise<string | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    const base64 = await readFileAsBase64(file)
    onFileChange?.('idCardFront', base64)

    setLoading(true)
    try {
      const result = await recognizeIdCard(base64)

      if (result.success && result.idCard) {
        const { number, gender, birthDate, name, ethnicity, address } = result.idCard
        const ocrResult: OCRResult = { name, idCard: number, gender, birthDate, ethnicity, address }
        onOCRResult?.(ocrResult)

        const filledFields: string[] = []
        if (name) filledFields.push('姓名')
        if (number) filledFields.push('身份证号')
        if (gender) filledFields.push('性别')
        if (birthDate) filledFields.push('出生日期')
        if (ethnicity) filledFields.push('民族')
        if (address) filledFields.push('地址')

        if (filledFields.length > 0) {
          showToast(`识别成功！已自动填充：${filledFields.join('、')}`, 'success')
        } else {
          showToast('身份证识别成功', 'success')
        }

        return base64
      } else {
        const errorMsg = result.error || `未能识别到身份证（${ocrMode === 'baidu' ? '百度OCR' : '离线OCR'}）`
        showToast(errorMsg, 'error')
        return base64
      }
    } catch (error) {
      console.error('[OCR] 识别异常:', error)
      showToast('OCR识别服务暂不可用，请手动输入', 'error')
      return base64
    } finally {
      setLoading(false)
    }
  }, [validateImageFile, readFileAsBase64, onOCRResult, onFileChange, showToast, ocrMode])

  const processUploadFile = useCallback(async (file: File): Promise<{ base64: string; type: 'pdf' | 'image' } | null> => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      const base64 = await readFileAsBase64(file)
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
      return { base64, type: fileType }
    } catch (error) {
      console.error('[Upload] 文件读取异常:', error)
      showToast('文件读取失败', 'error')
      return null
    }
  }, [validateFile, readFileAsBase64, showToast])

  return {
    loading,
    ocrMode,
    toast,
    processIdCardFile,
    processUploadFile,
    validateImageFile,
    validateFile,
    showToast,
    readFileAsBase64,
    onOCRResult,
    onFileChange,
  }
}

================
File: src/hooks/useIdCardOCR.types.ts
================
import { OCRProvider } from '@/services/ocr'

export interface Toast { message: string; type: 'success' | 'error' | 'info' }

export interface OCRResult {
  name?: string
  idCard?: string
  gender?: string
  birthDate?: string
  ethnicity?: string
  address?: string
}

export interface UseIdCardOCRReturn {
  loading: boolean
  ocrMode: OCRProvider
  toast: Toast | null
  processIdCardFile: (file: File) => Promise<string | null>
  processUploadFile: (file: File) => Promise<{ base64: string; type: 'pdf' | 'image' } | null>
  validateImageFile: (file: File) => string | null
  validateFile: (file: File, maxSizeMB?: number) => string | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  readFileAsBase64: (file: File) => Promise<string>
  onOCRResult?: (result: OCRResult) => void
  onFileChange?: (field: string, base64: string) => void
}

================
File: src/hooks/useInventoryPage.ts
================
import { useState, useEffect, useCallback } from 'react'
import { InventoryItem, InventoryTransaction, Project, Partner, Material } from '../types/electron'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import { computeStats } from './useInventoryPageHelpers'

export function useInventoryPage(
  can: (perm: string) => boolean,
  refresh?: () => void,
) {
  const showToast = useToastStore(state => state.showToast)
  const [activeTab, setActiveTab] = useState<'items' | 'transactions' | 'projectMaterials'>('items')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [projectMaterials, setProjectMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const [showItemModal, setShowItemModal] = useState(false)
  const [showTransModal, setShowTransModal] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [transItem, setTransItem] = useState<InventoryItem | null>(null)

  const [filterCategory, setFilterCategory] = useState('')
  const [filterProject, setFilterProject] = useState<number | ''>('')

  const loadData = useCallback(async () => {
    try {
      const api = await getAPI()
      const [itemsRes, transRes, matRes, projRes, partRes] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryTransactions(),
        api.getMaterials(),
        api.getProjects(),
        api.getPartners(),
      ])
      if (itemsRes.success && itemsRes.data) setItems(itemsRes.data)
      if (transRes.success && transRes.data) setTransactions(transRes.data)
      if (matRes.success && matRes.data) setProjectMaterials(matRes.data)
      if (projRes.success && projRes.data) setProjects(projRes.data)
      if (partRes.success && partRes.data) setPartners(partRes.data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Item CRUD
  const handleItemSubmit = useCallback(async (data: any) => {
    try {
      if (editingItem) {
        await (await getAPI()).updateInventoryItem({ ...editingItem, ...data })
        logUpdate('inventoryItems', data.name, editingItem.id, { before: editingItem, after: data })
      } else {
        const result = await (await getAPI()).createInventoryItem(data)
        logCreate('inventoryItems', data.name, result?.data?.id, data)
      }
      loadData(); setShowItemModal(false); setEditingItem(null)
      refresh?.()
    } catch (error) { console.error('保存物料失败:', error) }
  }, [editingItem, loadData, refresh])

  const handleEditItem = useCallback((item: InventoryItem) => {
    setEditingItem(item); setShowItemModal(true)
  }, [])

  const handleDeleteItem = useCallback(async (id: number) => {
    if (!can('inventory:delete')) { showToast('您没有删除物料的权限', 'error'); return }
    if (!confirm('确定要删除这个物料吗？')) return
    const target = items.find(i => i.id === id)
    try {
      await (await getAPI()).deleteInventoryItem(id)
      logDelete('inventoryItems', target?.name || '物料', id, { name: target?.name, category: target?.category })
      loadData(); refresh?.()
    } catch (error) { console.error('删除物料失败:', error) }
  }, [can, items, loadData, refresh, showToast])

  const handleTransItem = useCallback((item: InventoryItem) => {
    setTransItem(item); setShowTransModal(true)
  }, [])

  // Transaction
  const handleTransSubmit = useCallback(async (data: any) => {
    const selectedItem = items.find(i => i.id === data.itemId)
    try {
      await (await getAPI()).createInventoryTransaction(data)
      if (selectedItem) {
        const qty = data.type === 'purchase' || data.type === 'return_in' ? data.quantity : -data.quantity
        await (await getAPI()).updateInventoryItem({ ...selectedItem, currentStock: selectedItem.currentStock + qty })
      }
      logCreate('inventoryTransactions', `${selectedItem?.name || '物料'} - ${data.type === 'purchase' || data.type === 'return_in' ? '入库' : '出库'}`, data.itemId, data)
      loadData(); setShowTransModal(false); setTransItem(null)
      refresh?.()
    } catch (error) { console.error('保存出入库记录失败:', error) }
  }, [items, loadData, refresh])

  // Material CRUD
  const handleMaterialSubmit = useCallback(async (data: any) => {
    try {
      if (editingMaterial) {
        await (await getAPI()).updateMaterial({ ...editingMaterial, ...data })
        logUpdate('materials', data.name, editingMaterial.id, { before: editingMaterial, after: data })
      } else {
        const result = await (await getAPI()).createMaterial(data)
        logCreate('materials', data.name, result?.data?.id, data)
      }
      loadData(); setShowMaterialModal(false); setEditingMaterial(null)
      refresh?.()
    } catch (error) { console.error('保存材料失败:', error) }
  }, [editingMaterial, loadData, refresh])

  const handleEditMaterial = useCallback((material: Material) => {
    setEditingMaterial(material); setShowMaterialModal(true)
  }, [])

  const handleDeleteMaterial = useCallback(async (id: number) => {
    if (!can('inventory:delete')) { showToast('您没有删除材料的权限', 'error'); return }
    if (!confirm('确定要删除这个材料吗？')) return
    const target = projectMaterials.find(m => m.id === id)
    try {
      await (await getAPI()).deleteMaterial(id)
      logDelete('materials', target?.name || '材料', id, { name: target?.name, category: target?.category })
      loadData(); refresh?.()
    } catch (error) { console.error('删除材料失败:', error) }
  }, [can, projectMaterials, loadData, refresh, showToast])

  // Stats
  const stats = computeStats(items, projectMaterials, filterProject)

  return {
    activeTab, setActiveTab, loading,
    items, transactions, projectMaterials, projects, partners,
    showItemModal, setShowItemModal, showTransModal, setShowTransModal,
    showMaterialModal, setShowMaterialModal,
    editingItem, setEditingItem, editingMaterial, setEditingMaterial, transItem, setTransItem,
    filterCategory, setFilterCategory, filterProject, setFilterProject,
    handleItemSubmit, handleEditItem, handleDeleteItem, handleTransItem,
    handleTransSubmit,
    handleMaterialSubmit, handleEditMaterial, handleDeleteMaterial,
    stats,
  }
}

================
File: src/hooks/useInventoryPageHelpers.ts
================
import { InventoryItem, Material } from '../types/electron'

export function computeStats(
  items: InventoryItem[],
  projectMaterials: Material[],
  filterProject: number | '',
) {
  return {
    totalItems: items.length,
    lowStock: items.filter(i => i.currentStock <= i.minStock).length,
    totalValue: items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0),
    totalMaterials: projectMaterials.filter(m => !filterProject || m.projectId === filterProject).length,
  }
}

================
File: src/hooks/useInvoiceOCR.ts
================
import { useCallback } from 'react'
import { recognizeInvoice, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString()

interface InvoiceOCRData {
  invoiceNo: string
  invoiceCode: string
  issueDate: string
  invoiceType: string   // 发票类型
  amount: number        // 价税合计
  priceAmount: number   // 不含税金额
  taxAmount: number     // 税额
  taxRate: number       // 税率
  sellerName: string
  purchaserName: string
  itemName: string      // 商品/服务名称
  remarks: string       // 备注
}

interface UseInvoiceOCRReturn {
  processInvoiceFile: (file: File) => Promise<InvoiceOCRData | null>
  validateFile: (file: File) => string | null
}

export function useInvoiceOCR(): UseInvoiceOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP/PDF 格式'
    }
    if (file.size > 10 * 1024 * 1024) {
      return '文件大小不能超过 10MB'
    }
    return null
  }, [])

  // PDF 转图片（取第一页）
  const pdfToImage = useCallback(async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1) // 取第一页

    const scale = 2.0 // 提高分辨率
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise

    // 转为 base64
    return canvas.toDataURL('image/jpeg', 0.95)
  }, [])

  const processInvoiceFile = useCallback(async (file: File): Promise<InvoiceOCRData | null> => {
    // 验证文件
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      let base64: string

      if (file.type === 'application/pdf') {
        // PDF 转图片
        showToast('正在解析 PDF...', 'info')
        base64 = await pdfToImage(file)
      } else {
        // 图片直接读取
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      // 调用 OCR 识别
      const result: OCRResult = await recognizeInvoice(base64)

      if (!result.success || !result.invoice) {
        const errorMsg = result.error || '发票识别失败'
        console.error('[发票OCR] 识别失败:', errorMsg)
        showToast(errorMsg, 'error')
        return null
      }

      const inv = result.invoice

      // 映射到表单数据
      const data: InvoiceOCRData = {
        invoiceNo: inv.invoiceNum || '',
        invoiceCode: inv.invoiceCode || '',
        issueDate: inv.invoiceDate || '',
        invoiceType: inv.invoiceType || '',
        amount: inv.totalAmount || 0,
        priceAmount: inv.amountWithoutTax || 0,
        taxAmount: inv.totalTax || 0,
        taxRate: inv.taxRate || 0,
        sellerName: inv.sellerName || '',
        purchaserName: inv.purchaserName || '',
        itemName: inv.itemName || '',
        remarks: inv.remarks || ''
      }

      showToast('发票识别成功', 'success')
      return data
    } catch (err: any) {
      showToast(`识别失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast, validateFile, pdfToImage])

  return { processInvoiceFile, validateFile }
}

================
File: src/hooks/useInvoicePage.helpers.ts
================
import { FILE_CATEGORIES } from '../services/fileService'

export const getInvoiceCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.INVOICE_OUT : FILE_CATEGORIES.INVOICE_IN

export const getPaymentCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.PAYMENT_IN : FILE_CATEGORIES.PAYMENT_OUT

================
File: src/hooks/useInvoicePage.invoice.ts
================
import { useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { processFileFields, guessFileExt, readUploadedFile } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logUpdate, logDelete, logApprove } from '../utils/audit'
import { getInvoiceCategory } from './useInvoicePage.helpers'
import type { Invoice, InvoiceStatus, Project } from '../types/electron'

export interface UseInvoicePageInvoiceActionsDeps {
  projects: Project[]
  invoices: Invoice[]
  editingInvoice: Invoice | null
  originalFileRef: React.MutableRefObject<Record<number, string>>
  loadData: () => Promise<void>
  refresh?: () => void
  setEditingInvoice: (v: Invoice | null) => void
  setShowInvoiceModal: (b: boolean) => void
}

export function useInvoicePageInvoiceActions(deps: UseInvoicePageInvoiceActionsDeps) {
  const { projects, invoices, editingInvoice, originalFileRef, loadData, refresh, setEditingInvoice, setShowInvoiceModal } = deps
  const showToast = useToastStore(state => state.showToast)

  const handleEditInvoice = useCallback(async (invoice: Invoice) => {
    if (invoice.fileUrl && !invoice.fileUrl.startsWith('data:')) {
      originalFileRef.current[invoice.id] = invoice.fileUrl
      const cat = getInvoiceCategory(invoice.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, invoice.fileUrl, invoice.projectName)
      if (url) invoice.fileUrl = url
    }
    setEditingInvoice(invoice)
    setShowInvoiceModal(true)
  }, [originalFileRef, setEditingInvoice, setShowInvoiceModal])

  const handleSubmitInvoice = useCallback(async (data: any) => {
    try {
      let fileData = data
      if (editingInvoice && data.fileUrl?.startsWith('data:')) {
        const orig = originalFileRef.current[editingInvoice.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      const invCat = getInvoiceCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [{
        field: 'fileUrl', category: invCat.category, subCategory: invCat.subCategory,
        getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.name || '发票'}_${data.amount}元${guessFileExt(data.fileUrl, data.fileType)}`,
      }], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const submitData = { ...processed, sellerId: processed.sellerId || 0, buyerId: processed.buyerId || 0, projectId: processed.projectId || 0, contractId: processed.contractId || 0, status: 'issued' as InvoiceStatus }

      if (editingInvoice) {
        await (await getAPI()).updateInvoice({ ...editingInvoice, ...submitData })
        logUpdate('invoices', `发票: ${submitData.name}`, editingInvoice.id, { before: editingInvoice, after: submitData })
      } else {
        const result = await (await getAPI()).createInvoice(submitData)
        if (result.success && result.data) logCreate('invoices', `发票: ${submitData.name}`, result.data.id, submitData)
      }
      loadData(); setShowInvoiceModal(false); setEditingInvoice(null)
      refresh?.()
      showToast(editingInvoice ? '发票更新成功' : '发票创建成功', 'success')
    } catch (error: any) {
      console.error('保存发票失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingInvoice, projects, loadData, refresh, showToast, originalFileRef, setEditingInvoice, setShowInvoiceModal])

  const handleDeleteInvoice = useCallback(async (id: number) => {
    if (!confirm('确定要删除这张发票吗？')) return
    try {
      const target = invoices.find(i => i.id === id)
      await (await getAPI()).deleteInvoice(id)
      logDelete('invoices', target?.name ? `发票: ${target.name}` : '发票', id)
      loadData(); refresh?.()
    } catch (error) { console.error('删除发票失败:', error) }
  }, [invoices, loadData, refresh])

  const handleStatusChange = useCallback(async (id: number, status: InvoiceStatus) => {
    try {
      await (await getAPI()).updateInvoiceStatus(id, status)
      const invoice = invoices.find(i => i.id === id)
      logApprove('invoices', invoice?.name || '发票', id, true, `状态变更为: ${status}`)
      loadData(); refresh?.()
    } catch (error) { console.error('更新状态失败:', error) }
  }, [invoices, loadData, refresh])

  return { handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange }
}

================
File: src/hooks/useInvoicePage.payment.ts
================
import { useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { processFileFields, guessFileExt, readUploadedFile } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { getPaymentCategory } from './useInvoicePage.helpers'
import type { PaymentRecord, Project } from '../types/electron'

export interface UseInvoicePagePaymentActionsDeps {
  projects: Project[]
  paymentRecords: PaymentRecord[]
  editingPayment: PaymentRecord | null
  originalPaymentFileRef: React.MutableRefObject<Record<number, string>>
  loadData: () => Promise<void>
  setEditingPayment: (v: PaymentRecord | null) => void
  setShowPaymentModal: (b: boolean) => void
}

export function useInvoicePagePaymentActions(deps: UseInvoicePagePaymentActionsDeps) {
  const { projects, paymentRecords, editingPayment, originalPaymentFileRef, loadData, setEditingPayment, setShowPaymentModal } = deps
  const showToast = useToastStore(state => state.showToast)

  const handleEditPayment = useCallback(async (record: PaymentRecord) => {
    if (record.fileUrl && !record.fileUrl.startsWith('data:')) {
      originalPaymentFileRef.current[record.id] = record.fileUrl
      const cat = getPaymentCategory(record.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, record.fileUrl, record.projectName)
      if (url) record.fileUrl = url
    }
    setEditingPayment(record)
    setShowPaymentModal(true)
  }, [originalPaymentFileRef, setEditingPayment, setShowPaymentModal])

  const handleSubmitPayment = useCallback(async (data: any) => {
    try {
      let fileData = data
      if (editingPayment && data.fileUrl?.startsWith('data:')) {
        const orig = originalPaymentFileRef.current[editingPayment.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      const payCat = getPaymentCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [{
        field: 'fileUrl', category: payCat.category, subCategory: payCat.subCategory,
        getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.amount}元_${data.recordDate || ''}${guessFileExt(data.fileUrl, data.fileType)}`,
      }], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const resolvedProjectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null
      const submitData = { ...processed, projectId: processed.projectId || 0, partnerId: processed.partnerId || 0, contractId: processed.contractId || 0, projectName: resolvedProjectName }

      if (editingPayment) {
        await (await getAPI()).updatePaymentRecord({ ...editingPayment, ...submitData } as PaymentRecord)
        logUpdate('invoices', `回款/付款记录: ${submitData.amount}元`, editingPayment.id, { before: editingPayment, after: submitData })
      } else {
        const result = await (await getAPI()).createPaymentRecord(submitData as PaymentRecord)
        if (result.success && result.data) logCreate('invoices', `回款/付款记录: ${submitData.amount}元`, result.data.id, submitData)
      }
      loadData(); setShowPaymentModal(false); setEditingPayment(null)
      showToast(editingPayment ? '记录更新成功' : '记录创建成功', 'success')
    } catch (error: any) {
      console.error('保存回款/付款记录失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingPayment, projects, loadData, showToast, originalPaymentFileRef, setEditingPayment, setShowPaymentModal])

  const handleDeletePayment = useCallback(async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      const target = paymentRecords.find(p => p.id === id)
      await (await getAPI()).deletePaymentRecord(id)
      logDelete('invoices', target ? `回款/付款记录: ${target.amount}元` : '回款/付款记录', id)
      loadData()
    } catch (error) { console.error('删除收款记录失败:', error) }
  }, [paymentRecords, loadData])

  return { handleEditPayment, handleSubmitPayment, handleDeletePayment }
}

================
File: src/hooks/useInvoicePage.ts
================
import { useState, useEffect, useRef, useCallback } from 'react'
import { Invoice, InvoiceType, InvoiceStatus, Project, Partner, PaymentRecord, IncomeContract, ExpenseContract } from '../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useInvoicePageLoaders } from './useInvoicePageLoaders'
import { useInvoicePageInvoiceActions } from './useInvoicePage.invoice'
import { useInvoicePagePaymentActions } from './useInvoicePage.payment'
import { getAPI } from '@/services/api-adapter'

export function useInvoicePage(refresh?: () => void) {
  const showToast = useToastStore(state => state.showToast)
  const originalFileRef = useRef<Record<number, string>>({})
  const originalPaymentFileRef = useRef<Record<number, string>>({})

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [contracts, setContracts] = useState<{ income: IncomeContract[]; expense: ExpenseContract[] }>({ income: [], expense: [] })
  const [loading, setLoading] = useState(true)

  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const [previewFile, setPreviewFile] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)

  const [filterType, setFilterType] = useState<InvoiceType | ''>('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('')
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterPaymentType, setFilterPaymentType] = useState<InvoiceType | ''>('')
  const [filterPaymentProject, setFilterPaymentProject] = useState<number | ''>('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const { loadData } = useInvoicePageLoaders({
    setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading,
  })
  useEffect(() => { loadData() }, [loadData])

  const { handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange } = useInvoicePageInvoiceActions({
    projects, invoices, editingInvoice, originalFileRef, loadData, refresh,
    setEditingInvoice, setShowInvoiceModal,
  })

  const { handleEditPayment, handleSubmitPayment, handleDeletePayment } = useInvoicePagePaymentActions({
    projects, paymentRecords, editingPayment, originalPaymentFileRef, loadData,
    setEditingPayment, setShowPaymentModal,
  })

  // Preview
  const handlePreview = useCallback(async (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => {
    let url = data
    let detectedType = type
    if (data && !data.startsWith('data:') && category && subCategory) {
      const effectiveProjectName = projectName || (projectId ? projects.find(p => p.id === projectId)?.name : null)
      const result = await (await getAPI()).readFile({ category, subCategory, fileName: data, projectName: effectiveProjectName || null })
      if (result.success && result.data) {
        url = result.data.dataUrl
        if (result.data.mimeType?.startsWith('image/')) detectedType = 'image'
        else if (result.data.mimeType?.includes('pdf')) detectedType = 'pdf'
      } else {
        showToast('文件读取失败，文件可能已被移动或删除', 'error')
        return
      }
    }
    if (data?.startsWith('data:') && type !== 'pdf' && data.includes('application/pdf')) detectedType = 'pdf'
    setPreviewFile({ data: url, type: detectedType, title })
  }, [projects, showToast])

  // Filters
  const filteredInvoices = invoices.filter(inv => {
    if (filterType && inv.type !== filterType) return false
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterProject && inv.projectId !== filterProject) return false
    if (filterDateStart && inv.issueDate < filterDateStart) return false
    if (filterDateEnd && inv.issueDate > filterDateEnd) return false
    return true
  })

  const filteredPayments = paymentRecords.filter(p => {
    if (filterPaymentType && p.type !== filterPaymentType) return false
    if (filterDateStart && p.recordDate < filterDateStart) return false
    if (filterDateEnd && p.recordDate > filterDateEnd) return false
    if (filterPaymentProject && p.projectId !== filterPaymentProject) return false
    return true
  })

  return {
    // State
    activeTab, setActiveTab, loading,
    invoices, paymentRecords, projects, partners, contracts,
    // Modal state
    showInvoiceModal, setShowInvoiceModal, showPaymentModal, setShowPaymentModal,
    editingInvoice, setEditingInvoice, editingPayment, setEditingPayment,
    previewFile, setPreviewFile,
    // Filter state
    filterType, setFilterType, filterStatus, setFilterStatus, filterProject, setFilterProject,
    filterPaymentType, setFilterPaymentType, filterPaymentProject, setFilterPaymentProject,
    filterDateStart, setFilterDateStart, filterDateEnd, setFilterDateEnd,
    // Handlers
    handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange,
    handleEditPayment, handleSubmitPayment, handleDeletePayment,
    handlePreview,
    // Filtered data
    filteredInvoices, filteredPayments,
  }
}

================
File: src/hooks/useInvoicePageLoaders.ts
================
import { useCallback } from 'react'
import { getAPI } from '../services/api-adapter'
import type { Invoice, PaymentRecord, Project, Partner, IncomeContract, ExpenseContract } from '../types/electron'

export interface UseInvoicePageLoadersDeps {
  setInvoices: (d: Invoice[]) => void
  setPaymentRecords: (d: PaymentRecord[]) => void
  setProjects: (d: Project[]) => void
  setPartners: (d: Partner[]) => void
  setContracts: (updater: (prev: { income: IncomeContract[]; expense: ExpenseContract[] }) => { income: IncomeContract[]; expense: ExpenseContract[] }) => void
  setLoading: (b: boolean) => void
}

export function useInvoicePageLoaders(deps: UseInvoicePageLoadersDeps) {
  const { setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading } = deps

  const loadData = useCallback(async () => {
    const safeLoad = async <T>(loader: () => Promise<{ success: boolean; data?: T }>, setter: (data: T) => void) => {
      try {
        const res = await loader()
        if (res.success && res.data) setter(res.data)
      } catch (err) {
        console.error('加载数据失败:', err)
      }
    }

    await Promise.all([
      safeLoad(async () => (await getAPI()).getInvoices(), setInvoices),
      safeLoad(async () => (await getAPI()).getPaymentRecords(), setPaymentRecords),
      safeLoad(async () => (await getAPI()).getProjects(), setProjects),
      safeLoad(async () => (await getAPI()).getPartners(), setPartners),
      safeLoad(async () => (await getAPI()).getIncomeContracts(), (d: IncomeContract[]) => setContracts(prev => ({ ...prev, income: d || [] }))),
      safeLoad(async () => (await getAPI()).getExpenseContracts(), (d: ExpenseContract[]) => setContracts(prev => ({ ...prev, expense: d || [] }))),
    ])
    setLoading(false)
  }, [setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading])

  return { loadData }
}

================
File: src/hooks/useInvoices.ts
================
import { useState, useCallback, useEffect } from 'react'
import type { Invoice, InvoiceType, InvoiceStatus } from '@/types'
import { handleError, type Result, type VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { InvoiceFilters, UseInvoicesReturn } from './useInvoices.types'
import { filterInvoices } from './useInvoices.utils'
export type { InvoiceFilters, UseInvoicesReturn }
export function useInvoices(filters?: InvoiceFilters): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const loadInvoices = useCallback(async (type?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await (await getAPI()).getInvoices(undefined, type as InvoiceType)
      if (result.success && result.data) {
        setInvoices(filterInvoices(result.data, filters))
      } else {
        setError(result.error || '加载发票列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [filters?.type, filters?.status, filters?.projectId, filters?.searchTerm])

  const create = useCallback(async (data: Partial<Invoice>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createInvoice(data as Invoice)
      if (result.success) {
        await loadInvoices()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      const errorMsg = result.error || '创建发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices])

  const update = useCallback(async (invoice: Invoice): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updateInvoice(invoice)
      if (result.success) {
        await loadInvoices()
        if (selectedInvoice?.id === invoice.id) {
          setSelectedInvoice(invoice)
        }
        return { success: true }
      }
      const errorMsg = result.error || '更新发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices, selectedInvoice])

  const deleteInvoice = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deleteInvoice(id)
      if (result.success) {
        setInvoices(prev => prev.filter(i => i.id !== id))
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null)
        }
        return { success: true }
      }
      const errorMsg = result.error || '删除发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedInvoice])

  const updateStatus = useCallback(async (id: number, status: InvoiceStatus): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updateInvoiceStatus(id, status)
      if (result.success) {
        await loadInvoices()
        return { success: true }
      }
      const errorMsg = result.error || '更新发票状态失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices])

  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadInvoices() }, [loadInvoices])
  const setSelectedItem = useCallback((item: Invoice | null) => { setSelectedInvoice(item) }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  return {
    data: invoices,
    loading,
    error,
    selectedItem: selectedInvoice,
    loadData: loadInvoices,
    create,
    update,
    delete: deleteInvoice,
    updateStatus,
    setSelectedItem,
    clearError,
    refresh,
  }
}

export { usePaymentRecords, type UsePaymentRecordsReturn } from './usePaymentRecords'

================
File: src/hooks/useInvoices.types.ts
================
import type { Invoice, InvoiceType, InvoiceStatus } from '@/types'
import type { Result, VoidResult } from '@/types'

/**
 * 发票筛选条件
 */
export interface InvoiceFilters {
  type?: InvoiceType
  status?: InvoiceStatus
  projectId?: number
  searchTerm?: string
}

/**
 * useInvoices 返回类型
 */
export interface UseInvoicesReturn {
  data: Invoice[]
  loading: boolean
  error: string | null
  selectedItem: Invoice | null

  loadData: (type?: string) => Promise<void>
  create: (data: Partial<Invoice>) => Promise<Result<{ id: number }>>
  update: (invoice: Invoice) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  updateStatus: (id: number, status: InvoiceStatus) => Promise<VoidResult>

  setSelectedItem: (item: Invoice | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

================
File: src/hooks/useInvoices.utils.ts
================
import type { Invoice } from '@/types'
import type { InvoiceFilters } from './useInvoices.types'

export function filterInvoices(data: Invoice[], filters?: InvoiceFilters): Invoice[] {
  let filtered = data
  if (filters?.type) {
    filtered = filtered.filter((i: Invoice) => i.type === filters.type)
  }
  if (filters?.status) {
    filtered = filtered.filter((i: Invoice) => i.status === filters.status)
  }
  if (filters?.projectId) {
    filtered = filtered.filter((i: Invoice) => i.projectId === filters.projectId)
  }
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    filtered = filtered.filter((i: Invoice) =>
      i.name?.toLowerCase().includes(term) ||
      i.invoiceNo?.toLowerCase().includes(term) ||
      i.sellerName?.toLowerCase().includes(term) ||
      i.buyerName?.toLowerCase().includes(term)
    )
  }
  return filtered
}

================
File: src/hooks/useLocalStorage.storage.ts
================
/**
 * localStorage Storage Helpers
 * 
 * 本地存储底层操作函数
 */

/**
 * 从 localStorage 获取值
 */
export function getItem<T>(key: string, defaultValue: T): { value: T; error: Error | null } {
  try {
    const item = localStorage.getItem(key)
    
    if (item === null) {
      return { value: defaultValue, error: null }
    }
    
    const parsed = JSON.parse(item) as T
    return { value: parsed, error: null }
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return { value: defaultValue, error: error as Error }
  }
}

/**
 * 设置值到 localStorage
 */
export function setItem<T>(key: string, value: T): Error | null {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
    return error as Error
  }
}

/**
 * 从 localStorage 移除值
 */
export function removeItem(key: string): Error | null {
  try {
    localStorage.removeItem(key)
    return null
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
    return error as Error
  }
}

================
File: src/hooks/useLocalStorage.ts
================
/**
 * useLocalStorage Hook
 */

import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem, removeItem } from './useLocalStorage.storage'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useLocalStorage 返回类型
 */
export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T) => void
  removeValue: () => void
  error: Error | null
}

/**
 * LocalStorage Hook
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValueState] = useState<T>(() => {
    return getItem(key, defaultValue).value
  })
  const [_error, setError] = useState<Error | null>(null)

  const setValue = useCallback((newValue: T) => {
    const err = setItem(key, newValue)
    if (err) {
      setError(err)
      return
    }
    setValueState(newValue)
    setError(null)
  }, [key])

  const removeValue = useCallback(() => {
    const err = removeItem(key)
    if (err) {
      setError(err)
      return
    }
    setValueState(defaultValue)
    setError(null)
  }, [key, defaultValue])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as T
          setValueState(newValue)
        } catch {
          // 忽略解析错误
        }
      } else if (e.key === key && e.newValue === null) {
        setValueState(defaultValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, defaultValue])

  return [value, setValue, removeValue]
}

/**
 * LocalStorage 同步 Hook (返回对象形式)
 */
export function useLocalStorageSync<T>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T> {
  const [value, setValue, removeValue] = useLocalStorage(key, defaultValue)
  const [error, setError] = useState<Error | null>(null)

  const setValueWithError = useCallback((newValue: T) => {
    const err = setItem(key, newValue)
    if (err) {
      setError(err)
    } else {
      setError(null)
    }
    setValue(newValue)
  }, [key, setValue])

  const removeValueWithError = useCallback(() => {
    const err = removeItem(key)
    if (err) {
      setError(err)
    } else {
      setError(null)
    }
    removeValue()
  }, [key, removeValue])

  return {
    value,
    setValue: setValueWithError,
    removeValue: removeValueWithError,
    error,
  }
}

================
File: src/hooks/useMaskedValue.ts
================
import { useMask } from '../contexts/MaskContext'
import { maskIdCard, maskPhone, maskBankAccount, maskEmail } from '../utils/mask'

/**
 * useMaskedFn — v0.74.0 PII Mask toggle 响应式 helper (工厂版)
 *
 * 在组件顶层调用一次, 返回一个 (type, value) => string 的函数.
 * 之后在 .map / render callback 中调用这个函数即可 (不违反 hook 规则).
 *
 * 用法:
 *   function MyList() {
 *     const masked = useMaskedFn()
 *     return data.map(item => <span>{masked('idCard', item.idCard)}</span>)
 *   }
 *
 * masked=true (默认, 保守) -> 返回脱敏值
 * masked=false (用户 toggle 后) -> 返回原值
 *
 * 注: 后端 Common.MaskIdCard 已经做了一层响应层 mask, 这里再次 mask 是 double-mask.
 * 这是 v0.72.0 既有行为, 本 helper 不改.
 */
export function useMaskedFn(): (
  type: 'idCard' | 'phone' | 'bankAccount' | 'email',
  value: string | null | undefined
) => string {
  const { masked } = useMask()
  return (type, value) => {
    if (!value) return ''
    if (!masked) return String(value)
    switch (type) {
      case 'idCard': return maskIdCard(String(value))
      case 'phone': return maskPhone(String(value))
      case 'bankAccount': return maskBankAccount(String(value))
      case 'email': return maskEmail(String(value))
    }
  }
}

================
File: src/hooks/useMembers.ts
================
/**
 * useMembers Hook
 *
 * 人员管理 Hook - 提供人员管理相关的状态和操作
 */

import { useState, useCallback, useEffect } from 'react'
import type { Member } from '@/types'
import type { MemberFilters, UseMembersReturn } from './useMembers.types'
import { useMembersLoaders } from './useMembersLoaders'
import { useMembersActions } from './useMembersActions'

export type { MemberFilters, CreateMemberDTO, UpdateMemberDTO, UseMembersReturn } from './useMembers.types'

/**
 * 人员管理 Hook
 *
 * @param filters - 可选的初始筛选条件
 *
 * @example
 * ```tsx
 * function StaffManagement() {
 *   const {
 *     data: members,
 *     loading,
 *     create,
 *     update,
 *     delete: deleteMember,
 *     refresh
 *   } = useMembers({ type: 'staff' })
 *
 *   // 使用...
 * }
 * ```
 */
export function useMembers(filters?: MemberFilters): UseMembersReturn {
  // 状态
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const { loadMembers } = useMembersLoaders({
    setLoading,
    setError,
    setMembers,
  }, filters)

  const { create, update, deleteMember } = useMembersActions({
    setError,
    setMembers,
    loadMembers,
    selectedMember,
    setSelectedMember,
  })

  // 辅助方法
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadMembers()
  }, [loadMembers])

  const setSelectedItem = useCallback((item: Member | null) => {
    setSelectedMember(item)
  }, [])

  // 初始加载
  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  return {
    data: members,
    loading,
    error,
    selectedItem: selectedMember,
    loadData: loadMembers,
    create,
    update,
    delete: deleteMember,
    setSelectedItem,
    clearError,
    refresh,
  }
}

================
File: src/hooks/useMembers.types.ts
================
import type { Member, MemberType, WorkerType, WorkerStatus } from '@/types'
import type { Result, VoidResult } from '@/types'

// 成员筛选条件
export interface MemberFilters {
  type?: MemberType
  workerType?: WorkerType
  status?: WorkerStatus
  projectId?: number
  teamId?: number
  searchTerm?: string
}

// 创建成员 DTO
export type CreateMemberDTO = Partial<Omit<Member, 'id' | 'createdAt'>>

// 更新成员 DTO
export type UpdateMemberDTO = Partial<Omit<Member, 'createdAt'>>

// useMembers 返回类型
export interface UseMembersReturn {
  // 数据状态
  data: Member[]
  loading: boolean
  error: string | null
  selectedItem: Member | null

  // 操作方法
  loadData: () => Promise<void>
  create: (data: CreateMemberDTO) => Promise<Result<{ id: number }>>
  update: (member: Member) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>

  // 辅助方法
  setSelectedItem: (item: Member | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

================
File: src/hooks/useMembersActions.ts
================
import { useCallback } from 'react'
import type { Member } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { CreateMemberDTO } from './useMembers.types'

interface UseMembersActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  loadMembers: () => Promise<void>
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
}

export function useMembersActions(deps: UseMembersActionsDeps) {
  const { setError, setMembers, loadMembers, selectedMember, setSelectedMember } = deps

  // 创建成员
  const create = useCallback(async (data: CreateMemberDTO): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createMember(data as Member)

      if (result.success) {
        await loadMembers()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadMembers, setError])

  // 更新成员
  const update = useCallback(async (member: Member): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateMember(member)

      if (result.success) {
        await loadMembers()
        if (selectedMember?.id === member.id) {
          setSelectedMember(member)
        }
        return { success: true }
      }

      const errorMsg = result.error || '更新人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadMembers, selectedMember, setSelectedMember, setError])

  // 删除成员
  const deleteMember = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteMember(id)

      if (result.success) {
        setMembers(prev => prev.filter(m => m.id !== id))
        if (selectedMember?.id === id) {
          setSelectedMember(null)
        }
        return { success: true }
      }

      const errorMsg = result.error || '删除人员失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedMember, setMembers, setSelectedMember, setError])

  return { create, update, deleteMember }
}

================
File: src/hooks/useMembersBatch.ts
================
import { useCallback } from 'react'
import type { ProjectWorker } from '../types/electron'
import { useToastStore } from '../store/toastStore'
import { getAPI } from '../services/api-adapter'

interface UseMembersBatchOptions {
  loadData: () => Promise<void>
}

export function useMembersBatch({ loadData }: UseMembersBatchOptions) {
  const showToast = useToastStore(state => state.showToast)

  const handleBatchAddWorkers = useCallback(async (entries: Partial<ProjectWorker>[]) => {
    try {
      const result = await (await getAPI()).batchCreateProjectWorkers(entries)
      if (result.success) {
        showToast(`成功添加 ${entries.length} 名工人`, 'success')
        loadData()
      } else {
        showToast(result.error || '添加失败', 'error')
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '添加失败', 'error')
    }
  }, [showToast, loadData])

  return { handleBatchAddWorkers }
}

================
File: src/hooks/useMembersEditHandlers.ts
================
import { useCallback } from 'react'
import type { Member } from '../types/electron'
import { memberToStaffForm, memberToWorkerForm } from '../components/features/members'

interface UseMembersEditHandlersProps {
  setEditingStaff: React.Dispatch<React.SetStateAction<Member | null>>
  setEditingWorker: React.Dispatch<React.SetStateAction<Member | null>>
  setShowStaffModal: React.Dispatch<React.SetStateAction<boolean>>
  setShowWorkerModal: React.Dispatch<React.SetStateAction<boolean>>
  originalMemberFileRef: React.MutableRefObject<Record<number, Record<string, string>>>
}

export function useMembersEditHandlers({
  setEditingStaff, setEditingWorker,
  setShowStaffModal, setShowWorkerModal,
  originalMemberFileRef,
}: UseMembersEditHandlersProps) {
  const handleEditStaff = useCallback((staff: Member) => {
    setEditingStaff(staff)
    const formData = memberToStaffForm(staff)
    originalMemberFileRef.current[staff.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
      const val = (formData as unknown as Record<string, unknown>)[key]
      if (val && typeof val === 'string' && !val.startsWith('data:')) originalMemberFileRef.current[staff.id][key] = val
    }
    setShowStaffModal(true)
  }, [setEditingStaff, setShowStaffModal, originalMemberFileRef])

  const handleEditWorker = useCallback((worker: Member) => {
    setEditingWorker(worker)
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as unknown as Record<string, unknown>)[key]
      if (val && typeof val === 'string' && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    setShowWorkerModal(true)
  }, [setEditingWorker, setShowWorkerModal, originalMemberFileRef])

  return { handleEditStaff, handleEditWorker }
}

================
File: src/hooks/useMembersLoadData.ts
================
import { useCallback } from 'react'
import type { Member, Project, WorkerTeam } from '../types/electron'
import { getAPI } from '../services/api-adapter'
import { useToastStore } from '../store/toastStore'

interface UseMembersLoadDataProps {
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  setWorkerTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export function useMembersLoadData({
  setMembers, setProjects, setWorkerTeams, setLoading,
}: UseMembersLoadDataProps) {
  const showToast = useToastStore(state => state.showToast)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const api = await getAPI()
      const [membersRes, projectsRes, teamsRes] = await Promise.allSettled([
        api.getMembers(),
        api.getProjects(),
        api.getWorkerTeams(),
      ])
      const get = <T,>(r: PromiseSettledResult<unknown>): T[] => {
        if (r.status !== 'fulfilled') return [];
        const val = r.value as { success?: boolean; data?: unknown };
        return (val?.success && Array.isArray(val.data) ? val.data : []) as T[];
      }
      const membersData = get<Member>(membersRes)
      const projectsData = get<Project>(projectsRes)
      const teamsData = get<WorkerTeam>(teamsRes)

      const membersWithRelations = membersData.map((m: Member) => {
        if (m.memberType === 'worker' && m.teamId) {
          const team = teamsData.find((t: WorkerTeam) => t.id === m.teamId)
          return { ...m, teamName: team?.name, projectId: team?.projectId, projectName: team?.projectName }
        }
        return m
      })
      setMembers(membersWithRelations)
      setProjects(projectsData)

      const teamsWithRelations = teamsData.map((t: WorkerTeam) => {
        const project = projectsData.find((p: Project) => p.id === t.projectId)
        const leader = membersData.find((m: Member) => m.id === t.leaderId)
        return { ...t, projectName: project?.name, leaderName: leader?.name }
      })
      setWorkerTeams(teamsWithRelations)
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, setMembers, setProjects, setWorkerTeams, setLoading])

  return { loadData }
}

================
File: src/hooks/useMembersLoaders.ts
================
import { useCallback } from 'react'
import type { Member } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { MemberFilters } from './useMembers.types'

interface UseMembersLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
}

export function useMembersLoaders(deps: UseMembersLoadersDeps, filters?: MemberFilters) {
  const { setLoading, setError, setMembers } = deps

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getMembers()

      if (result.success && result.data) {
        // 应用筛选条件
        let filteredData = result.data as Member[]

        if (filters?.type) {
          filteredData = filteredData.filter(m => m.memberType === filters.type)
        }

        if (filters?.workerType) {
          filteredData = filteredData.filter(m => m.workerType === filters.workerType)
        }

        if (filters?.status) {
          filteredData = filteredData.filter(m => m.status === filters.status)
        }

        if (filters?.projectId) {
          filteredData = filteredData.filter(m => m.projectId === filters.projectId)
        }

        if (filters?.teamId) {
          filteredData = filteredData.filter(m => m.teamId === filters.teamId)
        }

        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter(m =>
            m.name.toLowerCase().includes(term) ||
            m.phone?.toLowerCase().includes(term) ||
            m.idCard?.includes(term)
          )
        }

        setMembers(filteredData)
      } else {
        setError(result.error || '加载人员列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [
    filters?.type,
    filters?.workerType,
    filters?.status,
    filters?.projectId,
    filters?.teamId,
    filters?.searchTerm,
    setLoading,
    setError,
    setMembers,
  ])

  return { loadMembers }
}

================
File: src/hooks/useMembersOCR.ts
================
import { useCallback } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import { StaffFormData, WorkerFormData } from '../components/features/members'

interface UseMembersOCROptions {
  setOcrMode: React.Dispatch<React.SetStateAction<OCRProvider>>
}

export function useMembersOCR({ setOcrMode }: UseMembersOCROptions) {
  const showToast = useToastStore(state => state.showToast)

  const processFileForIdCard = useCallback(async (file: File, field: 'idCardFront' | 'idCardBack', setFormData: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, [field]: base64 }))
      setOcrMode(getOCRConfig().provider)
      if (field === 'idCardFront') {
        try {
          const result = await recognizeIdCard(base64)
          if (result.success && result.idCard) {
            const { number, gender, birthDate, name, ethnicity, address } = result.idCard
            setFormData(prev => ({
              ...prev,
              name: name || prev.name,
              gender: gender || prev.gender,
              ethnicity: ethnicity || prev.ethnicity,
              birthDate: birthDate || prev.birthDate,
              idCard: number || prev.idCard,
              idCardAddress: address || prev.idCardAddress
            }))
            const filled: string[] = []
            if (name) filled.push('姓名')
            if (number) filled.push('身份证号')
            if (gender) filled.push('性别')
            if (birthDate) filled.push('出生日期')
            if (ethnicity) filled.push('民族')
            if (address) filled.push('地址')
            showToast(filled.length > 0 ? `识别成功！已自动填充：${filled.join('、')}` : '身份证识别成功', 'success')
          }
        } catch (err) { console.error('OCR 识别失败:', err) }
      }
    }
    reader.readAsDataURL(file)
  }, [showToast, setOcrMode])

  const processUploadFile = useCallback(async (file: File, field: string, setFormData: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setFormData((prev: StaffFormData | WorkerFormData) => ({
        ...prev,
        [field]: e.target?.result as string,
        [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image'
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  return { processFileForIdCard, processUploadFile }
}

================
File: src/hooks/useMembersPage.ts
================
import { useEffect, useCallback } from 'react'
import type { Member } from '../types/electron'
import { getOCRConfig } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import { defaultStaffFormData, defaultWorkerFormData } from '../components/features/members'
import type { StaffFormData, WorkerFormData } from '../components/features/members'
import { useMemberOperations } from '../components/features/members/useMemberOperations'
import { useTeamOps } from '../components/features/members/useTeamOps'
import { useLaborOperations } from '../components/features/labor/hooks/useLaborOperations'
import { useMemberPasteHandler } from '../components/features/members/useMemberPasteHandler'
import { useWorkerImport } from '../components/features/members/useWorkerImport'
import { useMembersOCR } from './useMembersOCR'
import { useMembersBatch } from './useMembersBatch'
import { useMembersState } from './useMembersState'
import { useMembersLoadData } from './useMembersLoadData'
import { useMembersEditHandlers } from './useMembersEditHandlers'

interface UseMembersPageProps {
  refresh?: () => void
}

export function useMembersPage({ refresh }: UseMembersPageProps) {
  const state = useMembersState()
  const {
    members, setMembers, projects, setProjects, workerTeams, setWorkerTeams,
    setLoading, setOcrMode,
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    setShowDetailModal, selectedMember, setSelectedMember,
    filterStatus, setFilterStatus,
    staffFormData, setStaffFormData, workerFormData, setWorkerFormData,
    originalMemberFileRef, fileInputRef,
    showWorkerPicker, setShowWorkerPicker,
    pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    activeTab, setActiveTab, loading,
  } = state

  const showToast = useToastStore(s => s.showToast)
  const { loadData } = useMembersLoadData({ setMembers, setProjects, setWorkerTeams, setLoading })
  const { handleBatchAddWorkers } = useMembersBatch({ loadData })
  const { processFileForIdCard, processUploadFile } = useMembersOCR({ setOcrMode })

  const resetStaffForm = useCallback(() => {
    state.setStaffFormData(defaultStaffFormData); state.setEditingStaff(null)
  }, [])
  const resetWorkerForm = useCallback(() => {
    state.setWorkerFormData(defaultWorkerFormData); state.setEditingWorker(null)
  }, [])

  const { handleEditStaff, handleEditWorker } = useMembersEditHandlers({
    setEditingStaff: state.setEditingStaff, setEditingWorker: state.setEditingWorker,
    setShowStaffModal, setShowWorkerModal, originalMemberFileRef,
  })

  useEffect(() => {
    loadData()
    setOcrMode(getOCRConfig().provider)
  }, [refresh, loadData, setOcrMode])

  useMemberPasteHandler({
    visible: showWorkerModal || showStaffModal,
    type: showWorkerModal ? 'worker' : 'staff',
    staffFormData, workerFormData, setStaffFormData, setWorkerFormData,
    processIdCardFile: processFileForIdCard,
    processUploadFile: processUploadFile as (file: File, field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>) => Promise<void>,
  })

  const { handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker } = useMemberOperations({
    editingStaff, editingWorker, projects, originalMemberFileRef, loadData, showToast,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false); resetStaffForm(); resetWorkerForm() },
  })

  const { handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange } = useLaborOperations({
    members, projects, workerTeams, loadData, editingWorker,
    onSuccess: () => { setShowStaffModal(false); setShowWorkerModal(false) },
  })

  const { handleCreateTeam, handleUpdateTeam, handleDeleteTeam } = useTeamOps({ workerTeams, loadData, showToast })
  const handleMemberClick = useCallback((m: Member) => { setSelectedMember(m); setShowDetailModal(true) }, [])

  const existingIdCards = new Set(members.filter(m => m.memberType === 'worker' && m.idCard).map(m => m.idCard!))
  const {
    importState, progress, result, phase, error: importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, reset: resetImport,
  } = useWorkerImport(existingIdCards)

  const staffMembers = members.filter(m => m.memberType !== 'worker' || !m.memberType)
  const workerMembers = members.filter(m => m.memberType === 'worker')
  const filteredStaff = staffMembers.filter(m => filterStatus === 'all' || (m.status || 'active') === filterStatus)
  const filteredWorkers = workerMembers.filter(w => filterStatus === 'all' || (w.status || 'active') === filterStatus)

  return {
    activeTab, setActiveTab,
    members, projects, workerTeams, loading, loadData,
    showStaffModal, setShowStaffModal, editingStaff,
    showWorkerModal, setShowWorkerModal, editingWorker,
    showDetailModal: state.showDetailModal, setShowDetailModal, selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker, pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    filterStatus, setFilterStatus,
    staffFormData, setStaffFormData, workerFormData, setWorkerFormData,
    resetStaffForm, resetWorkerForm,
    processFileForIdCard, processUploadFile, fileInputRef,
    handleBatchAddWorkers, handleMemberClick, handleEditStaff, handleEditWorker,
    handleDeleteMember, handleFileModified, handleSubmitStaff, handleSubmitWorker,
    handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange,
    handleCreateTeam, handleUpdateTeam, handleDeleteTeam,
    importState, progress, result, phase, importError,
    parseFile, switchSheet, setHeaderRow, setMapping, getConfidence,
    executeImport, saveCurrentMappingAsPreset, resetImport,
    staffMembers, workerMembers, filteredStaff, filteredWorkers,
  }
}

================
File: src/hooks/useMembersState.ts
================
import { useState, useRef } from 'react'
import type { Member, Project, WorkerTeam, WorkerStatus } from '../types/electron'
import type { OCRProvider } from '../services/ocr'
import {
  StaffFormData, WorkerFormData, defaultStaffFormData, defaultWorkerFormData,
} from '../components/features/members'

export interface MembersState {
  activeTab: 'staff' | 'worker'
  setActiveTab: React.Dispatch<React.SetStateAction<'staff' | 'worker'>>
  members: Member[]
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  workerTeams: WorkerTeam[]
  setWorkerTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  showStaffModal: boolean
  setShowStaffModal: React.Dispatch<React.SetStateAction<boolean>>
  editingStaff: Member | null
  setEditingStaff: React.Dispatch<React.SetStateAction<Member | null>>
  showWorkerModal: boolean
  setShowWorkerModal: React.Dispatch<React.SetStateAction<boolean>>
  editingWorker: Member | null
  setEditingWorker: React.Dispatch<React.SetStateAction<Member | null>>
  showDetailModal: boolean
  setShowDetailModal: React.Dispatch<React.SetStateAction<boolean>>
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
  showWorkerPicker: boolean
  setShowWorkerPicker: React.Dispatch<React.SetStateAction<boolean>>
  pickerProjectId: number
  setPickerProjectId: React.Dispatch<React.SetStateAction<number>>
  pickerExistingWorkerIds: Set<number>
  setPickerExistingWorkerIds: React.Dispatch<React.SetStateAction<Set<number>>>
  filterStatus: WorkerStatus | 'all'
  setFilterStatus: React.Dispatch<React.SetStateAction<WorkerStatus | 'all'>>
  ocrMode: OCRProvider
  setOcrMode: React.Dispatch<React.SetStateAction<OCRProvider>>
  originalMemberFileRef: React.MutableRefObject<Record<number, Record<string, string>>>
  staffFormData: StaffFormData
  setStaffFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  workerFormData: WorkerFormData
  setWorkerFormData: React.Dispatch<React.SetStateAction<WorkerFormData>>
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function useMembersState(): MembersState {
  const [activeTab, setActiveTab] = useState<'staff' | 'worker'>('staff')
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Member | null>(null)
  const [showWorkerModal, setShowWorkerModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Member | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerProjectId, setPickerProjectId] = useState<number>(0)
  const [pickerExistingWorkerIds, setPickerExistingWorkerIds] = useState<Set<number>>(new Set())
  const [filterStatus, setFilterStatus] = useState<WorkerStatus | 'all'>('all')
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  return {
    activeTab, setActiveTab,
    members, setMembers,
    projects, setProjects,
    workerTeams, setWorkerTeams,
    loading, setLoading,
    showStaffModal, setShowStaffModal,
    editingStaff, setEditingStaff,
    showWorkerModal, setShowWorkerModal,
    editingWorker, setEditingWorker,
    showDetailModal, setShowDetailModal,
    selectedMember, setSelectedMember,
    showWorkerPicker, setShowWorkerPicker,
    pickerProjectId, setPickerProjectId,
    pickerExistingWorkerIds, setPickerExistingWorkerIds,
    filterStatus, setFilterStatus,
    ocrMode, setOcrMode,
    originalMemberFileRef,
    staffFormData, setStaffFormData,
    workerFormData, setWorkerFormData,
    fileInputRef,
  }
}

================
File: src/hooks/useModal.ts
================
/**
 * useModal & useConfirm Hooks
 * 
 * 弹窗状态管理 Hooks
 */

import { useState, useCallback } from 'react'

export type { ConfirmConfig, UseConfirmReturn } from './useModalHelpers'
export { useConfirm } from './useModalHelpers'

// ═══════════════════════════════════════════════════════════════════════════════
// useModal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useModal 返回类型
 */
export interface UseModalReturn<T = unknown> {
  isOpen: boolean
  modalData: T | undefined
  open: (data?: T) => void
  close: () => void
  toggle: () => void
}

/**
 * 弹窗 Hook
 * 
 * @param initialData - 可选的初始数据
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModal<{ id: number; name: string }>()
 *   
 *   const handleEdit = (item) => {
 *     modal.open(item) // 打开弹窗并传递数据
 *   }
 *   
 *   return (
 *     <>
 *       <button onClick={() => modal.open()}>打开</button>
 *       {modal.isOpen && (
 *         <Modal onClose={modal.close}>
 *           编辑: {modal.modalData?.name}
 *         </Modal>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function useModal<T = unknown>(initialData?: T): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [modalData, setModalData] = useState<T | undefined>(initialData)

  const open = useCallback((data?: T) => {
    setModalData(data)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // 如果需要在关闭时清除数据，可以取消下面的注释
    // setModalData(undefined)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    modalData,
    open,
    close,
    toggle,
  }
}

================
File: src/hooks/useModalHelpers.ts
================
/**
 * useConfirm Hook — extracted from useModal.ts
 */

import { useState, useCallback } from 'react'

export interface ConfirmConfig {
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel?: () => void
}

export interface UseConfirmReturn {
  isOpen: boolean
  config: ConfirmConfig | null
  confirm: (config: ConfirmConfig) => void
  handleConfirm: () => void
  handleCancel: () => void
  close: () => void
}

export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmConfig | null>(null)

  const confirm = useCallback((newConfig: ConfirmConfig) => {
    setConfig(newConfig)
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    config?.onConfirm()
    setIsOpen(false)
    setConfig(null)
  }, [config])

  const handleCancel = useCallback(() => {
    config?.onCancel?.()
    setIsOpen(false)
    setConfig(null)
  }, [config])

  const close = useCallback(() => {
    setIsOpen(false)
    setConfig(null)
  }, [])

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
    close,
  }
}

================
File: src/hooks/useOCRConfig.ts
================
import { useState, useEffect, useCallback } from 'react'
import { OCRConfig, OCRProvider, setOCRConfig, getOCRConfig, checkOCRStatus, getProviderName, saveOCRConfig, initialConfig, initializeBuiltInConfig } from '../services/ocr'

export function useOCRConfig() {
  const [ocrConfig, setOcrConfigState] = useState<OCRConfig>(initialConfig)
  const [ocrStatus, setOcrStatus] = useState<{ online: boolean; provider: OCRProvider; configured: boolean } | null>(null)
  const [testingOCR, setTestingOCR] = useState(false)
  const [ocrMessage, setOcrMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadOCRConfig = useCallback(async () => {
    try {
      const saved = getOCRConfig()
      setOcrConfigState(saved)
      const status = await checkOCRStatus()
      setOcrStatus(status)
    } catch (error) {
      console.error('加载OCR配置失败:', error)
    }
  }, [])

  useEffect(() => {
    initializeBuiltInConfig().then(() => { loadOCRConfig() })
  }, [loadOCRConfig])

  const handleSaveOCRConfig = useCallback(() => {
    saveOCRConfig(ocrConfig)
    setOCRConfig(ocrConfig)
    setOcrMessage({ type: 'success', text: 'OCR配置已保存' })
    loadOCRConfig()
  }, [ocrConfig, loadOCRConfig])

  const handleTestOCR = useCallback(async () => {
    setTestingOCR(true); setOcrMessage(null)
    try {
      const status = await checkOCRStatus()
      if (status.online) {
        setOcrMessage({ type: 'success', text: `网络连接正常，当前使用${getProviderName(status.provider)}识别` })
      } else {
        setOcrMessage({ type: 'info', text: '当前离线，将使用本地Tesseract.js识别' })
      }
    } catch (error: unknown) {
      setOcrMessage({ type: 'error', text: `检测失败 ${error instanceof Error ? error.message : '未知错误'}` })
    } finally {
      setTestingOCR(false)
    }
  }, [])

  return { ocrConfig, setOcrConfig: setOcrConfigState, ocrStatus, testingOCR, ocrMessage, handleSaveOCRConfig, handleTestOCR }
}

================
File: src/hooks/usePagination.ts
================
/**
 * usePagination Hook
 * 
 * 分页逻辑 Hook - 提供通用的分页功能
 */

import { useState, useCallback, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分页信息
 */
export interface PaginationInfo {
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * usePagination 返回类型
 */
export interface UsePaginationReturn<T> extends PaginationInfo {
  // 数据
  items: T[]
  
  // 分页操作
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  firstPage: () => void
  lastPage: () => void
  changePageSize: (newSize: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分页 Hook
 * 
 * @param items - 原始数据数组
 * @param defaultPageSize - 默认每页数量 (默认: 10)
 * 
 * @example
 * ```tsx
 * function UserList() {
 *   const { items, currentPage, totalPages, goToPage } = usePagination(users, 20)
 *   
 *   return (
 *     <>
 *       {items.map(user => <UserItem key={user.id} user={user} />)}
 *       <Pagination current={currentPage} total={totalPages} onChange={goToPage} />
 *     </>
 *   )
 * }
 * ```
 */
export function usePagination<T>(items: T[], defaultPageSize = 10): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 计算分页数据
  const paginationData = useMemo<PaginationInfo>(() => {
    const totalItems = items.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
    const startIndex = (safeCurrentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)

    return {
      totalItems,
      totalPages,
      currentPage: safeCurrentPage,
      pageSize,
      startIndex,
      endIndex,
      hasNextPage: safeCurrentPage < totalPages,
      hasPrevPage: safeCurrentPage > 1,
    }
  }, [items, currentPage, pageSize])

  // 分页操作
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, paginationData.totalPages))
    setCurrentPage(targetPage)
  }, [paginationData.totalPages])

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const firstPage = useCallback(() => {
    goToPage(1)
  }, [goToPage])

  const lastPage = useCallback(() => {
    goToPage(paginationData.totalPages)
  }, [goToPage, paginationData.totalPages])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // 重置到第一页
  }, [])

  return {
    items: items.slice(paginationData.startIndex, paginationData.endIndex),
    ...paginationData,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
  }
}

================
File: src/hooks/usePartners.ts
================
/**
 * usePartners Hook
 * 
 * 合作单位管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { Partner } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { createPartnerCrud } from './usePartnersHelpers'

// ═══════════════════════════════════════════════════════════════════════════════
// usePartners Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsePartnersReturn {
  data: Partner[]
  loading: boolean
  error: string | null
  selectedItem: Partner | null
  
  loadData: () => Promise<void>
  create: (data: Partial<Partner>) => Promise<import('@/types').Result<{ id: number }>>
  update: (partner: Partner) => Promise<import('@/types').VoidResult>
  delete: (id: number) => Promise<import('@/types').VoidResult>
  
  setSelectedItem: (item: Partner | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function usePartners(): UsePartnersReturn {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)

  const loadPartners = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await (await getAPI()).getPartners()
      
      if (result.success && result.data) {
        setPartners(result.data)
      } else {
        setError(result.error || '加载合作单位列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const { create, update, deletePartner } = createPartnerCrud(
    loadPartners, setError, setPartners, selectedPartner, setSelectedPartner
  )

  const clearError = useCallback(() => setError(null), [])

  const refresh = useCallback(async () => { await loadPartners() }, [loadPartners])

  const setSelectedItem = useCallback((item: Partner | null) => {
    setSelectedPartner(item)
  }, [])

  useEffect(() => { loadPartners() }, [loadPartners])

  return {
    data: partners,
    loading,
    error,
    selectedItem: selectedPartner,
    loadData: loadPartners,
    create,
    update,
    delete: deletePartner,
    setSelectedItem,
    clearError,
    refresh,
  }
}

================
File: src/hooks/usePartnersHelpers.ts
================
import type { Partner } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function createPartnerCrud(
  loadPartners: () => Promise<void>,
  setError: (error: string | null) => void,
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>,
  selectedPartner: Partner | null,
  setSelectedPartner: (item: Partner | null) => void,
) {
  const create = async (data: Partial<Partner>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createPartner(data as Partner)
      if (result.success) {
        await loadPartners()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      const errorMsg = result.error || '创建合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  const update = async (partner: Partner): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updatePartner(partner)
      if (result.success) {
        await loadPartners()
        if (selectedPartner?.id === partner.id) {
          setSelectedPartner(partner)
        }
        return { success: true }
      }
      const errorMsg = result.error || '更新合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  const deletePartner = async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deletePartner(id)
      if (result.success) {
        setPartners(prev => prev.filter(p => p.id !== id))
        if (selectedPartner?.id === id) {
          setSelectedPartner(null)
        }
        return { success: true }
      }
      const errorMsg = result.error || '删除合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  return { create, update, deletePartner }
}

================
File: src/hooks/usePaymentRecords.ts
================
import { useState, useCallback } from 'react'
import type { PaymentRecord } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'

export interface UsePaymentRecordsReturn {
  data: PaymentRecord[]
  loading: boolean
  error: string | null
  selectedItem: PaymentRecord | null

  loadData: (type?: string) => Promise<void>
  create: (data: Partial<PaymentRecord>) => Promise<Result<{ id: number }>>
  update: (record: PaymentRecord) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>

  setSelectedItem: (item: PaymentRecord | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function usePaymentRecords(): UsePaymentRecordsReturn {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null)

  const loadRecords = useCallback(async (type?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await (await getAPI()).getWagePaymentRecords({ status: type })
      if (result.success && result.data) { setRecords(result.data) }
      else { setError(result.error || 'Failed to load payment records') }
    } catch (err) { setError(handleError(err).getUserMessage()) }
    finally { setLoading(false) }
  }, [])

  const create = useCallback(async (data: Partial<PaymentRecord>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createPaymentRecord(data)
      if (result.success) { await loadRecords(); return { success: true, data: { id: result.data?.id || 0 } } }
      return { success: false, error: result.error || 'Failed to create payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const update = useCallback(async (record: PaymentRecord): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updatePaymentRecord(record)
      if (result.success) { await loadRecords(); return { success: true } }
      return { success: false, error: result.error || 'Failed to update payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const deleteRecord = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deletePaymentRecord(id)
      if (result.success) { await loadRecords(); return { success: true } }
      return { success: false, error: result.error || 'Failed to delete payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const setSelectedItem = useCallback((item: PaymentRecord | null) => { setSelectedRecord(item) }, [])
  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadRecords() }, [loadRecords])

  return { data: records, loading, error, selectedItem: selectedRecord, loadData: loadRecords, create, update, delete: deleteRecord, setSelectedItem, clearError, refresh }
}

================
File: src/hooks/usePermission.tsx
================
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

================
File: src/hooks/usePermitOCR.ts
================
import { useCallback } from 'react'
import { recognizePermit, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface PermitOCRData {
  companyCode: string
  companyName: string
  accountNumber: string
  bankName: string
  permitNumber: string
}

interface UsePermitOCRReturn {
  processPermitFile: (file: File) => Promise<PermitOCRData | null>
  validateImageFile: (file: File) => string | null
}

export function usePermitOCR(): UsePermitOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const validateImageFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return '仅支持 JPG/PNG/WebP 格式的图片'
    }
    if (file.size > 5 * 1024 * 1024) {
      return '图片大小不能超过 5MB'
    }
    return null
  }, [])

  const processPermitFile = useCallback(async (file: File): Promise<PermitOCRData | null> => {
    const error = validateImageFile(file)
    if (error) {
      showToast(error, 'error')
      return null
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result: OCRResult = await recognizePermit(base64)

      if (!result.success || !result.permit) {
        showToast(result.error || '开户许可证识别失败', 'error')
        return null
      }

      const permit = result.permit

      showToast('开户许可证识别成功', 'success')
      return {
        companyCode: permit.companyCode || '',
        companyName: permit.companyName || '',
        accountNumber: permit.accountNumber || '',
        bankName: permit.bankName || '',
        permitNumber: permit.permitNumber || ''
      }
    } catch (err: unknown) {
      showToast(`识别失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error')
      return null
    }
  }, [showToast, validateImageFile])

  return { processPermitFile, validateImageFile }
}

================
File: src/hooks/useProjects.ts
================
import { useState, useCallback, useEffect } from 'react'
import type { Project } from '@/types'
import type { ProjectFilters, CreateProjectDTO, UpdateProjectDTO, UseProjectsReturn } from './useProjects.types'
import { useProjectsLoaders } from './useProjectsLoaders'
import { useProjectsActions } from './useProjectsActions'

export type { ProjectFilters, CreateProjectDTO, UpdateProjectDTO, UseProjectsReturn }

export function useProjects(filters?: ProjectFilters): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const { loadProjects } = useProjectsLoaders({
    setLoading,
    setError,
    setProjects,
  }, filters)

  const { create, update, deleteProject } = useProjectsActions({
    setError,
    setProjects,
    loadProjects,
    selectedProject,
    setSelectedProject,
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  const setSelectedItem = useCallback((item: Project | null) => {
    setSelectedProject(item)
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    data: projects,
    loading,
    error,
    selectedItem: selectedProject,
    loadData: loadProjects,
    create,
    update,
    delete: deleteProject,
    setSelectedItem,
    clearError,
    refresh,
  }
}

================
File: src/hooks/useProjects.types.ts
================
import type { Project } from '@/types'

export interface ProjectFilters {
  status?: Project['status']
  searchTerm?: string
  managerId?: number
}

export type CreateProjectDTO = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>

export type UpdateProjectDTO = Partial<Omit<Project, 'createdAt'>>

export interface UseProjectsReturn {
  data: Project[]
  loading: boolean
  error: string | null
  selectedItem: Project | null

  loadData: () => Promise<void>
  create: (data: CreateProjectDTO) => Promise<import('@/types').Result<{ id: number }>>
  update: (project: Project) => Promise<import('@/types').VoidResult>
  delete: (id: number) => Promise<import('@/types').VoidResult>

  setSelectedItem: (item: Project | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

================
File: src/hooks/useProjectsActions.ts
================
import { useCallback } from 'react'
import type { Project } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { CreateProjectDTO } from './useProjects.types'

interface UseProjectsActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  loadProjects: () => Promise<void>
  selectedProject: Project | null
  setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>
}

export function useProjectsActions(deps: UseProjectsActionsDeps) {
  const { setError, setProjects, loadProjects, selectedProject, setSelectedProject } = deps

  const create = useCallback(async (data: CreateProjectDTO): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createProject(data as Project)

      if (result.success) {
        await loadProjects()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadProjects, setError])

  const update = useCallback(async (project: Project): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateProject(project)

      if (result.success) {
        await loadProjects()
        if (selectedProject?.id === project.id) {
          setSelectedProject(project)
        }
        return { success: true }
      }

      const errorMsg = result.error || '更新项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadProjects, selectedProject, setSelectedProject, setError])

  const deleteProject = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteProject(id)

      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== id))
        if (selectedProject?.id === id) {
          setSelectedProject(null)
        }
        return { success: true }
      }

      const errorMsg = result.error || '删除项目失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedProject, setProjects, setSelectedProject, setError])

  return { create, update, deleteProject }
}

================
File: src/hooks/useProjectsLoaders.ts
================
import { useCallback } from 'react'
import type { Project } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { ProjectFilters } from './useProjects.types'

interface UseProjectsLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
}

export function useProjectsLoaders(deps: UseProjectsLoadersDeps, filters?: ProjectFilters) {
  const { setLoading, setError, setProjects } = deps

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getProjects()

      if (result.success && result.data) {
        let filteredData: Project[] = result.data

        if (filters?.status) {
          filteredData = filteredData.filter(p => p.status === filters.status)
        }

        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
          )
        }

        if (filters?.managerId) {
          filteredData = filteredData.filter(p => p.projectManagerId === filters.managerId)
        }

        setProjects(filteredData)
      } else {
        setError(result.error || '加载项目列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.searchTerm, filters?.managerId, setLoading, setError, setProjects])

  return { loadProjects }
}

================
File: src/hooks/useRegionsAndSupervisors.ts
================
import { useState, useCallback, useEffect } from "react"
import type { Region, Supervisor } from "@/types"
import { handleError, Result, VoidResult } from "@/types"
import { getAPI } from '@/services/api-adapter'

export interface UseRegionsReturn {
  data: Region[]; loading: boolean; error: string | null
  loadData: () => Promise<void>
  create: (data: Partial<Region>) => Promise<Result<{ id: number }>>
  delete: (id: number) => Promise<VoidResult>
  clearError: () => void; refresh: () => Promise<void>
}

export function useRegions(): UseRegionsReturn {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRegions = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await (await getAPI()).getRegions()
      if (result.success && result.data) setRegions(result.data)
      else setError(result.error || '加载地区列表失败')
    } catch (err) { setError(handleError(err).getUserMessage()) }
    finally { setLoading(false) }
  }, [])

  const create = useCallback(async (data: Partial<Region>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createRegion(data as Region)
      if (result.success) { await loadRegions(); return { success: true, data: { id: result.data?.id || 0 } } }
      const msg = result.error || '创建地区失败'; setError(msg); return { success: false, error: msg }
    } catch (err) { const msg = handleError(err).getUserMessage(); setError(msg); return { success: false, error: msg } }
  }, [loadRegions])

  const deleteRegion = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deleteRegion(id)
      if (result.success) { setRegions(p => p.filter(r => r.id !== id)); return { success: true } }
      const msg = result.error || '删除地区失败'; setError(msg); return { success: false, error: msg }
    } catch (err) { const msg = handleError(err).getUserMessage(); setError(msg); return { success: false, error: msg } }
  }, [])

  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadRegions() }, [loadRegions])
  useEffect(() => { loadRegions() }, [loadRegions])

  return { data: regions, loading, error, loadData: loadRegions, create, delete: deleteRegion, clearError, refresh }
}

export interface UseSupervisorsReturn {
  data: Supervisor[]; loading: boolean; error: string | null; selectedItem: Supervisor | null
  loadData: () => Promise<void>
  create: (data: Partial<Supervisor>) => Promise<Result<{ id: number }>>
  update: (supervisor: Supervisor) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  setSelectedItem: (item: Supervisor | null) => void; clearError: () => void; refresh: () => Promise<void>
}

export function useSupervisors(): UseSupervisorsReturn {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null)

  const loadSupervisors = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await (await getAPI()).getSupervisors()
      if (result.success && result.data) setSupervisors(result.data)
      else setError(result.error || '加载监管单位列表失败')
    } catch (err) { setError(handleError(err).getUserMessage()) }
    finally { setLoading(false) }
  }, [])

  const create = useCallback(async (data: Partial<Supervisor>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createSupervisor(data as Supervisor)
      if (result.success) { await loadSupervisors(); return { success: true, data: { id: result.data?.id || 0 } } }
      const msg = result.error || '创建监管单位失败'; setError(msg); return { success: false, error: msg }
    } catch (err) { const msg = handleError(err).getUserMessage(); setError(msg); return { success: false, error: msg } }
  }, [loadSupervisors])

  const update = useCallback(async (supervisor: Supervisor): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updateSupervisor(supervisor)
      if (result.success) { await loadSupervisors(); if (selectedSupervisor?.id === supervisor.id) setSelectedSupervisor(supervisor); return { success: true } }
      const msg = result.error || '更新监管单位失败'; setError(msg); return { success: false, error: msg }
    } catch (err) { const msg = handleError(err).getUserMessage(); setError(msg); return { success: false, error: msg } }
  }, [loadSupervisors, selectedSupervisor])

  const deleteSupervisor = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deleteSupervisor(id)
      if (result.success) { setSupervisors(p => p.filter(s => s.id !== id)); if (selectedSupervisor?.id === id) setSelectedSupervisor(null); return { success: true } }
      const msg = result.error || '删除监管单位失败'; setError(msg); return { success: false, error: msg }
    } catch (err) { const msg = handleError(err).getUserMessage(); setError(msg); return { success: false, error: msg } }
  }, [selectedSupervisor])

  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadSupervisors() }, [loadSupervisors])
  const setSelectedItem = useCallback((item: Supervisor | null) => { setSelectedSupervisor(item) }, [])
  useEffect(() => { loadSupervisors() }, [loadSupervisors])

  return { data: supervisors, loading, error, selectedItem: selectedSupervisor, loadData: loadSupervisors, create, update, delete: deleteSupervisor, setSelectedItem, clearError, refresh }
}

================
File: src/hooks/useRowHoverOpacity.ts
================
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'rowHoverOpacity'
const DEFAULT = 60 // 0-100

function readStored(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v !== null) {
      const n = Number(v)
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n
    }
  } catch { /* localStorage unavailable */ }
  return DEFAULT
}

export function useRowHoverOpacity() {
  const [opacity, setOpacityState] = useState(readStored)

  useEffect(() => {
    document.documentElement.style.setProperty('--row-hover-opacity', String(opacity / 100))
  }, [opacity])

  const setOpacity = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    setOpacityState(clamped)
    try { localStorage.setItem(STORAGE_KEY, String(clamped)) } catch { /* ignore */ }
  }, [])

  return { opacity, setOpacity }
}

================
File: src/hooks/useSqliteSettings.ts
================
import { useState, useEffect, useCallback } from 'react'
import type { SqliteStatus, ReadMode } from '../types/electron'
import { getAPI } from '@/services/api-adapter'

interface MigrationResult {
  success: boolean
  migratedTables: number
  totalRows: number
  verificationPassed: boolean
  errors: string[]
  warnings: string[]
  duration: number
  message?: string
}

interface Message {
  type: 'success' | 'error' | 'info' | 'warning'
  text: string
}

export function useSqliteSettings() {
  const [status, setStatus] = useState<SqliteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [enabling, setEnabling] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const result = await (await getAPI()).getSqliteStatus()
      setStatus(result)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleEnable = useCallback(async () => {
    const api = await getAPI()
    if (!api?.enableSqlite) {
      setMessage({ type: 'error', text: 'SQLite 功能不可用' })
      return
    }
    setEnabling(true)
    setMessage(null)
    try {
      const result = await api.enableSqlite()
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await refreshStatus()
      } else {
        setMessage({ type: 'error', text: result.message || '启用 SQLite 失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `启用失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setEnabling(false)
    }
  }, [refreshStatus])

  const handleMigrate = useCallback(async (force = false) => {
    const api = await getAPI()
    if (!api?.migrateToSqlite) {
      setMessage({ type: 'error', text: 'SQLite 迁移功能不可用' })
      return
    }
    setMigrating(true)
    setMessage(null)
    try {
      const result: MigrationResult = await api.migrateToSqlite(force)
      if (result.success) {
        const lines = [
          `迁移完成：${result.migratedTables} 张表，${result.totalRows} 行数据`,
          `耗时 ${(result.duration / 1000).toFixed(1)} 秒`,
          result.verificationPassed ? '✅ 数据校验通过' : '⚠️ 数据校验未通过',
        ]
        if (result.warnings.length > 0) {
          lines.push(`⚠️ ${result.warnings.length} 个警告`)
        }
        setMessage({ type: result.verificationPassed ? 'success' : 'warning', text: lines.join(' | ') })
        await refreshStatus()
      } else {
        const detail = result.errors.length > 0 ? `：${result.errors.slice(0, 3).join('; ')}` : ''
        setMessage({ type: 'error', text: `迁移失败${detail}` })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `迁移失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setMigrating(false)
    }
  }, [refreshStatus])

  const handleSetReadMode = useCallback(async (mode: ReadMode) => {
    const api = await getAPI()
    if (!api?.setSqliteReadMode) {
      setMessage({ type: 'error', text: '读取模式切换功能不可用' })
      return
    }
    setSwitching(true)
    setMessage(null)
    try {
      const result = await api.setSqliteReadMode(mode)
      if (result.success) {
        const modeLabels: Record<ReadMode, string> = {
          'dual': '双写模式',
          'sqlite-primary': 'SQLite 优先',
          'json-only': '仅 JSON',
        }
        setMessage({ type: 'success', text: `已切换到${modeLabels[mode]}` })
        await refreshStatus()
      } else {
        setMessage({ type: 'error', text: result.error || '切换读取模式失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `切换失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSwitching(false)
    }
  }, [refreshStatus])

  // 强制重新迁移（用于迁移脚本更新后需重新迁移的场景）
  const handleRemigrate = useCallback(() => handleMigrate(true), [handleMigrate])

  return {
    status,
    loading,
    enabling,
    migrating,
    switching,
    message,
    setMessage,
    refreshStatus,
    handleEnable,
    handleMigrate,
    handleRemigrate,
    handleSetReadMode,
  }
}

================
File: src/hooks/useTheme.ts
================
import { useCallback, useSyncExternalStore } from 'react'

export type ThemeScheme = 'white' | 'graphite' | 'sandstone'

const KEY = 'app-theme'

function readScheme(): ThemeScheme {
  if (typeof window === 'undefined') return 'white'
  const stored = localStorage.getItem(KEY)
  if (stored === 'white' || stored === 'graphite' || stored === 'sandstone') return stored
  const old = localStorage.getItem('app-scheme')
  if (old === 'white' || old === 'graphite' || old === 'sandstone') return old
  return 'white'
}

// 全局 store — 所有 useTheme 实例共享同一份状态
let _scheme: ThemeScheme = readScheme()
let _listeners: Set<() => void> = new Set()

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
function getSnapshot() { return _scheme }
function getServerSnapshot(): ThemeScheme { return 'white' }

function setGlobalScheme(s: ThemeScheme) {
  if (s === _scheme) return
  _scheme = s
  localStorage.setItem(KEY, s)
  document.documentElement.setAttribute('data-theme', s)
  _listeners.forEach(fn => fn())
}

// 模块加载时同步设置（早于 React 渲染）
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', _scheme)
  localStorage.setItem(KEY, _scheme)
}

export function useTheme() {
  const scheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setScheme = useCallback((s: ThemeScheme) => {
    setGlobalScheme(s)
  }, [])

  return { scheme, setScheme }
}

================
File: src/hooks/useToast.ts
================
import { useState, useCallback } from 'react'

export interface ToastInfo {
  message: string
  type: 'success' | 'error' | 'info'
}

export function useToast(duration: number = 3000) {
  const [toast, setToast] = useState<ToastInfo | null>(null)

  const showToast = useCallback((message: string, type: ToastInfo['type'] = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}

export type { ToastItem } from '../components/ui/Toast/ToastProvider'
export { useToastContext, ToastProvider } from '../components/ui/Toast/ToastProvider'

================
File: src/hooks/useWageAttendance.ts
================
import { useCallback } from 'react'
import type { AttendanceRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseWageAttendanceOptions {
  selectedProject: { id: number } | null
  selectedMonth: string
  workerPwIds: number[]
  setAttendances: (v: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => void
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
}

export function useWageAttendance({
  selectedProject, selectedMonth, workerPwIds,
  setAttendances, setLoading, showToast, confirm,
}: UseWageAttendanceOptions) {
  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const handleGenerateAttendance = async () => {
    if (!selectedProject) return
    if (workerPwIds.length === 0) {
      showToast('该项目没有活跃工人，请先在项目详情页→人员管理中添加工人班组', 'warning'); return
    }
    setLoading(true)
    try {
      const r = await (await getAPI()).generateDefaultAttendancesV2(selectedProject.id, selectedMonth, workerPwIds)
      if (r.success && r.data && r.data.count > 0) { showToast(`已为 ${r.data.count} 名工人生成考勤记录`, 'success'); await loadAttendances() }
      else showToast('所有工人已有考勤记录', 'info')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '生成考勤失败', 'error') }
    finally { setLoading(false) }
  }

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: '确认删除',
      content: `确认删除 ${record.memberName || '该工人'} 的考勤记录吗？`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteAttendance(record.id)
      if (result.success) { showToast('考勤记录已删除', 'success'); await loadAttendances() }
      else showToast(result.error || '删除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '删除失败', 'error') }
  }

  return { loadAttendances, handleGenerateAttendance, handleDeleteAttendance }
}

================
File: src/hooks/useWageDataLoader.ts
================
import { useCallback } from 'react'
import type { Project, WorkerTeam, WageRecord, WageStats } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function useWageDataLoader(deps: {
  view: 'dashboard' | 'cycle'
  selectedProject: Project | null
  selectedMonth: string
  setLoading: (b: boolean) => void
  setProjects: (p: Project[]) => void
  setWorkerTeams: (t: WorkerTeam[]) => void
  setAllWageRecords: (r: WageRecord[]) => void
  setWageStats: (s: WageStats | null) => void
}) {
  const { view, selectedProject, selectedMonth, setLoading, setProjects, setWorkerTeams, setAllWageRecords, setWageStats } = deps

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [projectsRes, teamsRes] = await Promise.allSettled([api.getProjects(), api.getWorkerTeams()])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      setProjects(get(projectsRes).filter((p: Project) => p.status !== 'archived'))
      setWorkerTeams(get(teamsRes))
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAllRecords = useCallback(async () => {
    try {
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
      const result = await (await getAPI()).getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadStats = useCallback(async () => {
    try {
      const result = await (await getAPI()).getWageStats(selectedMonth)
      if (result.success && result.data) setWageStats(result.data)
    } catch (error) { console.error('加载统计数据失败:', error) }
  }, [selectedMonth])

  return { loadBaseData, loadAllRecords, loadStats }
}

================
File: src/hooks/useWageLoaders.ts
================
import { useCallback } from 'react'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord, OverdueStats } from '@/types'
import { getAPI } from '@/services/api-adapter'

type ProjectWorkerRow = { pwId: number; name: string; teamName: string; idCard: string }

export type ViewMode = 'dashboard' | 'cycle' | 'batch' | 'batch-confirm' | 'payment-records'

export function useWageLoaders(deps: {
  selectedProject: Project | null
  selectedMonth: string
  view: ViewMode
  workerTeams: WorkerTeam[]
  setLoading: (b: boolean) => void
  setProjects: (p: Project[]) => void
  setWorkerTeams: (t: WorkerTeam[]) => void
  setAttendances: (a: AttendanceRecord[]) => void
  setAllProjectAttendances: (a: AttendanceRecord[]) => void
  setWageRecords: (w: WageRecord[]) => void
  setAllWageRecords: (w: WageRecord[]) => void
  setProjectWorkerList: (l: ProjectWorkerRow[]) => void
  setWorkerPwIds: (ids: number[]) => void
  setOverdueStats: (s: OverdueStats) => void
}) {
  const {
    selectedProject, selectedMonth, view, workerTeams,
    setLoading, setProjects, setWorkerTeams, setAttendances,
    setAllProjectAttendances, setWageRecords, setAllWageRecords,
    setProjectWorkerList, setWorkerPwIds, setOverdueStats,
  } = deps

  const loadBaseData = useCallback(async () => {
    setLoading(true)
    try {
      const api = await getAPI()
      const [projectsRes, teamsRes] = await Promise.all([
        api.getProjects(),
        api.getWorkerTeams(),
      ])
      if (projectsRes.success && projectsRes.data) setProjects(projectsRes.data.filter((p: Project) => p.status !== 'archived'))
      if (teamsRes.success && teamsRes.data) setWorkerTeams(teamsRes.data)
    } catch (error) { console.error('加载基础数据失败:', error) }
    finally { setLoading(false) }
  }, [])

  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllProjectAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, undefined)
      if (result.success && result.data) setAllProjectAttendances(result.data)
    } catch (error) { console.error('加载全部考勤失败:', error) }
  }, [selectedProject])

  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const loadAllRecords = useCallback(async () => {
    try {
      const projectId = view === 'cycle' ? selectedProject?.id : undefined
      const result = await (await getAPI()).getWages(projectId, undefined)
      if (result.success && result.data) setAllWageRecords(result.data)
    } catch (error) { console.error('加载工资记录失败:', error) }
  }, [selectedProject, view])

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: ProjectWorkerRow[] = []
    const pwIds: number[] = []
    try {
      const api = await getAPI()
      const [pwResult, workersResult] = await Promise.all([
        api.getProjectWorkers(selectedProject.id),
        api.getWorkers(),
      ])
      const idCardMap = new Map<number, string>()
      if (workersResult.success && workersResult.data) {
        for (const w of workersResult.data) idCardMap.set(w.id, w.idCard || '')
      }
      if (pwResult.success && pwResult.data) {
        for (const pw of pwResult.data) {
          if (pw.status !== 'active') continue
          pwIds.push(pw.id)
          const teamName = workerTeams.find((t: WorkerTeam) => t.id === pw.teamId)?.name || '-'
          const idCard = idCardMap.get(pw.workerId) || ''
          list.push({ pwId: pw.id, name: pw.workerName || '', teamName, idCard })
        }
      }
    } catch (e) { console.error('获取项目工人失败:', e) }
    setProjectWorkerList(list)
    setWorkerPwIds(pwIds)
  }, [selectedProject, workerTeams])

  const loadOverdueStats = useCallback(async () => {
    try {
      const result = await (await getAPI()).getWageOverdueStats()
      if (result.success && result.data) {
        setOverdueStats(result.data)
      }
    } catch (error) { console.error('加载欠薪统计失败:', error) }
  }, [])

  return {
    loadBaseData, loadAttendances, loadAllProjectAttendances,
    loadWages, loadAllRecords, loadProjectWorkers, loadOverdueStats,
  }
}

================
File: src/hooks/useWageManagement.ts
================
import { useState, useEffect } from 'react'

import type { Project, WorkerTeam, AttendanceRecord, WageRecord, WageStats } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { useBankReceipt } from '../components/features/wages/useBankReceipt'
import { useWageAttendance } from './useWageAttendance'
import { useWageTable } from './useWageTable'
import type { ViewMode, ProjectWorkerItem, UseWageManagementOptions } from './useWageManagementTypes'
import { useWageDataLoader } from './useWageDataLoader'
import { useWagePaymentOps } from './useWagePaymentOps'
import { useWageProjectWorkers } from './useWageProjectWorkers'

export type { ViewMode, ProjectWorkerItem, UseWageManagementOptions }

export default function useWageManagement({ showToast, confirm }: UseWageManagementOptions) {
  const [projects, setProjects] = useState<Project[]>([])
  const [workerTeams, setWorkerTeams] = useState<WorkerTeam[]>([])
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [attendanceDetailRecord, setAttendanceDetailRecord] = useState<AttendanceRecord | null>(null)
  const [wageRecords, setWageRecords] = useState<WageRecord[]>([])
  const [editingWages, setEditingWages] = useState<Map<number, { bonus: number; deduction: number }>>(new Map())
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())
  const [allWageRecords, setAllWageRecords] = useState<WageRecord[]>([])
  const [wageStats, setWageStats] = useState<WageStats | null>(null)
  const [filterMemberName, setFilterMemberName] = useState('')
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<number>>(new Set())
  const [selectedWageTableIds, setSelectedWageTableIds] = useState<Set<number>>(new Set())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())
  const [projectWorkerList, setProjectWorkerList] = useState<ProjectWorkerItem[]>([])
  const [workerPwIds, setWorkerPwIds] = useState<number[]>([])

  // ── 数据加载 ──
  const { loadBaseData, loadAllRecords, loadStats } = useWageDataLoader({
    view, selectedProject, selectedMonth, setLoading, setProjects, setWorkerTeams, setAllWageRecords, setWageStats })
  useEffect(() => { loadBaseData() }, [loadBaseData])
  useEffect(() => { loadAllRecords() }, [loadAllRecords])
  useEffect(() => { loadStats() }, [loadStats])

  // ── 考勤操作 ──
  const { loadAttendances, handleGenerateAttendance, handleDeleteAttendance } =
    useWageAttendance({ selectedProject, selectedMonth, workerPwIds, setAttendances, setLoading, showToast, confirm })
  useEffect(() => { loadAttendances() }, [loadAttendances])

  const handleBatchDeleteAttendances = async () => {
    if (selectedAttendanceIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedAttendanceIds.size} 条考勤记录吗？`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteAttendances(Array.from(selectedAttendanceIds))
      if (result.success) { showToast(`已删除 ${selectedAttendanceIds.size} 条考勤记录`, 'success'); setSelectedAttendanceIds(new Set()); await loadAttendances() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '批量删除失败', 'error') }
  }

  // ── 工资表操作 ──
  const { loadWages, handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages } =
    useWageTable({ selectedProject, selectedMonth, wageRecords, editingWages, setWageRecords, setEditingWages, setLoading, showToast, loadAllRecords, loadStats })
  useEffect(() => { loadWages() }, [loadWages])

  const handleBatchDeleteWageTable = async () => {
    if (selectedWageTableIds.size === 0) return
    const ok = await confirm({ title: '确认删除', content: `确认删除选中的 ${selectedWageTableIds.size} 条工资记录吗？`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchDeleteWages(Array.from(selectedWageTableIds))
      if (result.success) { showToast(`已删除 ${selectedWageTableIds.size} 条工资记录`, 'success'); setSelectedWageTableIds(new Set()); await loadWages() }
      else showToast(result.error || '批量删除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '批量删除失败', 'error') }
  }

  // ── 项目工人 ──
  const { loadProjectWorkers } = useWageProjectWorkers({
    selectedProject, workerTeams, setProjectWorkerList, setWorkerPwIds })
  useEffect(() => { loadProjectWorkers() }, [loadProjectWorkers])

  // ── 工资发放操作 ──
  const { handleBatchDeleteWages, handleBatchArchivePayments, handlePaymentChange, handleSavePayments } =
    useWagePaymentOps({ allWageRecords, paymentEdits, setPaymentEdits, selectedWageIds, setSelectedWageIds, setLoading, showToast, confirm, loadAllRecords, loadStats })

  const { receiptParsing, receiptResult, handleBankReceiptUpload } = useBankReceipt({ allWageRecords, selectedProject, paymentEdits, setPaymentEdits, showToast })

  // ── 选中切换 ──
  const toggleAttendanceSelect = (id: number) => setSelectedAttendanceIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllAttendances = () => setSelectedAttendanceIds(prev => prev.size === attendances.length ? new Set() : new Set(attendances.map(a => a.id)))
  const toggleWageTableSelect = (id: number) => setSelectedWageTableIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWageTable = () => setSelectedWageTableIds(prev => prev.size === wageRecords.length ? new Set() : new Set(wageRecords.map(w => w.id)))
  const toggleWageSelect = (id: number) => setSelectedWageIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAllWages = () => {
    const filtered = allWageRecords.filter(w => !filterMemberName || (w.memberName || '').includes(filterMemberName))
    setSelectedWageIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)))
  }

  return {
    projects, workerTeams,
    view, setView, selectedProject, setSelectedProject,
    selectedMonth, setSelectedMonth, loading, setLoading,
    attendances, attendanceDetailRecord, setAttendanceDetailRecord,
    wageRecords, editingWages, paymentEdits,
    allWageRecords, wageStats, filterMemberName, setFilterMemberName,
    selectedAttendanceIds, selectedWageTableIds, selectedWageIds,
    projectWorkerList, workerPwIds,
    handleGenerateAttendance, handleDeleteAttendance,
    handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages,
    handleBatchDeleteAttendances, handleBatchDeleteWageTable,
    handleBatchDeleteWages, handleBatchArchivePayments,
    handlePaymentChange, handleSavePayments,
    toggleAttendanceSelect, toggleAllAttendances,
    toggleWageTableSelect, toggleAllWageTable,
    toggleWageSelect, toggleAllWages,
    receiptParsing, receiptResult, handleBankReceiptUpload,
    loadAttendances, loadWages, loadAllRecords, loadStats,
  }
}

================
File: src/hooks/useWageManagementTypes.ts
================
export type ViewMode = 'dashboard' | 'cycle'

export interface ProjectWorkerItem {
  pwId: number
  name: string
  teamName: string
  idCard: string
}

export interface UseWageManagementOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
}

================
File: src/hooks/useWagePaymentOps.ts
================
import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function useWagePaymentOps(deps: {
  allWageRecords: WageRecord[]
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  selectedWageIds: Set<number>
  setSelectedWageIds: React.Dispatch<React.SetStateAction<Set<number>>>
  setLoading: (b: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}) {
  const { allWageRecords, paymentEdits, setPaymentEdits, selectedWageIds, setSelectedWageIds, setLoading, showToast, confirm, loadAllRecords, loadStats } = deps

  const handleBatchDeleteWages = async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({ title: '确认清除', content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`, confirmVariant: 'danger' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
      if (result.success) {
        showToast(`已清除 ${result.data?.cleared ?? selectedWageIds.size} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        setPaymentEdits(prev => { const next = new Map(prev); for (const id of selectedWageIds) next.delete(id); return next })
        await loadAllRecords()
      } else showToast(result.error || '清除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '清除失败', 'error') }
  }

  const handleBatchArchivePayments = async () => {
    const toArchive = selectedWageIds.size > 0 ? Array.from(selectedWageIds) : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({ title: '确认归档', content: prompt, confirmVariant: 'primary' })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set()); await loadAllRecords(); setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '归档失败', 'error') }
  }

  const handlePaymentChange = (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '', bankReceiptPath: record?.bankReceiptPath }
      next.set(recordId, { ...current, [field]: value })
      return next
    })
  }

  const handleSavePayments = async () => {
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = allWageRecords.map(w => {
        const edit = paymentEdits.get(w.id)
        if (!edit) return w
        return { ...w, paidAmount: parseFloat(edit.paidAmount) || 0, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
    finally { setLoading(false) }
  }

  return { handleBatchDeleteWages, handleBatchArchivePayments, handlePaymentChange, handleSavePayments }
}

================
File: src/hooks/useWagePaymentRecords.ts
================
/**
 * 工资发放记录 + 欠薪预警 — 数据管理 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import type { OverdueStats, OverdueRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function useWagePaymentRecords() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null)
  const [overdueList, setOverdueList] = useState<OverdueRecord[]>([])
  const [filters, setFilters] = useState<Record<string, any>>({})

  // 加载工资发放记录
  const loadPaymentRecords = useCallback(async (newFilters?: Record<string, any>) => {
    const f = newFilters || filters
    setLoading(true)
    try {
      const result = await (await getAPI()).getWagePaymentRecords(f)
      if (result.success && result.data) {
        setRecords(result.data)
      }
    } catch (error) {
      console.error('加载工资发放记录失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // 加载欠薪统计
  const loadOverdueStats = useCallback(async () => {
    try {
      const result = await (await getAPI()).getWageOverdueStats()
      if (result.success && result.data) {
        setOverdueStats(result.data)
      }
    } catch (error) {
      console.error('加载欠薪统计失败:', error)
    }
  }, [])

  // 加载欠薪列表
  const loadOverdueList = useCallback(async () => {
    setLoading(true)
    try {
      const result = await (await getAPI()).getWageOverdueList()
      if (result.success && result.data) {
        setOverdueList(result.data)
      }
    } catch (error) {
      console.error('加载欠薪列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 筛选变更
  const applyFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    loadPaymentRecords(newFilters)
  }, [loadPaymentRecords])

  // 导出 Excel
  const exportToExcel = useCallback(async () => {
    try {
      // 动态导入 xlsx
      const XLSX = await import('xlsx')

      const exportData = records.map(r => ({
        '项目名': r.projectName || '',
        '月份': r.yearMonth || '',
        '工人姓名': r.workerName || '',
        '应发金额': r.actualWage || 0,
        '实发金额': r.paidAmount || 0,
        '发放状态': r.paymentStatus || '',
        '发放日期': r.paidDate || '',
        '逾期天数': r.overdueDays || 0,
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '工资发放记录')
      
      const fileName = `工资发放记录_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('导出 Excel 失败:', error)
    }
  }, [records])

  // 初始加载
  useEffect(() => {
    loadPaymentRecords()
    loadOverdueStats()
  }, [loadPaymentRecords, loadOverdueStats])

  return {
    loading,
    records,
    overdueStats,
    overdueList,
    filters,
    applyFilters,
    loadPaymentRecords,
    loadOverdueStats,
    loadOverdueList,
    exportToExcel,
  }
}

================
File: src/hooks/useWagePayments.ts
================
import { useState, useCallback } from 'react'

import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

export interface UseWagePaymentsReturn {
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  setPaymentEdits: React.Dispatch<React.SetStateAction<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>>
  handlePaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
  handleSavePayments: () => Promise<void>
  handleBatchDeleteWages: () => Promise<void>
  handleBatchArchivePayments: () => Promise<void>
  selectedWageIds: Set<number>
  setSelectedWageIds: React.Dispatch<React.SetStateAction<Set<number>>>
  toggleWageSelect: (id: number) => void
  toggleAllWages: () => void
}

interface UseWagePaymentsOptions {
  allWageRecords: WageRecord[]
  selectedProject: { id: number } | null
  filterMemberName: string
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}

export function useWagePayments({
  allWageRecords,
  filterMemberName,
  setLoading,
  showToast,
  confirm,
  loadAllRecords,
  loadStats,
}: UseWagePaymentsOptions) {
  const [paymentEdits, setPaymentEdits] = useState<Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>>(new Map())
  const [selectedWageIds, setSelectedWageIds] = useState<Set<number>>(new Set())

  const handlePaymentChange = useCallback((recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => {
    setPaymentEdits(prev => {
      const next = new Map(prev)
      const record = allWageRecords.find(w => w.id === recordId)
      const current = next.get(recordId) || { paidAmount: record?.paidAmount != null ? String(record.paidAmount) : '', paidDate: record?.paidDate ?? '', bankReceiptPath: record?.bankReceiptPath }
      next.set(recordId, { ...current, [field]: value })
      return next
    })
  }, [allWageRecords])

  const handleSavePayments = useCallback(async () => {
    if (paymentEdits.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = allWageRecords.map(w => {
        const edit = paymentEdits.get(w.id)
        if (!edit) return w
        return { ...w, paidAmount: parseFloat(edit.paidAmount) || 0, paidDate: edit.paidDate, bankReceiptPath: edit.bankReceiptPath ?? w.bankReceiptPath, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('发放记录已保存', 'success'); setPaymentEdits(new Map()); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
    finally { setLoading(false) }
  }, [paymentEdits, allWageRecords, showToast, setLoading, loadAllRecords, loadStats])

  const handleBatchDeleteWages = useCallback(async () => {
    if (selectedWageIds.size === 0) return
    const ok = await confirm({
      title: '确认清除',
      content: `确认清除选中的 ${selectedWageIds.size} 条发放记录吗？（不会删除工资记录本身）`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchClearPayments(Array.from(selectedWageIds))
      if (result.success) {
        showToast(`已清除 ${result.data?.cleared ?? selectedWageIds.size} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        setPaymentEdits(prev => {
          const next = new Map(prev)
          for (const id of selectedWageIds) next.delete(id)
          return next
        })
        await loadAllRecords()
      } else showToast(result.error || '清除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '清除失败', 'error') }
  }, [selectedWageIds, confirm, showToast, setSelectedWageIds, loadAllRecords])

  const handleBatchArchivePayments = useCallback(async () => {
    const toArchive = selectedWageIds.size > 0
      ? Array.from(selectedWageIds)
      : allWageRecords.filter(w => !w.paymentLocked).map(w => w.id)
    if (toArchive.length === 0) { showToast('没有可归档的记录', 'info'); return }
    const prompt = selectedWageIds.size > 0
      ? `确认归档选中的 ${selectedWageIds.size} 条发放记录吗？归档后实发金额与日期将不能修改。`
      : `确认归档该项目当前月份全部 ${toArchive.length} 条发放记录吗？`
    const ok = await confirm({
      title: '确认归档',
      content: prompt,
      confirmVariant: 'primary',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).batchArchivePayments(toArchive)
      if (result.success && result.data) {
        showToast(`已归档 ${result.data?.archived ?? toArchive.length} 条发放记录`, 'success')
        setSelectedWageIds(new Set())
        await loadAllRecords()
        setPaymentEdits(new Map())
      } else showToast(result.error || '归档失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '归档失败', 'error') }
  }, [selectedWageIds, allWageRecords, confirm, showToast, setSelectedWageIds, loadAllRecords])

  const toggleWageSelect = useCallback((id: number) => setSelectedWageIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }), [])
  const toggleAllWages = useCallback(() => {
    const filtered = allWageRecords.filter(w => !filterMemberName || (w.memberName || '').includes(filterMemberName))
    setSelectedWageIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(w => w.id)))
  }, [allWageRecords, filterMemberName])

  return {
    paymentEdits, setPaymentEdits,
    handlePaymentChange, handleSavePayments,
    handleBatchDeleteWages, handleBatchArchivePayments,
    selectedWageIds, setSelectedWageIds,
    toggleWageSelect, toggleAllWages,
  }
}

================
File: src/hooks/useWageProjectWorkers.ts
================
import { useCallback } from 'react'
import type { WorkerTeam } from '@/types'
import { getAPI } from '@/services/api-adapter'
import type { ProjectWorkerItem } from './useWageManagementTypes'

export function useWageProjectWorkers(deps: {
  selectedProject: { id: number } | null
  workerTeams: WorkerTeam[]
  setProjectWorkerList: (l: ProjectWorkerItem[]) => void
  setWorkerPwIds: (ids: number[]) => void
}) {
  const { selectedProject, workerTeams, setProjectWorkerList, setWorkerPwIds } = deps

  const loadProjectWorkers = useCallback(async () => {
    if (!selectedProject) { setProjectWorkerList([]); setWorkerPwIds([]); return }
    const list: ProjectWorkerItem[] = []
    const pwIds: number[] = []
    try {
      const api = await getAPI()
      const [pwResult, workersResult] = await Promise.allSettled([api.getProjectWorkers(selectedProject.id), api.getWorkers()])
      const getVal = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const pwData = getVal(pwResult)
      const workersData = getVal(workersResult)
      const idCardMap = new Map<number, string>()
      for (const w of workersData) idCardMap.set(w.id, w.idCard || '')
      if (pwData.length > 0) {
        for (const pw of pwData) {
          if (pw.status !== 'active') continue
          pwIds.push(pw.id)
          const teamName = workerTeams.find((t: WorkerTeam) => t.id === pw.teamId)?.name || '-'
          const idCard = idCardMap.get(pw.workerId) || ''
          list.push({ pwId: pw.id, name: pw.workerName || '', teamName, idCard })
        }
      }
    } catch (e) { console.error('获取项目工人失败:', e) }
    setProjectWorkerList(list)
    setWorkerPwIds(pwIds)
  }, [selectedProject, workerTeams])

  return { loadProjectWorkers }
}

================
File: src/hooks/useWageTable.ts
================
import { useCallback } from 'react'
import type { WageRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseWageTableOptions {
  selectedProject: { id: number } | null
  selectedMonth: string
  wageRecords: WageRecord[]
  editingWages: Map<number, { bonus: number; deduction: number }>
  setWageRecords: (v: WageRecord[] | ((prev: WageRecord[]) => WageRecord[])) => void
  setEditingWages: (v: Map<number, { bonus: number; deduction: number }> | ((prev: Map<number, { bonus: number; deduction: number }>) => Map<number, { bonus: number; deduction: number }>)) => void
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  loadAllRecords: () => Promise<void>
  loadStats: () => Promise<void>
}

export function useWageTable({
  selectedProject, selectedMonth, wageRecords, editingWages,
  setWageRecords, setEditingWages, setLoading,
  showToast, loadAllRecords, loadStats,
}: UseWageTableOptions) {
  const loadWages = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) setWageRecords(result.data)
    } catch (error) { console.error('加载工资数据失败:', error) }
  }, [selectedProject, selectedMonth])

  const handleGenerateWages = async () => {
    if (!selectedProject) return
    setLoading(true)
    try {
      const result = await (await getAPI()).generateProjectWages(selectedProject.id, selectedMonth)
      if (result.success && result.data) { showToast(`已生成 ${result.data.length} 条工资记录`, 'success'); await loadWages(); await loadAllRecords(); setEditingWages(new Map()) }
      else showToast(result.error || '生成工资表失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '生成工资表失败', 'error') }
    finally { setLoading(false) }
  }

  const handleWageBonusDeductionChange = (recordId: number, field: 'bonus' | 'deduction', value: number) => {
    setEditingWages(prev => { const next = new Map(prev); const current = next.get(recordId) || { bonus: 0, deduction: 0 }; next.set(recordId, { ...current, [field]: value }); return next })
  }

  const handleSaveWages = async () => {
    if (editingWages.size === 0) { showToast('没有需要保存的修改', 'info'); return }
    setLoading(true)
    try {
      const updated = wageRecords.map(w => {
        const edit = editingWages.get(w.id)
        if (!edit) return w
        const actualWage = Math.round(((w.dailyWage || 0) * (w.workDays || 0) + edit.bonus - edit.deduction) * 100) / 100
        return { ...w, bonus: edit.bonus, deduction: edit.deduction, actualWage, updatedAt: new Date().toISOString() }
      })
      const result = await (await getAPI()).batchSaveWages(updated)
      if (result.success) { showToast('工资表已保存', 'success'); setEditingWages(new Map()); await loadWages(); await loadAllRecords(); await loadStats() }
      else showToast(result.error || '保存失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '保存失败', 'error') }
    finally { setLoading(false) }
  }

  return { loadWages, handleGenerateWages, handleWageBonusDeductionChange, handleSaveWages }
}

================
File: src/hooks/useWorkerTeams.ts
================
/**
 * useWorkerTeams + useWorkerTransfers Hooks
 *
 * 农民工班组管理 + 工人调动记录管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import type { UseWorkerTeamsReturn, UseWorkerTransfersReturn } from './useWorkerTeams.types'
import {
  useWorkerTeamsLoaders,
  useWorkerTransfersLoaders,
} from './useWorkerTeamsLoaders'
import {
  useWorkerTeamsActions,
  useWorkerTransfersActions,
} from './useWorkerTeamsActions'

export type { UseWorkerTeamsReturn, UseWorkerTransfersReturn } from './useWorkerTeams.types'

/**
 * 农民工班组管理 Hook
 */
export function useWorkerTeams(projectId?: number): UseWorkerTeamsReturn {
  const [teams, setTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<WorkerTeam | null>(null)

  const { loadTeams } = useWorkerTeamsLoaders(
    { setLoading, setError, setTeams },
    projectId,
  )

  const { create, update, deleteTeam } = useWorkerTeamsActions({
    setError,
    setTeams,
    loadTeams,
    selectedTeam,
    setSelectedTeam,
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadTeams()
  }, [loadTeams])

  const setSelectedItem = useCallback((item: WorkerTeam | null) => {
    setSelectedTeam(item)
  }, [])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  return {
    data: teams,
    loading,
    error,
    selectedItem: selectedTeam,
    loadData: loadTeams,
    create,
    update,
    delete: deleteTeam,
    setSelectedItem,
    clearError,
    refresh,
  }
}

/**
 * 工人调动记录 Hook
 */
export function useWorkerTransfers(): UseWorkerTransfersReturn {
  const [records, setRecords] = useState<WorkerTransferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loadRecords } = useWorkerTransfersLoaders({
    setLoading,
    setError,
    setRecords,
  })

  const { create } = useWorkerTransfersActions({
    setError,
    loadRecords,
  })

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadRecords()
  }, [loadRecords])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return {
    data: records,
    loading,
    error,
    loadData: loadRecords,
    create,
    clearError,
    refresh,
  }
}

================
File: src/hooks/useWorkerTeams.types.ts
================
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import type { Result, VoidResult } from '@/types'

/**
 * useWorkerTeams 返回类型
 */
export interface UseWorkerTeamsReturn {
  data: WorkerTeam[]
  loading: boolean
  error: string | null
  selectedItem: WorkerTeam | null

  loadData: () => Promise<void>
  create: (data: Partial<WorkerTeam>) => Promise<Result<{ id: number }>>
  update: (team: WorkerTeam) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>

  setSelectedItem: (item: WorkerTeam | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

/**
 * useWorkerTransfers 返回类型
 */
export interface UseWorkerTransfersReturn {
  data: WorkerTransferRecord[]
  loading: boolean
  error: string | null

  loadData: (workerId?: number) => Promise<void>
  create: (record: Partial<WorkerTransferRecord>) => Promise<Result<{ id: number }>>

  clearError: () => void
  refresh: () => Promise<void>
}

================
File: src/hooks/useWorkerTeamsActions.ts
================
import { useCallback } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseTeamsActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  loadTeams: () => Promise<void>
  selectedTeam: WorkerTeam | null
  setSelectedTeam: React.Dispatch<React.SetStateAction<WorkerTeam | null>>
}

interface UseTransfersActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  loadRecords: () => Promise<void>
}

export function useWorkerTeamsActions(deps: UseTeamsActionsDeps) {
  const { setError, setTeams, loadTeams, selectedTeam, setSelectedTeam } = deps

  // 创建班组
  const create = useCallback(async (data: Partial<WorkerTeam>): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createWorkerTeam(data as WorkerTeam)

      if (result.success) {
        await loadTeams()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTeams, setError])

  // 更新班组
  const update = useCallback(async (team: WorkerTeam): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateWorkerTeam(team)

      if (result.success) {
        await loadTeams()
        if (selectedTeam?.id === team.id) {
          setSelectedTeam(team)
        }
        return { success: true }
      }

      const errorMsg = result.error || '更新班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTeams, selectedTeam, setSelectedTeam, setError])

  // 删除班组
  const deleteTeam = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteWorkerTeam(id)

      if (result.success) {
        setTeams(prev => prev.filter(t => t.id !== id))
        if (selectedTeam?.id === id) {
          setSelectedTeam(null)
        }
        return { success: true }
      }

      const errorMsg = result.error || '删除班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedTeam, setTeams, setSelectedTeam, setError])

  return { create, update, deleteTeam }
}

export function useWorkerTransfersActions(deps: UseTransfersActionsDeps) {
  const { setError, loadRecords } = deps

  // 创建调动记录
  const create = useCallback(async (record: Partial<WorkerTransferRecord>): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createWorkerTransfer(record as WorkerTransferRecord)

      if (result.success) {
        await loadRecords()
        return { success: true, data: { id: result.data?.id || 0 } }
      }

      const errorMsg = result.error || '创建调动记录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadRecords, setError])

  return { create }
}

================
File: src/hooks/useWorkerTeamsLoaders.ts
================
import { useCallback } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseTeamsLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
}

interface UseTransfersLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setRecords: React.Dispatch<React.SetStateAction<WorkerTransferRecord[]>>
}

export function useWorkerTeamsLoaders(deps: UseTeamsLoadersDeps, projectId?: number) {
  const { setLoading, setError, setTeams } = deps

  const loadTeams = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getWorkerTeams()

      if (result.success && result.data) {
        let filteredData = result.data as WorkerTeam[]
        if (projectId) {
          filteredData = filteredData.filter(t => t.projectId === projectId)
        }
        setTeams(filteredData)
      } else {
        setError(result.error || '加载班组列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [projectId, setLoading, setError, setTeams])

  return { loadTeams }
}

export function useWorkerTransfersLoaders(deps: UseTransfersLoadersDeps) {
  const { setLoading, setError, setRecords } = deps

  const loadRecords = useCallback(async (workerId?: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getWorkerTransferRecords(workerId ?? 0)

      if (result.success && result.data) {
        setRecords(result.data as WorkerTransferRecord[])
      } else {
        setError(result.error || '加载调动记录失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setRecords])

  return { loadRecords }
}

================
File: src/hooks/useUpdater.tsx
================
import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import {
  checkUpdate, startDownload, subscribeDownloadProgress, applyUpdate, cancelDownload,
  type UpdateCheck, type DownloadProgress,
} from '../services/update-client'

export type UpdaterPhase = 'idle' | 'checking' | 'downloading' | 'verifying' | 'done' | 'error' | 'no-update' | 'cancelled' | 'paused'

interface UpdaterContextValue {
  info: UpdateCheck | null
  progress: DownloadProgress | null
  phase: UpdaterPhase
  error: string | null
  check: () => Promise<UpdateCheck | null>
  download: () => Promise<void>
  cancel: () => Promise<void>
  pause: () => Promise<void>
  resume: () => void
  retry: () => void
  setInfo: (v: UpdateCheck | null) => void
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null)

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<UpdateCheck | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [phase, setPhase] = useState<UpdaterPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const check = useCallback(async () => {
    setPhase('checking')
    setError(null)
    try {
      const r = await checkUpdate()
      if (r?.hasUpdate) {
        setInfo(r)
        setPhase('idle')
        return r
      } else {
        setPhase('no-update')
        return null
      }
    } catch {
      setPhase('error')
      setError('检查失败，请稍后重试')
      return null
    }
  }, [])

  const download = useCallback(async () => {
    setPhase('downloading')
    setError(null)
    const ok = await startDownload()
    if (!ok) {
      setPhase('error')
      setError('启动下载失败')
      return
    }
    const es = subscribeDownloadProgress((p) => {
      setProgress(p)
      if (p.phase === 'downloading') setPhase('downloading')
      if (p.phase === 'verifying') setPhase('verifying')
      if (p.phase === 'done') {
        es.close()
        esRef.current = null
        setPhase('done')
        if (p.filePath) applyUpdate(p.filePath).catch(() => {})
      }
      if (p.phase === 'error') {
        es.close()
        esRef.current = null
        setPhase('error')
        setError(p.error || '下载失败')
      }
      if (p.phase === 'cancelled') {
        es.close()
        esRef.current = null
        setPhase('cancelled')
      }
    })
    esRef.current = es
  }, [])

  const cancel = useCallback(async () => {
    await cancelDownload()
    esRef.current?.close()
    esRef.current = null
    setPhase('cancelled')
    setProgress(null)
  }, [])

  // 暂停：取消下载但保留 .part 文件和进度，可继续
  const pause = useCallback(async () => {
    await cancelDownload()
    esRef.current?.close()
    esRef.current = null
    setPhase('paused')
    // 保留 progress 数据，让用户看到已下载量
  }, [])

  // 继续：重新启动下载，后端检测到 .part 文件自动断点续传
  const resume = useCallback(() => {
    setPhase('idle')
    setError(null)
    download()
  }, [download])

  const retry = useCallback(() => {
    setPhase('idle')
    setProgress(null)
    setError(null)
    download()
  }, [download])

  const value: UpdaterContextValue = {
    info, progress, phase, error, check, download, cancel, pause, resume, retry, setInfo,
  }

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>
}

export function useUpdater() {
  const ctx = useContext(UpdaterContext)
  if (!ctx) throw new Error('useUpdater must be used within UpdaterProvider')
  return ctx
}





================================================================
End of Codebase
================================================================
