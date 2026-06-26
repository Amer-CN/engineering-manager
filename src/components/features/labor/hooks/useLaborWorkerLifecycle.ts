import { useCallback } from 'react'
import type { Member, WorkerTeam, WorkerStatus } from '../../../../types/electron'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'

interface UseLaborWorkerLifecycleOptions {
  loadData: () => Promise<void>
}

export interface UseLaborWorkerLifecycleReturn {
  handleWorkerTransfer: (worker: Member, toTeamId: number, toProjectId: number, transferDate: string, reason: string, workerTeams: WorkerTeam[]) => Promise<void>
  handleWorkerLeave: (worker: Member, actualLeaveDate: string, remarks: string) => Promise<void>
  handleWorkerReEntry: (worker: Member) => Promise<void>
  handleStaffStatusChange: (member: Member, status: string) => Promise<void>
}

export function useLaborWorkerLifecycle({
  loadData,
}: UseLaborWorkerLifecycleOptions): UseLaborWorkerLifecycleReturn {
  const showToast = useToastStore(state => state.showToast)

  const handleWorkerTransfer = useCallback(async (
    worker: Member, toTeamId: number, toProjectId: number,
    transferDate: string, reason: string, _wt: WorkerTeam[]
  ) => {
    try {
      const pwId = (worker as Member & { projectWorkerId?: number }).projectWorkerId || worker.id
      const api = await getAPI()
      const r = await api.updateProjectWorker({ id: pwId, teamId: toTeamId, projectId: toProjectId })
      if (r.success) {
        await api.createWorkerTransfer({
          workerId: worker.id, fromTeamId: worker.teamId || 0, toTeamId,
          fromProjectId: worker.projectId || 0, toProjectId, transferDate, reason,
        })
        showToast('调转成功', 'success'); await loadData()
      } else { showToast(r.error || '调转失败', 'error') }
    } catch (err: unknown) { showToast((err instanceof Error ? err.message : '调转失败'), 'error') }
  }, [loadData, showToast])

  const handleWorkerLeave = useCallback(async (worker: Member, actualLeaveDate: string, remarks: string) => {
    try {
      const r = await (await getAPI()).updateMember({
        ...worker, status: 'left' as WorkerStatus, actualLeaveDate, remarks,
      })
      if (r.success) { showToast('已办理离场', 'success'); await loadData() }
      else { showToast(r.error || '操作失败', 'error') }
    } catch (err: unknown) { showToast((err instanceof Error ? err.message : '操作失败'), 'error') }
  }, [loadData, showToast])

  const handleWorkerReEntry = useCallback(async (worker: Member) => {
    try {
      const r = await (await getAPI()).updateMember({
        ...worker, status: 'active' as WorkerStatus, actualLeaveDate: undefined,
        reentryDate: new Date().toISOString().split('T')[0],
      })
      if (r.success) { showToast('已办理重新入职', 'success'); await loadData() }
      else { showToast(r.error || '操作失败', 'error') }
    } catch (err: unknown) { showToast((err instanceof Error ? err.message : '操作失败'), 'error') }
  }, [loadData, showToast])

  const handleStaffStatusChange = useCallback(async (member: Member, status: string) => {
    try {
      const r = await (await getAPI()).updateMember({ ...member, status: status as WorkerStatus })
      if (r.success) { showToast('状态已更新', 'success'); await loadData() }
      else { showToast(r.error || '操作失败', 'error') }
    } catch (err: unknown) { showToast((err instanceof Error ? err.message : '操作失败'), 'error') }
  }, [loadData, showToast])

  return { handleWorkerTransfer, handleWorkerLeave, handleWorkerReEntry, handleStaffStatusChange }
}
