import React, { useState } from 'react'
import { HoverScrollbar } from './ui/HoverScrollbar'
import { useToastStore } from '@/store/toastStore'
import { Spinner } from './ui/Loading/Loading'
import { useInvoicePage } from '../hooks/useInvoicePage'
import { printInvoiceList, printPaymentList, exportInvoiceList, handlePrint, printPaymentRecordList, exportPaymentRecordList } from './features/invoices/printExport'
import { formatMoney } from '../utils/format'
import {
  InvoiceStats, InvoiceFilters, InvoiceList, InvoiceForm,
  PaymentList, PaymentForm, PaymentStats,
} from './features/invoices'
import { getInvoiceFormData, getPaymentFormData } from './features/invoices/constants'
import { FilePreviewModal } from './features/invoices/FilePreviewModal'
import { useDuplicateInvoices } from './features/invoices/useDuplicateInvoices'
import { Icon } from './ui/Icon'
import { Button } from './ui/Button'

interface InvoicesProps { refresh?: () => void }

const Invoices: React.FC<InvoicesProps> = ({ refresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const h = useInvoicePage(refresh)
  const [showDuplicates, setShowDuplicates] = useState(false)

  const duplicateInvoices = useDuplicateInvoices(h.invoices)

  if (h.loading) {
  return (
  <div className="flex items-center justify-center h-full">
  <Spinner size="lg" />
  </div>
  )
  }

  return (
  <div className="flex flex-col h-full overflow-hidden">
  <div className="flex-shrink-0 bg-slate-50 px-6 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
  <div className="flex items-center justify-between mb-4">
  <div>
  <h1 className="text-2xl font-bold text-slate-800">发票管理</h1>
  <p className="text-slate-500 mt-1">管理收票、开票及收款业务</p>
  </div>
  <div className="flex items-center gap-3">
  {duplicateInvoices.length > 0 && (
  <Button onClick={() => setShowDuplicates(true)}  variant="warning" className="flex items-center gap-2">
  <Icon name="AlertTriangle" size={16} />
  检测到 {duplicateInvoices.length} 组重复发票
  </Button>
  )}
  <button onClick={() => { h.setEditingPayment(null); h.setShowPaymentModal(true) }} className=" bg-amber-500 hover:bg-amber-600 text-white">
  <span className="text-xl">+</span> 回款/付款登记
  </button>
  <Button onClick={() => { h.setEditingInvoice(null); h.setShowInvoiceModal(true) }}  variant="primary">
  <span className="text-xl">+</span> 新建发票
  </Button>
  </div>
  </div>

  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
  <button onClick={() => h.setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${h.activeTab === 'invoices' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
  发票列表
  </button>
  <button onClick={() => h.setActiveTab('payments')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${h.activeTab === 'payments' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
  回款/付款记录
  </button>
  </div>

  {h.activeTab === 'invoices' && <InvoiceStats invoices={h.invoices} filteredInvoices={h.filteredInvoices} />}
  {h.activeTab === 'payments' && <PaymentStats records={h.paymentRecords} filteredRecords={h.filteredPayments} invoices={h.invoices} />}

  <InvoiceFilters
  filterType={h.filterType} filterStatus={h.filterStatus} filterProject={h.filterProject}
  filterPaymentType={h.filterPaymentType} filterPaymentProject={h.filterPaymentProject}
  filterDateStart={h.filterDateStart} filterDateEnd={h.filterDateEnd}
  projects={h.projects} partners={h.partners}
  onFilterTypeChange={h.setFilterType} onFilterStatusChange={h.setFilterStatus}
  onFilterProjectChange={h.setFilterProject} onFilterPaymentTypeChange={h.setFilterPaymentType}
  onFilterPaymentProjectChange={h.setFilterPaymentProject}
  onFilterDateStartChange={h.setFilterDateStart} onFilterDateEndChange={h.setFilterDateEnd}
  onPrint={h.activeTab === 'invoices' ? () => printInvoiceList(h.filteredInvoices) : () => printPaymentRecordList(h.filteredPayments, showToast as any, formatMoney, handlePrint)}
  onExportExcel={h.activeTab === 'invoices' ? () => exportInvoiceList(h.filteredInvoices) : () => exportPaymentRecordList(h.filteredPayments, showToast as (msg: string) => void)}
  isPaymentFilter={h.activeTab === 'payments'}
  />
  </div>

  <HoverScrollbar className="flex-1 min-h-0">
  <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full">
  {h.activeTab === 'invoices' && (
  <InvoiceList invoices={h.filteredInvoices} onEdit={h.handleEditInvoice} onDelete={h.handleDeleteInvoice}
  onStatusChange={h.handleStatusChange} onPrint={(inv) => printInvoiceList([inv])} onPreview={h.handlePreview} />
  )}
  {h.activeTab === 'payments' && (
  <PaymentList records={h.filteredPayments} onEdit={h.handleEditPayment} onDelete={h.handleDeletePayment}
  onPrint={(rec) => printPaymentList([rec])} onPreview={h.handlePreview} />
  )}
  </div>
  </HoverScrollbar>

  {h.showInvoiceModal && (
  <InvoiceForm initialData={getInvoiceFormData(h.editingInvoice)} projects={h.projects} partners={h.partners}
  contracts={h.contracts} existingInvoices={h.invoices.map(inv => ({ id: inv.id, invoiceNo: inv.invoiceNo }))}
  onSubmit={h.handleSubmitInvoice}
  onCancel={() => { h.setShowInvoiceModal(false); h.setEditingInvoice(null) }} />
  )}
  {h.showPaymentModal && (
  <PaymentForm initialData={getPaymentFormData(h.editingPayment)} projects={h.projects} partners={h.partners}
  invoices={h.invoices} contracts={h.contracts} onSubmit={h.handleSubmitPayment}
  onCancel={() => { h.setShowPaymentModal(false); h.setEditingPayment(null) }} />
  )}
  {h.previewFile && <FilePreviewModal file={h.previewFile} onClose={() => h.setPreviewFile(null)} />}

  {/* 重复发票弹窗 */}
  {showDuplicates && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
  <Icon name="AlertTriangle" size={20} className="text-amber-500" />
  重复发票检测
  </h2>
  <button onClick={() => setShowDuplicates(false)} className="text-slate-400 hover:text-slate-600">✕</button>
  </div>
  <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
  {duplicateInvoices.length === 0 ? (
  <div className="text-center py-8">
  <Icon name="CheckCircle" size={48} className="text-emerald-400 mx-auto mb-4" />
  <p className="text-slate-600">没有发现重复发票</p>
  </div>
  ) : (
  <div className="space-y-4">
  <p className="text-sm text-slate-500 mb-4">
  发现 {duplicateInvoices.length} 组重复发票，请检查并删除多余的记录。
  </p>
  {duplicateInvoices.map(({ invoiceNo, invoices }) => (
  <div key={invoiceNo} className="border border-amber-200 rounded-xl p-4 bg-amber-50">
  <div className="flex items-center justify-between mb-3">
  <span className="font-mono text-sm font-medium text-amber-800">
  发票号: {invoiceNo}
  </span>
  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
  {invoices.length} 条记录
  </span>
  </div>
  <div className="space-y-2">
  {invoices.map((inv, idx) => (
  <div key={inv.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
  <div className="text-sm">
  <span className="font-medium text-slate-700">#{idx + 1}</span>
  <span className="mx-2 text-slate-300">|</span>
  <span className="text-slate-700">{inv.name || '无名称'}</span>
  <span className="mx-2 text-slate-300">|</span>
  <span className="text-emerald-600 font-medium">¥{formatMoney(inv.amount)}</span>
  {inv.issueDate && (
  <>
  <span className="mx-2 text-slate-300">|</span>
  <span className="text-slate-500">{inv.issueDate}</span>
  </>
  )}
  </div>
  <div className="flex items-center gap-2">
  <Button
  onClick={() => {
  setShowDuplicates(false)
  h.handleEditInvoice(inv)
  }}
  
   variant="secondary" size="sm">
  查看
  </Button>
  <Button
  onClick={() => {
  h.handleDeleteInvoice(inv.id)
  showToast('已删除重复发票', 'success')
  }}
  
   variant="danger" size="sm">
  删除
  </Button>
  </div>
  </div>
  ))}
  </div>
  </div>
  ))}
  </div>
  )}
  </div>
  <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
  <Button onClick={() => setShowDuplicates(false)}  variant="secondary">关闭</Button>
  </div>
  </div>
  </div>
  )}
  </div>
  )
}

export default Invoices
