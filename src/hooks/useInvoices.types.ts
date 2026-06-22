import type { Invoice, InvoiceType, InvoiceStatus } from '@/types'
import type { Result, VoidResult } from '@/types'

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
