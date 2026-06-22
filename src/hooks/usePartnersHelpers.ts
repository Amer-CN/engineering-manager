import type { Partner } from '@/types'
import { handleError, Result, VoidResult } from '@/types'
import { getAPI } from '@/services/api-adapter'

export function createPartnerCrud(
  loadPartners: () => Promise<void>,
  setError: (error: string | null) => void,
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>,
  selectedPartner: Partner | null,
  setSelectedPartner: (item: Partner | null) => void,
) {
  const create = async (data: Partial<Partner>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await (await getAPI()).createPartner(data as Partner)
      if (result.success) {
        await loadPartners()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      const errorMsg = result.error || '创建合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  const update = async (partner: Partner): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).updatePartner(partner)
      if (result.success) {
        await loadPartners()
        if (selectedPartner?.id === partner.id) {
          setSelectedPartner(partner)
        }
        return { success: true }
      }
      const errorMsg = result.error || '更新合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  const deletePartner = async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await (await getAPI()).deletePartner(id)
      if (result.success) {
        setPartners(prev => prev.filter(p => p.id !== id))
        if (selectedPartner?.id === id) {
          setSelectedPartner(null)
        }
        return { success: true }
      }
      const errorMsg = result.error || '删除合作单位失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }

  return { create, update, deletePartner }
}
