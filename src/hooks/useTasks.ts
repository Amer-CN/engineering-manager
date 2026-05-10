/**
 * useTasks Hook
 * 
 * 任务管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { Task } from '@/types'
import { handleError, Result, VoidResult } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 任务筛选条件
 */
export interface TaskFilters {
  projectId?: number
  status?: Task['status']
  assigneeId?: number
  searchTerm?: string
}

/**
 * useTasks 返回类型
 */
export interface UseTasksReturn {
  data: Task[]
  loading: boolean
  error: string | null
  selectedItem: Task | null
  
  loadData: (projectId?: number) => Promise<void>
  create: (data: Partial<Task>) => Promise<Result<{ id: number }>>
  update: (task: Task) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  setSelectedItem: (item: Task | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 任务管理 Hook
 */
export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const loadTasks = useCallback(async (projectId?: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getTasks(projectId)
      
      if (result.success && result.data) {
        let filteredData = result.data
        
        if (filters?.status) {
          filteredData = filteredData.filter((t: Task) => t.status === filters.status)
        }
        
        if (filters?.assigneeId) {
          filteredData = filteredData.filter((t: Task) => t.assigneeId === filters.assigneeId)
        }
        
        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter((t: Task) => 
            t.title.toLowerCase().includes(term) ||
            t.description?.toLowerCase().includes(term)
          )
        }
        
        setTasks(filteredData)
      } else {
        setError(result.error || '加载任务列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.assigneeId, filters?.searchTerm])

  const create = useCallback(async (data: Partial<Task>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createTask(data as Task)
      
      if (result.success) {
        await loadTasks()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建任务失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTasks])

  const update = useCallback(async (task: Task): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateTask(task)
      
      if (result.success) {
        await loadTasks()
        if (selectedTask?.id === task.id) {
          setSelectedTask(task)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新任务失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTasks, selectedTask])

  const deleteTask = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteTask(id)
      
      if (result.success) {
        setTasks(prev => prev.filter(t => t.id !== id))
        if (selectedTask?.id === id) {
          setSelectedTask(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除任务失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedTask])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadTasks()
  }, [loadTasks])

  const setSelectedItem = useCallback((item: Task | null) => {
    setSelectedTask(item)
  }, [])

  useEffect(() => {
    loadTasks(filters?.projectId)
  }, [loadTasks, filters?.projectId])

  return {
    data: tasks,
    loading,
    error,
    selectedItem: selectedTask,
    loadData: loadTasks,
    create,
    update,
    delete: deleteTask,
    setSelectedItem,
    clearError,
    refresh,
  }
}
