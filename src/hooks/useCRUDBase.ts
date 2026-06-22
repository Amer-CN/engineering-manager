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