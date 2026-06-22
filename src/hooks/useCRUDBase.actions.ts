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