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

// ═══════════════════════════════════════════════════════════════════════════════
// useRegions Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseRegionsReturn {
  data: Region[]
  loading: boolean
  error: string | null
  
  loadData: () => Promise<void>
  create: (data: Partial<Region>) => Promise<Result<{ id: number }>>
  delete: (id: number) => Promise<VoidResult>
  
  clearError: () => void
  refresh: () => Promise<void>
}

export function useRegions(): UseRegionsReturn {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRegions = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getRegions()
      
      if (result.success && result.data) {
        setRegions(result.data)
      } else {
        setError(result.error || '加载地区列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<Region>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createRegion(data as Region)
      
      if (result.success) {
        await loadRegions()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建地区失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadRegions])

  const deleteRegion = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteRegion(id)
      
      if (result.success) {
        setRegions(prev => prev.filter(r => r.id !== id))
        return { success: true }
      }
      
      const errorMsg = result.error || '删除地区失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadRegions()
  }, [loadRegions])

  useEffect(() => {
    loadRegions()
  }, [loadRegions])

  return {
    data: regions,
    loading,
    error,
    loadData: loadRegions,
    create,
    delete: deleteRegion,
    clearError,
    refresh,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// useSupervisors Hook
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseSupervisorsReturn {
  data: Supervisor[]
  loading: boolean
  error: string | null
  selectedItem: Supervisor | null
  
  loadData: () => Promise<void>
  create: (data: Partial<Supervisor>) => Promise<Result<{ id: number }>>
  update: (supervisor: Supervisor) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  setSelectedItem: (item: Supervisor | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function useSupervisors(): UseSupervisorsReturn {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null)

  const loadSupervisors = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getSupervisors()
      
      if (result.success && result.data) {
        setSupervisors(result.data)
      } else {
        setError(result.error || '加载监管单位列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<Supervisor>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createSupervisor(data as Supervisor)
      
      if (result.success) {
        await loadSupervisors()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建监管单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadSupervisors])

  const update = useCallback(async (supervisor: Supervisor): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateSupervisor(supervisor)
      
      if (result.success) {
        await loadSupervisors()
        if (selectedSupervisor?.id === supervisor.id) {
          setSelectedSupervisor(supervisor)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新监管单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadSupervisors, selectedSupervisor])

  const deleteSupervisor = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteSupervisor(id)
      
      if (result.success) {
        setSupervisors(prev => prev.filter(s => s.id !== id))
        if (selectedSupervisor?.id === id) {
          setSelectedSupervisor(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除监管单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedSupervisor])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadSupervisors()
  }, [loadSupervisors])

  const setSelectedItem = useCallback((item: Supervisor | null) => {
    setSelectedSupervisor(item)
  }, [])

  useEffect(() => {
    loadSupervisors()
  }, [loadSupervisors])

  return {
    data: supervisors,
    loading,
    error,
    selectedItem: selectedSupervisor,
    loadData: loadSupervisors,
    create,
    update,
    delete: deleteSupervisor,
    setSelectedItem,
    clearError,
    refresh,
  }
}
