import { useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { processFileFields, guessFileExt, readUploadedFile } from '../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logUpdate, logDelete } from '../utils/audit'
import { getPaymentCategory } from './useInvoicePage.helpers'
import type { PaymentRecord, Project } from '../types/electron'

export interface UseInvoicePagePaymentActionsDeps {
  projects: Project[]
  paymentRecords: PaymentRecord[]
  editingPayment: PaymentRecord | null
  originalPaymentFileRef: React.MutableRefObject<Record<number, string>>
  loadData: () => Promise<void>
  setEditingPayment: (v: PaymentRecord | null) => void
  setShowPaymentModal: (b: boolean) => void
}

export function useInvoicePagePaymentActions(deps: UseInvoicePagePaymentActionsDeps) {
  const { projects, paymentRecords, editingPayment, originalPaymentFileRef, loadData, setEditingPayment, setShowPaymentModal } = deps
  const showToast = useToastStore(state => state.showToast)

  const handleEditPayment = useCallback(async (record: PaymentRecord) => {
    if (record.fileUrl && !record.fileUrl.startsWith('data:')) {
      originalPaymentFileRef.current[record.id] = record.fileUrl
      const cat = getPaymentCategory(record.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, record.fileUrl, record.projectName)
      if (url) record.fileUrl = url
    }
    setEditingPayment(record)
    setShowPaymentModal(true)
  }, [originalPaymentFileRef, setEditingPayment, setShowPaymentModal])

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
        await (await getAPI()).updatePaymentRecord({ ...editingPayment, ...submitData } as PaymentRecord)
        logUpdate('invoices', `回款/付款记录: ${submitData.amount}元`, editingPayment.id, { before: editingPayment, after: submitData })
      } else {
        const result = await (await getAPI()).createPaymentRecord(submitData as PaymentRecord)
        if (result.success && result.data) logCreate('invoices', `回款/付款记录: ${submitData.amount}元`, result.data.id, submitData)
      }
      loadData(); setShowPaymentModal(false); setEditingPayment(null)
      showToast(editingPayment ? '记录更新成功' : '记录创建成功', 'success')
    } catch (error: any) {
      console.error('保存回款/付款记录失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }, [editingPayment, projects, loadData, showToast, originalPaymentFileRef, setEditingPayment, setShowPaymentModal])

  const handleDeletePayment = useCallback(async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      const target = paymentRecords.find(p => p.id === id)
      await (await getAPI()).deletePaymentRecord(id)
      logDelete('invoices', target ? `回款/付款记录: ${target.amount}元` : '回款/付款记录', id)
      loadData()
    } catch (error) { console.error('删除收款记录失败:', error) }
  }, [paymentRecords, loadData])

  return { handleEditPayment, handleSubmitPayment, handleDeletePayment }
}