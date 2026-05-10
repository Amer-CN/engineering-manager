/**
 * usePartners Hook
 * 
 * 合作单位管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { Partner, PartnerCategory, Region, Supervisor, SupervisorCategory } from '@/types'
import { handleError, Result, VoidResult } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// usePartners Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsePartnersReturn {
  data: Partner[]
  loading: boolean
  error: string | null
  selectedItem: Partner | null
  
  loadData: () => Promise<void>
  create: (data: Partial<Partner>) => Promise<Result<{ id: number }>>
  update: (partner: Partner) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  setSelectedItem: (item: Partner | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function usePartners(): UsePartnersReturn {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)

  const loadPartners = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getPartners()
      
      if (result.success && result.data) {
        setPartners(result.data)
      } else {
        setError(result.error || '加载合作单位列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<Partner>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createPartner(data as Partner)
      
      if (result.success) {
        await loadPartners()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadPartners])

  const update = useCallback(async (partner: Partner): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updatePartner(partner)
      
      if (result.success) {
        await loadPartners()
        if (selectedPartner?.id === partner.id) {
          setSelectedPartner(partner)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadPartners, selectedPartner])

  const deletePartner = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deletePartner(id)
      
      if (result.success) {
        setPartners(prev => prev.filter(p => p.id !== id))
        if (selectedPartner?.id === id) {
          setSelectedPartner(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedPartner])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadPartners()
  }, [loadPartners])

  const setSelectedItem = useCallback((item: Partner | null) => {
    setSelectedPartner(item)
  }, [])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  return {
    data: partners,
    loading,
    error,
    selectedItem: selectedPartner,
    loadData: loadPartners,
    create,
    update,
    delete: deletePartner,
    setSelectedItem,
    clearError,
    refresh,
  }
}
