import { useState, useCallback } from 'react'
import type { PaymentRecord, InvoiceType } from '@/types'
import { handleError, Result, VoidResult } from '@/types'

export interface UsePaymentRecordsReturn {
  data: PaymentRecord[]
  loading: boolean
  error: string | null
  selectedItem: PaymentRecord | null

  loadData: (type?: string) => Promise<void>
  create: (data: Partial<PaymentRecord>) => Promise<Result<{ id: number }>>
  update: (record: PaymentRecord) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>

  setSelectedItem: (item: PaymentRecord | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function usePaymentRecords(): UsePaymentRecordsReturn {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null)

  const loadRecords = useCallback(async (type?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.getPaymentRecords(type as InvoiceType)
      if (result.success && result.data) { setRecords(result.data) }
      else { setError(result.error || 'Failed to load payment records') }
    } catch (err) { setError(handleError(err).getUserMessage()) }
    finally { setLoading(false) }
  }, [])

  const create = useCallback(async (data: Partial<PaymentRecord>): Promise<Result<{ id: number }>> => {
    setError(null)
    try {
      const result = await window.electronAPI.createPaymentRecord(data)
      if (result.success) { await loadRecords(); return { success: true, data: { id: result.data?.id || 0 } } }
      return { success: false, error: result.error || 'Failed to create payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const update = useCallback(async (record: PaymentRecord): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await window.electronAPI.updatePaymentRecord(record)
      if (result.success) { await loadRecords(); return { success: true } }
      return { success: false, error: result.error || 'Failed to update payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const deleteRecord = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    try {
      const result = await window.electronAPI.deletePaymentRecord(id)
      if (result.success) { await loadRecords(); return { success: true } }
      return { success: false, error: result.error || 'Failed to delete payment record' }
    } catch (err) { return { success: false, error: handleError(err).getUserMessage() } }
  }, [loadRecords])

  const setSelectedItem = useCallback((item: PaymentRecord | null) => { setSelectedRecord(item) }, [])
  const clearError = useCallback(() => { setError(null) }, [])
  const refresh = useCallback(async () => { await loadRecords() }, [loadRecords])

  return { data: records, loading, error, selectedItem: selectedRecord, loadData: loadRecords, create, update, delete: deleteRecord, setSelectedItem, clearError, refresh }
}
