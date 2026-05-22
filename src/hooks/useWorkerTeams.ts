import { useState, useCallback, useEffect } from "react"
import type { WorkerTeam, WorkerTransferRecord } from "@/types"
import { handleError, Result, VoidResult } from "@/types"

/**
 * useWorkerTeams 返回类型
 */
export interface UseWorkerTeamsReturn {
  
  data: WorkerTeam[]
  loading: boolean
  error: string | null
  selectedItem: WorkerTeam | null
  
  
  loadData: () => Promise<void>
  create: (data: Partial<WorkerTeam>) => Promise<Result<{ id: number }>>
  update: (team: WorkerTeam) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  
  
  setSelectedItem: (item: WorkerTeam | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

/**
 * 农民工班组管理 Hook
 */
export function useWorkerTeams(projectId?: number): UseWorkerTeamsReturn {
  const [teams, setTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<WorkerTeam | null>(null)

  const loadTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getWorkerTeams()
      
      if (result.success && result.data) {
        let filteredData = result.data
        if (projectId) {
          filteredData = filteredData.filter((t: WorkerTeam) => t.projectId === projectId)
        }
        setTeams(filteredData)
      } else {
        setError(result.error || '加载班组列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const create = useCallback(async (data: Partial<WorkerTeam>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createWorkerTeam(data as WorkerTeam)
      
      if (result.success) {
        await loadTeams()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTeams])

  const update = useCallback(async (team: WorkerTeam): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateWorkerTeam(team)
      
      if (result.success) {
        await loadTeams()
        if (selectedTeam?.id === team.id) {
          setSelectedTeam(team)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadTeams, selectedTeam])

  const deleteTeam = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteWorkerTeam(id)
      
      if (result.success) {
        setTeams(prev => prev.filter(t => t.id !== id))
        if (selectedTeam?.id === id) {
          setSelectedTeam(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除班组失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedTeam])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadTeams()
  }, [loadTeams])

  const setSelectedItem = useCallback((item: WorkerTeam | null) => {
    setSelectedTeam(item)
  }, [])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  return {
    data: teams,
    loading,
    error,
    selectedItem: selectedTeam,
    loadData: loadTeams,
    create,
    update,
    delete: deleteTeam,
    setSelectedItem,
    clearError,
    refresh,
  }
}

/**
 * useWorkerTransfers 返回类型
 */
export interface UseWorkerTransfersReturn {
  
  data: WorkerTransferRecord[]
  loading: boolean
  error: string | null
  
  
  loadData: (workerId?: number) => Promise<void>
  create: (record: Partial<WorkerTransferRecord>) => Promise<Result<{ id: number }>>
  
  
  clearError: () => void
  refresh: () => Promise<void>
}

/**
 * 工人调动记录 Hook
 */
export function useWorkerTransfers(): UseWorkerTransfersReturn {
  const [records, setRecords] = useState<WorkerTransferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = useCallback(async (workerId?: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getWorkerTransferRecords(workerId ?? 0)
      
      if (result.success && result.data) {
        setRecords(result.data)
      } else {
        setError(result.error || '加载调动记录失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (record: Partial<WorkerTransferRecord>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createWorkerTransfer(record as WorkerTransferRecord)
      
      if (result.success) {
        await loadRecords()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建调动记录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadRecords])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadRecords()
  }, [loadRecords])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return {
    data: records,
    loading,
    error,
    loadData: loadRecords,
    create,
    clearError,
    refresh,
  }
}