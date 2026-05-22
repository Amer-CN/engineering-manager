import { useState, useEffect, useCallback } from 'react'
import type { CostLedgerBatch } from '@/types'

export function useCostLedgerBatches(projectId: number) {
  const [batches, setBatches] = useState<CostLedgerBatch[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.getCostLedgerBatches) return
    setLoading(true)
    const res = await api.getCostLedgerBatches(projectId)
    if (res?.success) setBatches(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const createBatch = useCallback(async (name: string) => {
    const api = window.electronAPI
    const res = await api.createCostLedgerBatch(projectId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data!
    }
    return null
  }, [projectId])

  const deleteBatch = useCallback(async (batchId: number) => {
    const api = window.electronAPI
    const res = await api.deleteCostLedgerBatch(projectId, batchId)
    if (res?.success) {
      setBatches(prev => prev.filter(b => b.id !== batchId))
      return true
    }
    return false
  }, [projectId])

  const copyBatch = useCallback(async (sourceBatchId: number, name: string) => {
    const api = window.electronAPI
    const res = await api.copyCostLedgerBatch(projectId, sourceBatchId, name)
    if (res?.success) {
      setBatches(prev => [...prev, res.data!])
      return res.data as CostLedgerBatch
    }
    return null
  }, [projectId])

  const renameBatch = useCallback(async (batchId: number, name: string) => {
    const api = window.electronAPI
    const res = await api.renameCostLedgerBatch(projectId, batchId, name)
    if (res?.success) {
      setBatches(prev => prev.map(b => b.id === batchId ? { ...b, name } : b))
      return true
    }
    return false
  }, [projectId])

  return { batches, loading, reload: load, createBatch, copyBatch, renameBatch, deleteBatch }
}
