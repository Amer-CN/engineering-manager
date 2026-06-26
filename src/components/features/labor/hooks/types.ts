import type { Member, WorkerTeam } from '../../../../types/electron'

export interface UseLaborOperationsOptions {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  loadData: () => Promise<void>
  editingWorker?: any | null
  onSuccess?: () => void
}
