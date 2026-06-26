import { useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'
import type { ProjectWorker } from '@/types/electron'

export interface UseLaborProjectWorkerReturn {
  handleBatchAddWorkers: (entries: Partial<ProjectWorker>[]) => Promise<void>
  handleUpdateProjectWorker: (pwId: number, data: Partial<ProjectWorker>) => Promise<void>
  handleDeleteProjectWorker: (pwId: number) => Promise<void>
  handleTeamWorkerTransfer: (pwId: number, toTeamId: number) => Promise<void>
}

interface UseLaborProjectWorkerOptions {
  loadData: () => Promise<void>
}

export function useLaborProjectWorker({
  loadData,
}: UseLaborProjectWorkerOptions): UseLaborProjectWorkerReturn {
  const showToast = useToastStore(state => state.showToast)

  const handleBatchAddWorkers = useCallback(async (entries: Partial<ProjectWorker>[]) => {
    try {
      const result = await (await getAPI()).batchCreateProjectWorkers(entries)
      if (result.success) {
        showToast(`成功添加 ${entries.length} 名工人`, 'success')
        await loadData()
      } else {
        showToast(result.error || '添加失败', 'error')
      }
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : '添加失败'), 'error')
    }
  }, [loadData, showToast])

  const handleUpdateProjectWorker = useCallback(async (pwId: number, data: Partial<ProjectWorker>) => {
    try {
      const result = await (await getAPI()).updateProjectWorker({ id: pwId, ...data })
      if (result.success) {
        showToast('更新成功', 'success')
        await loadData()
      } else {
        showToast(result.error || '更新失败', 'error')
      }
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : '更新失败'), 'error')
    }
  }, [loadData, showToast])

  const handleDeleteProjectWorker = useCallback(async (pwId: number) => {
    try {
      const result = await (await getAPI()).deleteProjectWorker(pwId)
      if (result.success) {
        showToast('已移除', 'success')
        await loadData()
      } else {
        showToast(result.error || '移除失败', 'error')
      }
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : '移除失败'), 'error')
    }
  }, [loadData, showToast])

  const handleTeamWorkerTransfer = useCallback(async (pwId: number, toTeamId: number) => {
    try {
      const result = await (await getAPI()).updateProjectWorker({ id: pwId, teamId: toTeamId })
      if (result.success) {
        showToast('调组成功', 'success')
        await loadData()
      } else {
        showToast(result.error || '调组失败', 'error')
      }
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : '调组失败'), 'error')
    }
  }, [loadData, showToast])

  return {
    handleBatchAddWorkers,
    handleUpdateProjectWorker,
    handleDeleteProjectWorker,
    handleTeamWorkerTransfer,
  }
}
