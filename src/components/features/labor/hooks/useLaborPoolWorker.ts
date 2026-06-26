import { useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import { getAPI } from '@/services/api-adapter'

export interface UseLaborPoolWorkerReturn {
  handleSubmitPoolWorker: (formData: any, editingWorker?: any | null) => Promise<void>
  handleDeletePoolWorker: (workerId: number) => Promise<void>
}

interface UseLaborPoolWorkerOptions {
  loadData: () => Promise<void>
  onSuccess?: () => void
}

export function useLaborPoolWorker({
  loadData,
  onSuccess,
}: UseLaborPoolWorkerOptions): UseLaborPoolWorkerReturn {
  const showToast = useToastStore(state => state.showToast)

  const handleSubmitPoolWorker = useCallback(async (formData: any, editingWorker?: any | null) => {
    const data = {
      name: formData.name,
      phone: formData.phone,
      idCard: formData.idCard,
      gender: formData.gender || undefined,
      ethnicity: formData.ethnicity || undefined,
      birthDate: formData.birthDate || undefined,
      address: formData.idCardAddress || undefined,
      bankAccount: formData.bankAccount || undefined,
      bankName: formData.bankName || undefined,
      bankLineNo: formData.bankLineNo || undefined,
      workerType: formData.workerType || undefined,
      dailyWage: formData.dailyWage != null && formData.dailyWage !== '' ? Number(formData.dailyWage) : undefined,
    }

    try {
      if (editingWorker) {
        const result = await (await getAPI()).updateWorker({
          id: editingWorker.workerId || editingWorker.id,
          ...data,
        })
        if (result.success) {
          showToast('工人信息已更新', 'success')
          await loadData()
          if (onSuccess) onSuccess()
        } else {
          showToast(result.error || '更新失败', 'error')
        }
      } else {
        const result = await (await getAPI()).createWorker(data)
        if (result.success) {
          showToast('工人已添加', 'success')
          await loadData()
          if (onSuccess) onSuccess()
        } else {
          showToast(result.error || '添加失败', 'error')
        }
      }
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }, [loadData, showToast, onSuccess])

  const handleDeletePoolWorker = useCallback(async (workerId: number) => {
    try {
      const result = await (await getAPI()).deleteWorker(workerId)
      if (result.success) {
        showToast('工人已删除', 'success')
        await loadData()
      } else {
        showToast(result.error || '删除失败', 'error')
      }
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }, [loadData, showToast])

  return { handleSubmitPoolWorker, handleDeletePoolWorker }
}
