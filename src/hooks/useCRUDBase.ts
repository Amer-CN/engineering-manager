import { useState, useCallback, useEffect, useRef } from 'react'
import { handleError, type Result, type VoidResult } from '@/types'
import type { CRUDAPI, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase.types'
export type { APIResponse, CRUDAPI, CRUDState, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase.types'

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
