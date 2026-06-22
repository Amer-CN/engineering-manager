/**
 * useWorkerTeams + useWorkerTransfers Hooks
 *
 * 农民工班组管理 + 工人调动记录管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import type { UseWorkerTeamsReturn, UseWorkerTransfersReturn } from './useWorkerTeams.types'
import {
  useWorkerTeamsLoaders,
  useWorkerTransfersLoaders,
} from './useWorkerTeamsLoaders'
import {
  useWorkerTeamsActions,
  useWorkerTransfersActions,
} from './useWorkerTeamsActions'

export type { UseWorkerTeamsReturn, UseWorkerTransfersReturn } from './useWorkerTeams.types'

/**
 * 农民工班组管理 Hook
 */
export function useWorkerTeams(projectId?: number): UseWorkerTeamsReturn {
  const [teams, setTeams] = useState<WorkerTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<WorkerTeam | null>(null)

  const { loadTeams } = useWorkerTeamsLoaders(
    { setLoading, setError, setTeams },
    projectId,
  )

  const { create, update, deleteTeam } = useWorkerTeamsActions({
    setError,
    setTeams,
    loadTeams,
    selectedTeam,
    setSelectedTeam,
  })

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
 * 工人调动记录 Hook
 */
export function useWorkerTransfers(): UseWorkerTransfersReturn {
  const [records, setRecords] = useState<WorkerTransferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loadRecords } = useWorkerTransfersLoaders({
    setLoading,
    setError,
    setRecords,
  })

  const { create } = useWorkerTransfersActions({
    setError,
    loadRecords,
  })

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