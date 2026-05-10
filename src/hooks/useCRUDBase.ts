/**
 * useCRUDBase Hook
 * 
 * CRUD 基础 Hook - 提供通用的 CRUD 状态管理逻辑
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { handleError, Result, VoidResult } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * API 响应结果
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * CRUD API 接口
 */
export interface CRUDAPI<T, CreateDTO = Partial<T>, UpdateDTO = T> {
  getAll: () => Promise<APIResponse<T[]>>
  create?: (data: CreateDTO) => Promise<APIResponse<{ id: number }>>
  update?: (data: UpdateDTO) => Promise<APIResponse<void>>
  delete?: (id: number) => Promise<APIResponse<void>>
}

/**
 * 基础 CRUD 状态
 */
export interface CRUDState<T> {
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
}

/**
 * useCRUDBase 配置项
 */
export interface UseCRUDBaseOptions<T, CreateDTO, UpdateDTO> {
  /** API 接口 */
  api: CRUDAPI<T, CreateDTO, UpdateDTO>
  /** 初始数据 */
  initialData?: T[]
  /** 是否自动加载 */
  autoLoad?: boolean
  /** 错误消息前缀 */
  errorPrefix?: string
  /** 加载完成后的回调 */
  onLoaded?: (data: T[]) => void
}

/**
 * useCRUDBase 返回类型
 */
export interface UseCRUDBaseReturn<T, CreateDTO, UpdateDTO> {
  // 状态
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
  
  // 数据操作
  loadData: () => Promise<T[]>
  create: (data: CreateDTO) => Promise<Result<{ id: number }>>
  update: (item: UpdateDTO) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  // 辅助方法
  setSelectedItem: (item: T | null) => void
  clearError: () => void
  refresh: () => Promise<void>
  setData: (data: T[]) => void
  
  // 直接更新数据的方法（用于复杂操作后优化性能）
  updateData: (updater: (prev: T[]) => T[]) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CRUD 基础 Hook
 * 
 * 提供通用的 CRUD 状态管理逻辑，减少重复代码
 * 
 * @example
 * ```tsx
 * // 方式1：直接使用 API 对象
 * const { data, loading, create, update, delete: remove } = useCRUDBase({
 *   api: {
 *     getAll: () => window.electronAPI.getProjects(),
 *     create: (data) => window.electronAPI.createProject(data),
 *     update: (data) => window.electronAPI.updateProject(data),
 *     delete: (id) => window.electronAPI.deleteProject(id),
 *   },
 *   errorPrefix: '项目'
 * })
 * 
 * // 方式2：使用 getById 加载单条数据
 * const { data, loading } = useCRUDBase({
 *   api: {
 *     getAll: () => window.electronAPI.getProject(id),
 *   }
 * })
 * ```
 */
export function useCRUDBase<T extends { id: number }, CreateDTO = Partial<T>, UpdateDTO = T>(
  options: UseCRUDBaseOptions<T, CreateDTO, UpdateDTO>
): UseCRUDBaseReturn<T, CreateDTO, UpdateDTO> {
  const {
    api,
    initialData = [],
    autoLoad = true,
    errorPrefix = '操作',
    onLoaded,
  } = options

  // ═══════════════════════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════════════════════
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  
  // 用于避免竞态条件
  const mountedRef = useRef(true)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 数据加载
  // ═══════════════════════════════════════════════════════════════════════════════
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
      if (mountedRef.current) {
        setError(errorMsg)
      }
      return []
    } catch (err) {
      const appError = handleError(err)
      const errorMsg = appError.getUserMessage()
      if (mountedRef.current) {
        setError(errorMsg)
      }
      return []
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [api, errorPrefix, onLoaded])

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRUD 操作
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * 创建
   */
  const create = useCallback(async (createData: CreateDTO): Promise<Result<{ id: number }>> => {
    if (!api.create) {
      return { success: false, error: '不支持创建操作' }
    }
    
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
  }, [api, errorPrefix, loadData])

  /**
   * 更新
   */
  const update = useCallback(async (updateData: UpdateDTO): Promise<VoidResult> => {
    if (!api.update) {
      return { success: false, error: '不支持更新操作' }
    }
    
    setError(null)
    
    try {
      const result = await api.update(updateData)
      
      if (result.success) {
        await loadData()
        // 更新选中项
        const updated = updateData as unknown as T
        if (selectedItem?.id === updated.id) {
          setSelectedItem(updated)
        }
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
  }, [api, errorPrefix, loadData, selectedItem])

  /**
   * 删除
   */
  const deleteItem = useCallback(async (id: number): Promise<VoidResult> => {
    if (!api.delete) {
      return { success: false, error: '不支持删除操作' }
    }
    
    setError(null)
    
    try {
      const result = await api.delete(id)
      
      if (result.success) {
        // 乐观更新
        setData(prev => prev.filter(item => item.id !== id))
        if (selectedItem?.id === id) {
          setSelectedItem(null)
        }
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
  }, [api, errorPrefix, selectedItem])

  // ═══════════════════════════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  const updateData = useCallback((updater: (prev: T[]) => T[]) => {
    setData(updater)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════════
  // 副作用
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // 组件挂载标记
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadData()
    }
  }, [autoLoad, loadData])

  // ═══════════════════════════════════════════════════════════════════════════════
  // 返回值
  // ═══════════════════════════════════════════════════════════════════════════════
  return {
    data,
    loading,
    error,
    selectedItem,
    loadData,
    create,
    update,
    delete: deleteItem,
    setSelectedItem,
    clearError,
    refresh,
    setData,
    updateData,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 快捷 Hook 工厂函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建通用的 CRUD Hook
 * 
 * @param api - API 接口对象
 * @param errorPrefix - 错误消息前缀
 * @param autoLoad - 是否自动加载
 */
export function createCRUDHook<T extends { id: number }, CreateDTO = Partial<T>, UpdateDTO = T>(
  api: CRUDAPI<T, CreateDTO, UpdateDTO>,
  errorPrefix: string = '操作',
  autoLoad: boolean = true
) {
  return (options?: { initialData?: T[]; onLoaded?: (data: T[]) => void }) => {
    return useCRUDBase({
      api,
      errorPrefix,
      autoLoad,
      ...options,
    })
  }
}
