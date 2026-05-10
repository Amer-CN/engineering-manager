// Invoices.tsx - 发票管理页面

import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Invoice, InvoiceType, InvoiceStatus, InvoiceKind, Project, Partner, PaymentRecord, IncomeContract, ExpenseContract } from '../types/electron'
import { logCreate, logUpdate, logDelete, logApprove } from '../utils/audit'
import { useToastContext } from '../hooks/useToast'
import { getStatusLabel, printInvoiceList, printPaymentList, exportInvoiceList, exportPaymentList, handlePrint } from './features/invoices/printExport'
import { motion } from 'framer-motion'
import { formatMoney } from '../utils/format'
import { processFileFields, guessFileExt, readUploadedFile, FILE_CATEGORIES, uploadFile } from '../services/fileService'

// 导入拆分后的组件
import {
  InvoiceStats,
  InvoiceFilters,
  InvoiceList,
  InvoiceForm,
  InvoiceFormData,
  PaymentList,
  PaymentForm,
  PaymentFormData,
  PaymentStats,
} from './features/invoices'

// 常量

const defaultInvoiceFormData: InvoiceFormData = {
  type: 'invoice_in',
  invoiceKind: 'electronic_regular' as InvoiceKind,
  invoiceNo: '',
  invoiceCode: '',
  name: '',
  amount: 0,
  priceAmount: 0,
  taxAmount: 0,
  taxRate: 0.09 as any,
  issueDate: new Date().toISOString().split('T')[0],
  sellerId: '',
  buyerId: '',
  projectId: '',
  contractId: '',
  remarks: '',
  fileUrl: '',
  fileType: ''
}

const defaultPaymentFormData: PaymentFormData = {
  type: 'invoice_in' as InvoiceType,
  amount: 0,
  recordDate: new Date().toISOString().split('T')[0],
  projectId: '',
  partnerId: '',
  contractId: '',
  remarks: '',
  invoiceDetails: [],
  fileUrl: '',
  fileType: ''
}

// Types

interface InvoicesProps {
  refresh?: () => void
}

// Component
// 打印模板/导出 → features/invoices/printExport.ts

const Invoices: React.FC<InvoicesProps> = ({ refresh }) => {
  // 状态定义
  
  const { showToast } = useToastContext()
  const originalFileRef = useRef<Record<number, string>>({})
  const originalPaymentFileRef = useRef<Record<number, string>>({})
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [contracts, setContracts] = useState<{ income: IncomeContract[]; expense: ExpenseContract[] }>({ income: [], expense: [] })
  const [loading, setLoading] = useState(true)
  
  // 模态框状态
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  
  // 预览状态
  const [previewFile, setPreviewFile] = useState<{data: string, type: 'image' | 'pdf', title: string} | null>(null)
  
  // 筛选状态
  const [filterType, setFilterType] = useState<InvoiceType | ''>('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | ''>('')
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [filterPaymentType, setFilterPaymentType] = useState<InvoiceType | ''>('')
  const [filterPaymentProject, setFilterPaymentProject] = useState<number | ''>('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  // 数据加载
  
  const loadData = async () => {
    try {
      const [invoicesResult, paymentResult, projectsResult, partnersResult, incomeResult, expenseResult] = await Promise.all([
        window.electronAPI.getInvoices(),
        window.electronAPI.getPaymentRecords(),
        window.electronAPI.getProjects(),
        window.electronAPI.getPartners(),
        window.electronAPI.getIncomeContracts(),
        window.electronAPI.getExpenseContracts()
      ])
      
      if (invoicesResult.success && invoicesResult.data) setInvoices(invoicesResult.data)
      if (paymentResult.success && paymentResult.data) setPaymentRecords(paymentResult.data)
      if (projectsResult.success && projectsResult.data) setProjects(projectsResult.data)
      if (partnersResult.success && partnersResult.data) setPartners(partnersResult.data)
      if (incomeResult.success && incomeResult.data) {
        setContracts(prev => ({ ...prev, income: incomeResult.data || [] }))
      }
      if (expenseResult.success && expenseResult.data) {
        setContracts(prev => ({ ...prev, expense: expenseResult.data || [] }))
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 事件处理
  
  // 根据发票类型获取文件分类
  const getInvoiceCategory = (type: string) =>
    type === 'invoice_out' ? FILE_CATEGORIES.INVOICE_OUT : FILE_CATEGORIES.INVOICE_IN

  // 发票操作
  const handleEditInvoice = async (invoice: Invoice) => {
    // 从磁盘加载文件用于编辑预览
    if (invoice.fileUrl && !invoice.fileUrl.startsWith('data:')) {
      originalFileRef.current[invoice.id] = invoice.fileUrl
      const cat = getInvoiceCategory(invoice.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, invoice.fileUrl, invoice.projectName)
      if (url) invoice.fileUrl = url
    }
    setEditingInvoice(invoice)
    setShowInvoiceModal(true)
  }

  const handleSubmitInvoice = async (data: InvoiceFormData) => {
    try {
      // 如果是编辑且文件是 data URL（加载预览时替换的），恢复原始文件名避免重复上传
      let fileData = data
      if (editingInvoice && data.fileUrl?.startsWith('data:')) {
        const orig = originalFileRef.current[editingInvoice.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      // 处理文件字段
      const invCat = getInvoiceCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [
        { field: 'fileUrl', category: invCat.category, subCategory: invCat.subCategory, getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.name || '发票'}_${data.amount}元${guessFileExt(data.fileUrl, data.fileType)}` },
      ], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const submitData = {
        ...processed,
        sellerId: processed.sellerId || 0,
        buyerId: processed.buyerId || 0,
        projectId: processed.projectId || 0,
        contractId: processed.contractId || 0,
        status: 'issued' as InvoiceStatus
      }

      if (editingInvoice) {
        await window.electronAPI.updateInvoice({ ...editingInvoice, ...submitData })
        // 审计日志
        logUpdate('invoices', `发票: ${submitData.name}`, editingInvoice.id, { before: editingInvoice, after: submitData })
      } else {
        const result = await window.electronAPI.createInvoice(submitData)
        if (result.success && result.data) {
          // 审计日志
          logCreate('invoices', `发票: ${submitData.name}`, result.data.id, submitData)
        }
      }
      loadData()
      setShowInvoiceModal(false)
      setEditingInvoice(null)
      refresh?.()
      showToast(editingInvoice ? '发票更新成功' : '发票创建成功', 'success')
    } catch (error: any) {
      console.error('保存发票失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  const handleDeleteInvoice = async (id: number) => {
    if (confirm('确定要删除这张发票吗？')) {
      try {
        // 记录删除前的信息
        const invoiceToDelete = invoices.find(i => i.id === id)
        
        await window.electronAPI.deleteInvoice(id)
        
        // 审计日志
        logDelete('invoices', invoiceToDelete?.name ? `发票: ${invoiceToDelete.name}` : '发票', id)
        
        loadData()
        refresh?.()
      } catch (error) {
        console.error('删除发票失败:', error)
      }
    }
  }

  const handleStatusChange = async (id: number, status: InvoiceStatus) => {
    try {
      await window.electronAPI.updateInvoiceStatus(id, status)
      
      // 审计日志 - 发票状态变更视为审批操作
      const invoice = invoices.find(i => i.id === id)
      logApprove('invoices', invoice?.name || '发票', id, true, `状态变更为: ${status}`)
      
      loadData()
      refresh?.()
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    printInvoiceList([invoice])
  }

  // 根据收付款类型获取文件分类
  // invoice_out(开票/销项)→客户回款, invoice_in(收票/进项)→我们付款
  const getPaymentCategory = (type: string) =>
    type === 'invoice_out' ? FILE_CATEGORIES.PAYMENT_IN : FILE_CATEGORIES.PAYMENT_OUT

  // 收款操作
  const handleEditPayment = async (record: PaymentRecord) => {
    // 从磁盘加载文件用于编辑预览
    if (record.fileUrl && !record.fileUrl.startsWith('data:')) {
      originalPaymentFileRef.current[record.id] = record.fileUrl
      const cat = getPaymentCategory(record.type)
      const url = await readUploadedFile(cat.category, cat.subCategory, record.fileUrl, record.projectName)
      if (url) record.fileUrl = url
    }
    setEditingPayment(record)
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async (data: PaymentFormData) => {
    try {
      // 如果是编辑且文件是 data URL，恢复原始文件名
      let fileData = data
      if (editingPayment && data.fileUrl?.startsWith('data:')) {
        const orig = originalPaymentFileRef.current[editingPayment.id]
        if (orig) fileData = { ...data, fileUrl: orig }
      }
      // 处理文件字段
      const payCat = getPaymentCategory(data.type || 'invoice_in')
      const processed = await processFileFields(fileData, [
        { field: 'fileUrl', category: payCat.category, subCategory: payCat.subCategory, getFileName: () => `${data.remarks ? data.remarks + '_' : ''}${data.amount}元_${data.recordDate || ''}${guessFileExt(data.fileUrl, data.fileType)}` },
      ], data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null)

      const resolvedProjectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name || null : null
      const submitData = {
        ...processed,
        projectId: processed.projectId || 0,
        partnerId: processed.partnerId || 0,
        contractId: processed.contractId || 0,
        projectName: resolvedProjectName
      }

      if (editingPayment) {
        await window.electronAPI.updatePaymentRecord({ ...editingPayment, ...submitData } as PaymentRecord)
        // 审计日志
        logUpdate('invoices', `回款/付款记录: ${submitData.amount}元`, editingPayment.id, { before: editingPayment, after: submitData })
      } else {
        const result = await window.electronAPI.createPaymentRecord(submitData as PaymentRecord)
        if (result.success && result.data) {
          // 审计日志
          logCreate('invoices', `回款/付款记录: ${submitData.amount}元`, result.data.id, submitData)
        }
      }
      loadData()
      setShowPaymentModal(false)
      setEditingPayment(null)
      showToast(editingPayment ? '记录更新成功' : '记录创建成功', 'success')
    } catch (error: any) {
      console.error('保存回款/付款记录失败:', error)
      showToast(error?.message || '保存失败', 'error')
    }
  }

  const handleDeletePayment = async (id: number) => {
    if (confirm('确定要删除这条记录吗？')) {
      try {
        // 记录删除前的信息
        const paymentToDelete = paymentRecords.find(p => p.id === id)
        
        await window.electronAPI.deletePaymentRecord(id)
        
        // 审计日志
        logDelete('invoices', paymentToDelete ? `回款/付款记录: ${paymentToDelete.amount}元` : '回款/付款记录', id)
        
        loadData()
      } catch (error) {
        console.error('删除收款记录失败:', error)
      }
    }
  }

  const handlePrintPayment = (record: PaymentRecord) => {
    printPaymentList([record])
  }

  // 打印收款记录列表
  const handlePrintPaymentList = () => {
    const paymentList = filteredPayments
    if (paymentList.length === 0) {
      showToast('没有可打印的数据', 'error')
      return
    }

    const rows = paymentList.map(p => `
      <tr>
        <td>${p.recordDate || '-'}</td>
        <td>${p.type === 'invoice_out' ? '回款' : '付款'}</td>
        <td>¥${formatMoney(p.amount)}</td>
        <td>${p.partnerName || '-'}</td>
        <td>${p.projectName || '-'}</td>
        <td>${p.contractName || '-'}</td>
        <td>${p.remarks || '-'}</td>
      </tr>
    `).join('')

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>收款记录列表</title>
        <style>
          body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .footer { margin-top: 20px; text-align: right; font-size: 12px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>收款记录列表</h1>
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>金额</th>
              <th>单位</th>
              <th>项目</th>
              <th>合同</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          共 ${paymentList.length} 条记录 | 打印时间: ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `
    handlePrint(content)
  }

  // 导出收款记录列表为 Excel (XLSX)
  const handleExportPaymentList = async () => {
    const paymentList = filteredPayments
    if (paymentList.length === 0) {
      showToast('没有可导出的数据', 'error')
      return
    }

    try {
      const exportData = paymentList.map((p, index) => ({
        '序号': index + 1,
        '日期': p.recordDate || '',
        '类型': p.type === 'invoice_out' ? '回款' : '付款',
        '金额': p.amount,
        '关联单位': p.partnerName || '',
        '关联项目': p.projectName || '',
        '关联合同': p.contractName || '',
        '备注': p.remarks || '',
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const colWidths = [
        { wch: 6 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
      ]
      worksheet['!cols'] = colWidths

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '收款记录')
      const timestamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `收款记录_${timestamp}.xlsx`)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    }
  }

  // 预览（自动兼容文件名和 data URL）
  const handlePreview = async (data: string, type: 'image' | 'pdf', title: string, category?: string, subCategory?: string, projectName?: string | null, projectId?: number) => {
    let url = data
    let detectedType = type
    if (data && !data.startsWith('data:') && category && subCategory) {
      const effectiveProjectName = projectName || (projectId ? projects.find(p => p.id === projectId)?.name : null)
      const result = await window.electronAPI.readFile({ category, subCategory, fileName: data, projectName: effectiveProjectName || null })
      if (result.success && result.data) {
        url = result.data.dataUrl
        // 从实际读取的 MIME 类型判断，比 fileType 字段更可靠
        if (result.data.mimeType?.startsWith('image/')) detectedType = 'image'
        else if (result.data.mimeType?.includes('pdf')) detectedType = 'pdf'
      } else {
        showToast('文件读取失败，文件可能已被移动或删除', 'error')
        return
      }
    }
    // 如果传入的是 data URL 且 type 不可靠，从 data URL 推断
    if (data?.startsWith('data:') && type !== 'pdf' && data.includes('application/pdf')) {
      detectedType = 'pdf'
    }
    setPreviewFile({ data: url, type: detectedType, title })
  }

  // 筛选
  
  const filteredInvoices = invoices.filter(inv => {
    if (filterType && inv.type !== filterType) return false
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterProject && inv.projectId !== filterProject) return false
    // 日期区间筛选
    if (filterDateStart && inv.issueDate < filterDateStart) return false
    if (filterDateEnd && inv.issueDate > filterDateEnd) return false
    return true
  })

  const filteredPayments = paymentRecords.filter(p => {
    // 类型筛选
    if (filterPaymentType && p.type !== filterPaymentType) return false
    // 日期区间筛选
    if (filterDateStart && p.recordDate < filterDateStart) return false
    if (filterDateEnd && p.recordDate > filterDateEnd) return false
    // 项目筛选
    if (filterPaymentProject && p.projectId !== filterPaymentProject) return false
    return true
  })

  // 加载状态
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  // 表单数据
  
  const getInvoiceFormData = (): InvoiceFormData => {
    if (editingInvoice) {
      return {
        type: editingInvoice.type,
        invoiceKind: editingInvoice.invoiceKind || 'paper_regular',
        invoiceNo: editingInvoice.invoiceNo,
        invoiceCode: editingInvoice.invoiceCode,
        name: editingInvoice.name,
        amount: editingInvoice.amount,
        priceAmount: editingInvoice.priceAmount,
        taxAmount: editingInvoice.taxAmount,
        taxRate: editingInvoice.taxRate,
        issueDate: editingInvoice.issueDate,
        sellerId: editingInvoice.sellerId || '',
        buyerId: editingInvoice.buyerId || '',
        projectId: editingInvoice.projectId || '',
        contractId: editingInvoice.contractId || '',
        remarks: editingInvoice.remarks || '',
        fileUrl: editingInvoice.fileUrl || '',
        fileType: editingInvoice.fileType || ''
      }
    }
    return { ...defaultInvoiceFormData }
  }

  const getPaymentFormData = (): PaymentFormData => {
    if (editingPayment) {
      return {
        type: editingPayment.type,
        amount: editingPayment.amount,
        recordDate: editingPayment.recordDate,
        projectId: editingPayment.projectId || '',
        partnerId: editingPayment.partnerId || '',
        contractId: editingPayment.contractId || '',
        remarks: editingPayment.remarks || '',
        invoiceDetails: editingPayment.invoiceDetails || [],
        fileUrl: editingPayment.fileUrl || '',
        fileType: editingPayment.fileType || ''
      }
    }
    return { ...defaultPaymentFormData }
  }

  // 渲染
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 固定头部 */}
      <div className="flex-shrink-0 bg-slate-50 px-6 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">发票管理</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">管理收票、开票及收款业务</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditingPayment(null); setShowPaymentModal(true) }}
              className="btn bg-amber-500 hover:bg-amber-600 text-white"
            >
              <span className="text-xl">+</span>
              回款/付款登记
            </button>
            <button
              onClick={() => { setEditingInvoice(null); setShowInvoiceModal(true) }}
              className="btn btn-primary"
            >
              <span className="text-xl">+</span>
              新建发票
            </button>
          </div>
        </div>

        {/* 主 Tab */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'invoices'
                ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            发票列表
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            回款/付款记录
          </button>
        </div>

        {/* 统计卡片 - 根据Tab显示 */}
        {activeTab === 'invoices' && (
          <InvoiceStats invoices={invoices} filteredInvoices={filteredInvoices} />
        )}
        {activeTab === 'payments' && (
          <PaymentStats records={paymentRecords} filteredRecords={filteredPayments} invoices={invoices} />
        )}

        {/* 筛选器 */}
        <InvoiceFilters
          filterType={filterType}
          filterStatus={filterStatus}
          filterProject={filterProject}
          filterPaymentType={filterPaymentType}
          filterPaymentProject={filterPaymentProject}
          filterDateStart={filterDateStart}
          filterDateEnd={filterDateEnd}
          projects={projects}
          partners={partners}
          onFilterTypeChange={setFilterType}
          onFilterStatusChange={setFilterStatus}
          onFilterProjectChange={setFilterProject}
          onFilterPaymentTypeChange={setFilterPaymentType}
          onFilterPaymentProjectChange={setFilterPaymentProject}
          onFilterDateStartChange={setFilterDateStart}
          onFilterDateEndChange={setFilterDateEnd}
          onPrint={activeTab === 'invoices' ? () => printInvoiceList(filteredInvoices) : handlePrintPaymentList}
          onExportExcel={activeTab === 'invoices' ? () => exportInvoiceList(filteredInvoices) : handleExportPaymentList}
          isPaymentFilter={activeTab === 'payments'}
        />
      </div>

      {/* 可滚动列表区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 max-w-[1400px] mx-auto w-full">
        {/* 发票列表 */}
        {activeTab === 'invoices' && (
          <InvoiceList
            invoices={filteredInvoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onStatusChange={handleStatusChange}
            onPrint={handlePrintInvoice}
            onPreview={handlePreview}
          />
        )}

        {/* 收款记录列表 */}
        {activeTab === 'payments' && (
          <PaymentList
            records={filteredPayments}
            onEdit={handleEditPayment}
            onDelete={handleDeletePayment}
            onPrint={handlePrintPayment}
            onPreview={handlePreview}
          />
        )}
      </div>
     
      {/* 发票表单模态框 */}
      {showInvoiceModal && (
        <InvoiceForm
          initialData={getInvoiceFormData()}
          projects={projects}
          partners={partners}
          contracts={contracts}
          onSubmit={handleSubmitInvoice}
          onCancel={() => { setShowInvoiceModal(false); setEditingInvoice(null) }}
        />
      )}

      {/* 收款表单模态框 */}
      {showPaymentModal && (
        <PaymentForm
          initialData={getPaymentFormData()}
          projects={projects}
          partners={partners}
          invoices={invoices}
          contracts={contracts}
          onSubmit={handleSubmitPayment}
          onCancel={() => { setShowPaymentModal(false); setEditingPayment(null) }}
        />
      )}

      {/* 预览模态框 */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setPreviewFile(null)}>
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-800">{previewFile.title}</h3>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              {previewFile.type === 'pdf' ? (
                <iframe src={previewFile.data} className="w-full h-full border-0" title="PDF预览" />
              ) : (
                <img src={previewFile.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Invoices