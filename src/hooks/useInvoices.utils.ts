import type { Invoice } from '@/types'
import type { InvoiceFilters } from './useInvoices.types'

export function filterInvoices(data: Invoice[], filters?: InvoiceFilters): Invoice[] {
  let filtered = data
  if (filters?.type) {
    filtered = filtered.filter((i: Invoice) => i.type === filters.type)
  }
  if (filters?.status) {
    filtered = filtered.filter((i: Invoice) => i.status === filters.status)
  }
  if (filters?.projectId) {
    filtered = filtered.filter((i: Invoice) => i.projectId === filters.projectId)
  }
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase()
    filtered = filtered.filter((i: Invoice) =>
      i.name?.toLowerCase().includes(term) ||
      i.invoiceNo?.toLowerCase().includes(term) ||
      i.sellerName?.toLowerCase().includes(term) ||
      i.buyerName?.toLowerCase().includes(term)
    )
  }
  return filtered
}
