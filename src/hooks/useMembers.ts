/**
 * useMembers Hook
 * 
 * 人员管理 Hook - 提供人员管理相关的状态和操作
 */

import { useState, useCallback, useEffect } from 'react'
import type { Member, MemberType, WorkerType, WorkerStatus, WorkerTeam, WorkerTransferRecord } from '@/types'
import { handleError, Result, VoidResult, isSuccess } from '@/types'

// Types

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

// Hook Implementation

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

  // 数据加载
  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getMembers()
      
      if (result.success && result.data) {
        // 应用筛选条件
        let filteredData = result.data
        
        if (filters?.type) {
          filteredData = filteredData.filter((m: Member) => m.memberType === filters.type)
        }
        
        if (filters?.workerType) {
          filteredData = filteredData.filter((m: Member) => m.workerType === filters.workerType)
        }
        
        if (filters?.status) {
          filteredData = filteredData.filter((m: Member) => m.status === filters.status)
        }
        
        if (filters?.projectId) {
          filteredData = filteredData.filter((m: Member) => m.projectId === filters.projectId)
        }
        
        if (filters?.teamId) {
          filteredData = filteredData.filter((m: Member) => m.teamId === filters.teamId)
        }
        
        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter((m: Member) => 
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
  }, [filters?.type, filters?.workerType, filters?.status, filters?.projectId, filters?.teamId, filters?.searchTerm])

  // CRUD 操作
  
  // 创建成员
  const create = useCallback(async (data: CreateMemberDTO): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createMember(data as Member)
      
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
  }, [loadMembers])

  // 更新成员
  const update = useCallback(async (member: Member): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateMember(member)
      
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
  }, [loadMembers, selectedMember])

  // 删除成员
  const deleteMember = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteMember(id)
      
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
  }, [selectedMember])

  // 辅助方法
  
  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadMembers()
  }, [loadMembers])

  // 设置选中成员
  const setSelectedItem = useCallback((item: Member | null) => {
    setSelectedMember(item)
  }, [])

  // 副作用
  
  // 初始加载
  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // 返回值
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
