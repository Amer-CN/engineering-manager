import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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

  // 稳定化传给 loaders 的 api 引用: 若每次渲染新建 { getAll } 会使 loadData 身份变化,
  // 导致下方 autoLoad effect (依赖 loadData) 每次渲染重跑 → 无限重载, loading 无法落定
  const loaderApi = useMemo(() => ({ getAll: api.getAll }), [api.getAll])
  const { loadData } = useCRUDBaseLoaders<T>({
    api: loaderApi, errorPrefix, mountedRef, setData, setLoading, setError, onLoaded,
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