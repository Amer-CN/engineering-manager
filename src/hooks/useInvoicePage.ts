import { useState, useEffect, useRef, useCallback } from 'react'
import { Invoice, InvoiceType, InvoiceStatus, Project, Partner, PaymentRecord, IncomeContract, ExpenseContract } from '../types/electron'
import { logCreate, logUpdate, logDelete, logApprove } from '../utils/audit'
import { processFileFields, guessFileExt, readUploadedFile, FILE_CATEGORIES } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'

const getInvoiceCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.INVOICE_OUT : FILE_CATEGORIES.INVOICE_IN

const getPaymentCategory = (type: string) =>
  type === 'invoice_out' ? FILE_CATEGORIES.PAYMENT_IN : FILE_CATEGORIES.PAYMENT_OUT

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

  const loadData = useCallback(async () => {
    try {
      const [invRes, payRes, projRes, partRes, incRes, expRes] = await Promise.all([
        window.electronAPI.getInvoices(),
        window.electronAPI.getWagePaymentRecords(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners(),
        window.electronAPI.getIncomeContracts(),
        window.electronAPI.getExpenseContracts(),
      ])
      if (invRes.success && invRes.data) setInvoices(invRes.data)
      if (payRes.success && payRes.data) setPaymentRecords(payRes.data)
      if (projRes.success && projRes.data) setProjects(projRes.data)
      if (partRes.success && partRes.data) setPartners(partRes.data)
      if (incRes.success && incRes.data) setContracts(prev => ({ ...prev, income: incRes.data || [] }))
      if (expRes.success && expRes.data) setContracts(prev => ({ ...prev, expense: expRes.data || [] }))
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Invoice CRUD
  const handleEditInvoice = useCallback(async (invoice: Invoice) => {
    if (invoice.fileUrl && !invoice.fileUrl.startsWith('data:')) {
      originalFileRef.current[invoice.id] = invoice.fileUrl
      const cat = getInvoiceCategory(invoice.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, invoice.fileUrl, invoice.projectName)
      if (url) invoice.fileUrl = url
    }
    setEditingInvoice(invoice)
    setShowInvoiceModal(true)
  }, [])

  const handleSubmitInvoice = useCallback(async (data: any) => {
    try {
      let fileData = data
      if (editingInvoice && data.fileUrl?.startsWith('data:')) {
        const orig = originalFileRef.current[editingInvoice.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      const invCat = getInvoiceCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [{
        field: 'fileUrl', category: invCat.category, subCategory: invCat.subCategory,
        getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.name || '发票'}_${data.amount}元${guessFileExt(data.fileUrl, data.fileType)}`,
      }], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const submitData = { ...processed, sellerId: processed.sellerId || 0, buyerId: processed.buyerId || 0, projectId: processed.projectId || 0, contractId: processed.contractId || 0, status: 'issued' as InvoiceStatus }

      if (editingInvoice) {
        await window.electronAPI.updateInvoice({ ...editingInvoice, ...submitData })
        logUpdate('invoices', `发票: ${submitData.name}`, editingInvoice.id, { before: editingInvoice, after: submitData })
      } else {
        const result = await window.electronAPI.createInvoice(submitData)
        if (result.success && result.data) logCreate('invoices', `发票: ${submitData.name}`, result.data.id, submitData)
      }
      loadData(); setShowInvoiceModal(false); setEditingInvoice(null)
      refresh?.()
      showToast(editingInvoice ? '发票更新成功' : '发票创建成功', 'success')
    } catch (error: any) {
      console.error('保存发票失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingInvoice, projects, loadData, refresh, showToast])

  const handleDeleteInvoice = useCallback(async (id: number) => {
    if (!confirm('确定要删除这张发票吗？')) return
    try {
      const target = invoices.find(i => i.id === id)
      await window.electronAPI.deleteInvoice(id)
      logDelete('invoices', target?.name ? `发票: ${target.name}` : '发票', id)
      loadData(); refresh?.()
    } catch (error) { console.error('删除发票失败:', error) }
  }, [invoices, loadData, refresh])

  const handleStatusChange = useCallback(async (id: number, status: InvoiceStatus) => {
    try {
      await window.electronAPI.updateInvoiceStatus(id, status)
      const invoice = invoices.find(i => i.id === id)
      logApprove('invoices', invoice?.name || '发票', id, true, `状态变更为: ${status}`)
      loadData(); refresh?.()
    } catch (error) { console.error('更新状态失败:', error) }
  }, [invoices, loadData, refresh])

  // Payment CRUD
  const handleEditPayment = useCallback(async (record: PaymentRecord) => {
    if (record.fileUrl && !record.fileUrl.startsWith('data:')) {
      originalPaymentFileRef.current[record.id] = record.fileUrl
      const cat = getPaymentCategory(record.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, record.fileUrl, record.projectName)
      if (url) record.fileUrl = url
    }
    setEditingPayment(record)
    setShowPaymentModal(true)
  }, [])

  const handleSubmitPayment = useCallback(async (data: any) => {
    try {
      let fileData = data
      if (editingPayment && data.fileUrl?.startsWith('data:')) {
        const orig = originalPaymentFileRef.current[editingPayment.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      const payCat = getPaymentCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [{
        field: 'fileUrl', category: payCat.category, subCategory: payCat.subCategory,
        getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.amount}元_${data.recordDate || ''}${guessFileExt(data.fileUrl, data.fileType)}`,
      }], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const resolvedProjectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null
      const submitData = { ...processed, projectId: processed.projectId || 0, partnerId: processed.partnerId || 0, contractId: processed.contractId || 0, projectName: resolvedProjectName }

      if (editingPayment) {
        await window.electronAPI.updatePaymentRecord({ ...editingPayment, ...submitData } as PaymentRecord)
        logUpdate('invoices', `回款/付款记录: ${submitData.amount}元`, editingPayment.id, { before: editingPayment, after: submitData })
      } else {
        const result = await window.electronAPI.createPaymentRecord(submitData as PaymentRecord)
        if (result.success && result.data) logCreate('invoices', `回款/付款记录: ${submitData.amount}元`, result.data.id, submitData)
      }
      loadData(); setShowPaymentModal(false); setEditingPayment(null)
      showToast(editingPayment ? '记录更新成功' : '记录创建成功', 'success')
    } catch (error: any) {
      console.error('保存回款/付款记录失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingPayment, projects, loadData, showToast])

  const handleDeletePayment = useCallback(async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      const target = paymentRecords.find(p => p.id === id)
      await window.electronAPI.deletePaymentRecord(id)
      logDelete('invoices', target ? `回款/付款记录: ${target.amount}元` : '回款/付款记录', id)
      loadData()
    } catch (error) { console.error('删除收款记录失败:', error) }
  }, [paymentRecords, loadData])

  // Preview
  const handlePreview = useCallback(async (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => {
    let url = data
    let detectedType = type
    if (data && !data.startsWith('data:') && category && subCategory) {
      const effectiveProjectName = projectName || (projectId ? projects.find(p => p.id === projectId)?.name : null)
      const result = await window.electronAPI.readFile({ category, subCategory, fileName: data, projectName: effectiveProjectName || null })
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
