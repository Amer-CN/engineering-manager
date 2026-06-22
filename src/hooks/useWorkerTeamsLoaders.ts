import { useCallback } from 'react'
import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import { handleError } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseTeamsLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setTeams: React.Dispatch<React.SetStateAction<WorkerTeam[]>>
}

interface UseTransfersLoadersDeps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setRecords: React.Dispatch<React.SetStateAction<WorkerTransferRecord[]>>
}

export function useWorkerTeamsLoaders(deps: UseTeamsLoadersDeps, projectId?: number) {
  const { setLoading, setError, setTeams } = deps

  const loadTeams = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getWorkerTeams()

      if (result.success && result.data) {
        let filteredData = result.data as WorkerTeam[]
        if (projectId) {
          filteredData = filteredData.filter(t => t.projectId === projectId)
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
  }, [projectId, setLoading, setError, setTeams])

  return { loadTeams }
}

export function useWorkerTransfersLoaders(deps: UseTransfersLoadersDeps) {
  const { setLoading, setError, setRecords } = deps

  const loadRecords = useCallback(async (workerId?: number) => {
    setLoading(true)
    setError(null)

    try {
      const result = await (await getAPI()).getWorkerTransferRecords(workerId ?? 0)

      if (result.success && result.data) {
        setRecords(result.data as WorkerTransferRecord[])
      } else {
        setError(result.error || '加载调动记录失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setRecords])

  return { loadRecords }
}