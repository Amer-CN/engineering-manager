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