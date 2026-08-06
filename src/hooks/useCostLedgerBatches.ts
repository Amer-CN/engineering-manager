import { useState, useEffect, useCallback } from 'react'
import type { CostLedgerBatch } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from './usePermission'

export function useCostLedgerBatches(projectId: number) {
  const { can } = usePermission()
  const [batches, setBatches] = useState<CostLedgerBatch[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const api = await getAPI()
    if (!api?.getCostLedgerBatches) return
    setLoading(true)
    const res = await api.getCostLedgerBatches(projectId)
    if (res?.success) setBatches(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const createBatch = useCallback(async (name: string) => {
    // G2 B9: 新建批次 → costLedger:create
    if (!can('costLedger:create')) return null
    const api = await getAPI()
    const res = await api.createCostLedgerBatch(projectId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data!
    }
    return null
  }, [projectId])

  const deleteBatch = useCallback(async (batchId: number) => {
    // G2 B9: 删除批次 → costLedger:delete
    if (!can('costLedger:delete')) return false
    const api = await getAPI()
    const res = await api.deleteCostLedgerBatch(projectId, batchId)
    if (res?.success) {
      setBatches(prev => prev.filter(b => b.id !== batchId))
      return true
    }
    return false
  }, [projectId])

  const copyBatch = useCallback(async (sourceBatchId: number, name: string) => {
    // G2 B9: 复制批次 → costLedger:create
    if (!can('costLedger:create')) return null
    const api = await getAPI()
    const res = await api.copyCostLedgerBatch(projectId, sourceBatchId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data as CostLedgerBatch
    }
    return null
  }, [projectId])

  const renameBatch = useCallback(async (batchId: number, name: string) => {
    // G2 B9: 批次重命名 → costLedger:update
    if (!can('costLedger:update')) return false
    const api = await getAPI()
    const res = await api.renameCostLedgerBatch(projectId, batchId, name)
    if (res?.success) {
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, name } : b))
      return true
    }
    return false
  }, [projectId])

  return { batches, loading, reload: load, createBatch, copyBatch, renameBatch, deleteBatch }
}
