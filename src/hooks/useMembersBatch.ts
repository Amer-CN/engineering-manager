import { useCallback } from 'react'
import type { ProjectWorker } from '../types/electron'
import { useToastStore } from '../store/toastStore'
import { getAPI } from '../services/api-adapter'

interface UseMembersBatchOptions {
  loadData: () => Promise<void>
}

export function useMembersBatch({ loadData }: UseMembersBatchOptions) {
  const showToast = useToastStore(state => state.showToast)

  const handleBatchAddWorkers = useCallback(async (entries: Partial<ProjectWorker>[]) => {
    try {
      const result = await (await getAPI()).batchCreateProjectWorkers(entries)
      if (result.success) {
        showToast(`成功添加 ${entries.length} 名工人`, 'success')
        loadData()
      } else {
        showToast(result.error || '添加失败', 'error')
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '添加失败', 'error')
    }
  }, [showToast, loadData])

  return { handleBatchAddWorkers }
}
