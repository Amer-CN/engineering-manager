import type { WorkerTeam, WorkerTransferRecord } from '@/types'
import type { Result, VoidResult } from '@/types'

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