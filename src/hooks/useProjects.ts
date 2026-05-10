/**
 * useProjects Hook
 * 
 * 项目管理 Hook - 提供项目管理相关的状态和操作
 */

import { useState, useCallback, useEffect } from 'react'
import type { Project } from '@/types'
import { handleError, Result, VoidResult, isSuccess } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 项目筛选条件
 */
export interface ProjectFilters {
  status?: Project['status']
  searchTerm?: string
  managerId?: number
}

/**
 * 创建项目 DTO
 */
export type CreateProjectDTO = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * 更新项目 DTO
 */
export type UpdateProjectDTO = Partial<Omit<Project, 'createdAt'>>

/**
 * useProjects 返回类型
 */
export interface UseProjectsReturn {
  // 数据状态
  data: Project[]
  loading: boolean
  error: string | null
  selectedItem: Project | null
  
  // 操作方法
  loadData: () => Promise<void>
  create: (data: CreateProjectDTO) => Promise<Result<{ id: number }>>
  update: (project: Project) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  // 辅助方法
  setSelectedItem: (item: Project | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 项目管理 Hook
 * 
 * @param filters - 可选的初始筛选条件
 * 
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const {
 *     data: projects,
 *     loading,
 *     error,
 *     create,
 *     update,
 *     delete: deleteProject,
 *     refresh
 *   } = useProjects()
 * 
 *   // 使用...
 * }
 * ```
 */
export function useProjects(filters?: ProjectFilters): UseProjectsReturn {
  // ═══════════════════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════════════════
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // 数据加载
  // ═══════════════════════════════════════════════════════════════════════════
  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getProjects()
      
      if (result.success && result.data) {
        // 应用筛选条件
        let filteredData = result.data
        
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
  }, [filters?.status, filters?.searchTerm, filters?.managerId])

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD 操作
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 创建项目
   */
  const create = useCallback(async (data: CreateProjectDTO): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createProject(data as Project)
      
      if (result.success) {
        await loadProjects() // 刷新列表
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
  }, [loadProjects])

  /**
   * 更新项目
   */
  const update = useCallback(async (project: Project): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateProject(project)
      
      if (result.success) {
        await loadProjects()
        // 更新选中项
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
  }, [loadProjects, selectedProject])

  /**
   * 删除项目
   */
  const deleteProject = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteProject(id)
      
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
  }, [selectedProject])

  // ═══════════════════════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  /**
   * 设置选中项目
   */
  const setSelectedItem = useCallback((item: Project | null) => {
    setSelectedProject(item)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // 副作用
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 初始加载
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // ═══════════════════════════════════════════════════════════════════════════
  // 返回值
  // ═══════════════════════════════════════════════════════════════════════════
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
