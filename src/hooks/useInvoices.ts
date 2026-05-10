/**
 * useInvoices Hook
 * 
 * 发票管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'
import type { Invoice, InvoiceType, InvoiceStatus, PaymentRecord } from '@/types'
import { handleError, Result, VoidResult } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 发票筛选条件
 */
export interface InvoiceFilters {
  type?: InvoiceType
  status?: InvoiceStatus
  projectId?: number
  searchTerm?: string
}

/**
 * useInvoices 返回类型
 */
export interface UseInvoicesReturn {
  data: Invoice[]
  loading: boolean
  error: string | null
  selectedItem: Invoice | null
  
  loadData: (type?: string) => Promise<void>
  create: (data: Partial<Invoice>) => Promise<Result<{ id: number }>>
  update: (invoice: Invoice) => Promise<VoidResult>
  delete: (id: number) => Promise<VoidResult>
  updateStatus: (id: number, status: InvoiceStatus) => Promise<VoidResult>
  
  setSelectedItem: (item: Invoice | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// useInvoices Hook
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 发票管理 Hook
 */
export function useInvoices(filters?: InvoiceFilters): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const loadInvoices = useCallback(async (type?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getInvoices(type as InvoiceType)
      
      if (result.success && result.data) {
        let filteredData = result.data
        
        if (filters?.type) {
          filteredData = filteredData.filter((i: Invoice) => i.type === filters.type)
        }
        
        if (filters?.status) {
          filteredData = filteredData.filter((i: Invoice) => i.status === filters.status)
        }
        
        if (filters?.projectId) {
          filteredData = filteredData.filter((i: Invoice) => i.projectId === filters.projectId)
        }
        
        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          filteredData = filteredData.filter((i: Invoice) => 
            i.name?.toLowerCase().includes(term) ||
            i.invoiceNo?.toLowerCase().includes(term) ||
            i.sellerName?.toLowerCase().includes(term) ||
            i.buyerName?.toLowerCase().includes(term)
          )
        }
        
        setInvoices(filteredData)
      } else {
        setError(result.error || '加载发票列表失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [filters?.type, filters?.status, filters?.projectId, filters?.searchTerm])

  const create = useCallback(async (data: Partial<Invoice>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createInvoice(data as Invoice)
      
      if (result.success) {
        await loadInvoices()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices])

  const update = useCallback(async (invoice: Invoice): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateInvoice(invoice)
      
      if (result.success) {
        await loadInvoices()
        if (selectedInvoice?.id === invoice.id) {
          setSelectedInvoice(invoice)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices, selectedInvoice])

  const deleteInvoice = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteInvoice(id)
      
      if (result.success) {
        setInvoices(prev => prev.filter(i => i.id !== id))
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除发票失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedInvoice])

  const updateStatus = useCallback(async (id: number, status: InvoiceStatus): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateInvoiceStatus(id, status)
      
      if (result.success) {
        await loadInvoices()
        return { success: true }
      }
      
      const errorMsg = result.error || '更新发票状态失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadInvoices])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadInvoices()
  }, [loadInvoices])

  const setSelectedItem = useCallback((item: Invoice | null) => {
    setSelectedInvoice(item)
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  return {
    data: invoices,
    loading,
    error,
    selectedItem: selectedInvoice,
    loadData: loadInvoices,
    create,
    update,
    delete: deleteInvoice,
    updateStatus,
    setSelectedItem,
    clearError,
    refresh,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// usePaymentRecords Hook
// ═══════════════════════════════════════════════════════════════════════════════

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
      
      if (result.success && result.data) {
        setRecords(result.data)
      } else {
        setError(result.error || '加载收款记录失败')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (data: Partial<PaymentRecord>): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createPaymentRecord(data as PaymentRecord)
      
      if (result.success) {
        await loadRecords()
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      const errorMsg = result.error || '创建收款记录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadRecords])

  const update = useCallback(async (record: PaymentRecord): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updatePaymentRecord(record)
      
      if (result.success) {
        await loadRecords()
        if (selectedRecord?.id === record.id) {
          setSelectedRecord(record)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '更新收款记录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [loadRecords, selectedRecord])

  const deleteRecord = useCallback(async (id: number): Promise<VoidResult> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deletePaymentRecord(id)
      
      if (result.success) {
        setRecords(prev => prev.filter(r => r.id !== id))
        if (selectedRecord?.id === id) {
          setSelectedRecord(null)
        }
        return { success: true }
      }
      
      const errorMsg = result.error || '删除收款记录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() }
    }
  }, [selectedRecord])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadRecords()
  }, [loadRecords])

  const setSelectedItem = useCallback((item: PaymentRecord | null) => {
    setSelectedRecord(item)
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  return {
    data: records,
    loading,
    error,
    selectedItem: selectedRecord,
    loadData: loadRecords,
    create,
    update,
    delete: deleteRecord,
    setSelectedItem,
    clearError,
    refresh,
  }
}
