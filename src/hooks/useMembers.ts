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