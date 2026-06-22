import { useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { processFileFields, guessFileExt, readUploadedFile } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logUpdate, logDelete, logApprove } from '../utils/audit'
import { getInvoiceCategory } from './useInvoicePage.helpers'
import type { Invoice, InvoiceStatus, Project } from '../types/electron'

export interface UseInvoicePageInvoiceActionsDeps {
  projects: Project[]
  invoices: Invoice[]
  editingInvoice: Invoice | null
  originalFileRef: React.MutableRefObject<Record<number, string>>
  loadData: () => Promise<void>
  refresh?: () => void
  setEditingInvoice: (v: Invoice | null) => void
  setShowInvoiceModal: (b: boolean) => void
}

export function useInvoicePageInvoiceActions(deps: UseInvoicePageInvoiceActionsDeps) {
  const { projects, invoices, editingInvoice, originalFileRef, loadData, refresh, setEditingInvoice, setShowInvoiceModal } = deps
  const showToast = useToastStore(state => state.showToast)

  const handleEditInvoice = useCallback(async (invoice: Invoice) => {
    if (invoice.fileUrl && !invoice.fileUrl.startsWith('data:')) {
      originalFileRef.current[invoice.id] = invoice.fileUrl
      const cat = getInvoiceCategory(invoice.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, invoice.fileUrl, invoice.projectName)
      if (url) invoice.fileUrl = url
    }
    setEditingInvoice(invoice)
    setShowInvoiceModal(true)
  }, [originalFileRef, setEditingInvoice, setShowInvoiceModal])

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
        await (await getAPI()).updateInvoice({ ...editingInvoice, ...submitData })
        logUpdate('invoices', `发票: ${submitData.name}`, editingInvoice.id, { before: editingInvoice, after: submitData })
      } else {
        const result = await (await getAPI()).createInvoice(submitData)
        if (result.success && result.data) logCreate('invoices', `发票: ${submitData.name}`, result.data.id, submitData)
      }
      loadData(); setShowInvoiceModal(false); setEditingInvoice(null)
      refresh?.()
      showToast(editingInvoice ? '发票更新成功' : '发票创建成功', 'success')
    } catch (error: any) {
      console.error('保存发票失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingInvoice, projects, loadData, refresh, showToast, originalFileRef, setEditingInvoice, setShowInvoiceModal])

  const handleDeleteInvoice = useCallback(async (id: number) => {
    if (!confirm('确定要删除这张发票吗？')) return
    try {
      const target = invoices.find(i => i.id === id)
      await (await getAPI()).deleteInvoice(id)
      logDelete('invoices', target?.name ? `发票: ${target.name}` : '发票', id)
      loadData(); refresh?.()
    } catch (error) { console.error('删除发票失败:', error) }
  }, [invoices, loadData, refresh])

  const handleStatusChange = useCallback(async (id: number, status: InvoiceStatus) => {
    try {
      await (await getAPI()).updateInvoiceStatus(id, status)
      const invoice = invoices.find(i => i.id === id)
      logApprove('invoices', invoice?.name || '发票', id, true, `状态变更为: ${status}`)
      loadData(); refresh?.()
    } catch (error) { console.error('更新状态失败:', error) }
  }, [invoices, loadData, refresh])

  return { handleEditInvoice, handleSubmitInvoice, handleDeleteInvoice, handleStatusChange }
}