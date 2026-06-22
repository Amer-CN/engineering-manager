import { useCallback } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseTeamsActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
  loadTeams: () => Promise<void>
  selectedTeam: WorkerTeam | null
  setSelectedTeam: React.Dispatch<React.SetStateAction<WorkerTeam | null>>
}

interface UseTransfersActionsDeps {
  setError: React.Dispatch<React.SetStateAction<string | null>>
  loadRecords: () => Promise<void>
}

export function useWorkerTeamsActions(deps: UseTeamsActionsDeps) {
  const { setError, setTeams, loadTeams, selectedTeam, setSelectedTeam } = deps

  // 创建班组
  const create = useCallback(async (data: Partial<WorkerTeam>): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createWorkerTeam(data as WorkerTeam)

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
  }, [loadTeams, setError])

  // 更新班组
  const update = useCallback(async (team: WorkerTeam): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).updateWorkerTeam(team)

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
  }, [loadTeams, selectedTeam, setSelectedTeam, setError])

  // 删除班组
  const deleteTeam = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)

    try {
      const result = await (await getAPI()).deleteWorkerTeam(id)

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
  }, [selectedTeam, setTeams, setSelectedTeam, setError])

  return { create, update, deleteTeam }
}

export function useWorkerTransfersActions(deps: UseTransfersActionsDeps) {
  const { setError, loadRecords } = deps

  // 创建调动记录
  const create = useCallback(async (record: Partial<WorkerTransferRecord>): Promise<Result<{ id: number }>> => {
    setError(null)

    try {
      const result = await (await getAPI()).createWorkerTransfer(record as WorkerTransferRecord)

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
  }, [loadRecords, setError])

  return { create }
}