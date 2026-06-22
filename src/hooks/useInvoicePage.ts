import { useState, useEffect, useRef, useCallback } from 'react'
import { Invoice, InvoiceType, InvoiceStatus, Project, Partner, PaymentRecord, IncomeContract, ExpenseContract } from '../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useInvoicePageLoaders } from './useInvoicePageLoaders'
import { useInvoicePageInvoiceActions } from './useInvoicePage.invoice'
import { useInvoicePagePaymentActions } from './useInvoicePage.payment'
import { getAPI } from '@/services/api-adapter'

export function useInvoicePage(refresh?: () => void) {
  const showToast = useToastStore(state => state.showToast)
  const originalFileRef = useRef<Record<number, string>>({})
  const originalPaymentFileRef = useRef<Record<number, string>>({})

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [contracts, setContracts] = useState<{ income: IncomeContract[]; expense: ExpenseContract[] }>({ income: [], expense: [] })
  const [loading, setLoading] = useState(true)

  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const [previewFile, setPreviewFile] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)

  const [filterType, setFilterType] = useState<InvoiceType | ''>('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('')
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterPaymentType, setFilterPaymentType] = useState<InvoiceType | ''>('')
  const [filterPaymentProject, setFilterPaymentProject] = useState<number | ''>('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const { loadData } = useInvoicePageLoaders({
    setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading,
  })
  useEffect(() => { loadData() }, [loadData])

  const { handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange } = useInvoicePageInvoiceActions({
    projects, invoices, editingInvoice, originalFileRef, loadData, refresh,
    setEditingInvoice, setShowInvoiceModal,
  })

  const { handleEditPayment, handleSubmitPayment, handleDeletePayment } = useInvoicePagePaymentActions({
    projects, paymentRecords, editingPayment, originalPaymentFileRef, loadData,
    setEditingPayment, setShowPaymentModal,
  })

  // Preview
  const handlePreview = useCallback(async (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => {
    let url = data
    let detectedType = type
    if (data && !data.startsWith('data:') && category && subCategory) {
      const effectiveProjectName = projectName || (projectId ? projects.find(p => p.id === projectId)?.name : null)
      const result = await (await getAPI()).readFile({ category, subCategory, fileName: data, projectName: effectiveProjectName || null })
      if (result.success && result.data) {
        url = result.data.dataUrl
        if (result.data.mimeType?.startsWith('image/')) detectedType = 'image'
        else if (result.data.mimeType?.includes('pdf')) detectedType = 'pdf'
      } else {
        showToast('文件读取失败，文件可能已被移动或删除', 'error')
        return
      }
    }
    if (data?.startsWith('data:') && type !== 'pdf' && data.includes('application/pdf')) detectedType = 'pdf'
    setPreviewFile({ data: url, type: detectedType, title })
  }, [projects, showToast])

  // Filters
  const filteredInvoices = invoices.filter(inv => {
    if (filterType && inv.type !== filterType) return false
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterProject && inv.projectId !== filterProject) return false
    if (filterDateStart && inv.issueDate < filterDateStart) return false
    if (filterDateEnd && inv.issueDate > filterDateEnd) return false
    return true
  })

  const filteredPayments = paymentRecords.filter(p => {
    if (filterPaymentType && p.type !== filterPaymentType) return false
    if (filterDateStart && p.recordDate < filterDateStart) return false
    if (filterDateEnd && p.recordDate > filterDateEnd) return false
    if (filterPaymentProject && p.projectId !== filterPaymentProject) return false
    return true
  })

  return {
    // State
    activeTab, setActiveTab, loading,
    invoices, paymentRecords, projects, partners, contracts,
    // Modal state
    showInvoiceModal, setShowInvoiceModal, showPaymentModal, setShowPaymentModal,
    editingInvoice, setEditingInvoice, editingPayment, setEditingPayment,
    previewFile, setPreviewFile,
    // Filter state
    filterType, setFilterType, filterStatus, setFilterStatus, filterProject, setFilterProject,
    filterPaymentType, setFilterPaymentType, filterPaymentProject, setFilterPaymentProject,
    filterDateStart, setFilterDateStart, filterDateEnd, setFilterDateEnd,
    // Handlers
    handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange,
    handleEditPayment, handleSubmitPayment, handleDeletePayment,
    handlePreview,
    // Filtered data
    filteredInvoices, filteredPayments,
  }
}
