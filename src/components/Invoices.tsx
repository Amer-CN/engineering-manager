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
  <div className="flex-shrink-0 px-6 pt-6 pb-2 max-w-[1400px] mx-auto w-full" style={{ background: 'var(--bg)' }}>
  <div className="flex items-end justify-between mb-4">
  <div>
  <h1 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>发票管理</h1>
  <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>管理收票、开票及收款业务</p>
  </div>
  <div className="flex items-center gap-3 flex-shrink-0">
  {duplicateInvoices.length > 0 && (
  <Button onClick={() => setShowDuplicates(true)}  variant="warning" className="flex items-center gap-2">
  <Icon name="AlertTriangle" size={16} />
  检测到 {duplicateInvoices.length} 组重复发票
  </Button>
  )}
  <Button onClick={() => { h.setEditingPayment(null); h.setShowPaymentModal(true) }} variant="secondary">
  <span className="text-xl leading-none">+</span> 回款/付款登记
  </Button>
  <Button onClick={() => { h.setEditingInvoice(null); h.setShowInvoiceModal(true) }}  variant="primary">
  <span className="text-xl leading-none">+</span> 新建发票
  </Button>
  </div>
  </div>

  <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-4" style={{ background: 'var(--panel-2)' }}>
  <button onClick={() => h.setActiveTab('invoices')} className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={h.activeTab === 'invoices' ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}>
  发票列表
  </button>
  <button onClick={() => h.setActiveTab('payments')} className="px-4 py-2 rounded-lg text-sm font-medium transition-all" style={h.activeTab === 'payments' ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}>
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
  onPrint={h.activeTab === 'invoices' ? () => printInvoiceList(h.filteredInvoices) : () => printPaymentRecordList(h.filteredPayments, showToast as (msg: string, type?: string, duration?: number) => void, formatMoney, handlePrint)}
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
  invoices={h.invoices} contracts={h.contracts} isEditing={!!h.editingPayment} onSubmit={h.handleSubmitPayment}
  onCancel={() => { h.setShowPaymentModal(false); h.setEditingPayment(null) }} />
  )}
  {h.previewFile && <FilePreviewModal file={h.previewFile} onClose={() => h.setPreviewFile(null)} />}

  {/* 重复发票弹窗 */}
  {showDuplicates && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
  <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--fg)' }}>
  <Icon name="AlertTriangle" size={20} className="text-[color:var(--warning)]" />
  重复发票检测
  </h2>
  <button onClick={() => setShowDuplicates(false)} className="text-[color:var(--muted)] hover:text-[color:var(--fg-2)]">✕</button>
  </div>
  <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
  {duplicateInvoices.length === 0 ? (
  <div className="text-center py-8">
  <Icon name="CheckCircle" size={48} className="text-[color:var(--success)] mx-auto mb-4" />
  <p style={{ color: 'var(--fg-2)' }}>没有发现重复发票</p>
  </div>
  ) : (
  <div className="space-y-4">
  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
  发现 {duplicateInvoices.length} 组重复发票，请检查并删除多余的记录。
  </p>
  {duplicateInvoices.map(({ invoiceNo, invoices }) => (
  <div key={invoiceNo} className="rounded-xl p-4" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
  <div className="flex items-center justify-between mb-3">
  <span className="font-mono text-sm font-medium" style={{ color: 'var(--fg)' }}>
  发票号: {invoiceNo}
  </span>
  <span className="text-xs px-2 py-1 rounded-full" style={{ color: 'var(--warning)', background: 'var(--warning-soft)' }}>
  {invoices.length} 条记录
  </span>
  </div>
  <div className="space-y-2">
  {invoices.map((inv, idx) => (
  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
  <div className="text-sm">
  <span className="font-medium" style={{ color: 'var(--fg-2)' }}>#{idx + 1}</span>
  <span className="mx-2" style={{ color: 'var(--border-strong)' }}>|</span>
  <span style={{ color: 'var(--fg-2)' }}>{inv.name || '无名称'}</span>
  <span className="mx-2" style={{ color: 'var(--border-strong)' }}>|</span>
  <span className="font-medium font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(inv.amount)}</span>
  {inv.issueDate && (
  <>
  <span className="mx-2" style={{ color: 'var(--border-strong)' }}>|</span>
  <span className="font-mono tabular-nums" style={{ color: 'var(--muted)' }}>{inv.issueDate}</span>
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
  <div className="px-6 py-4 flex justify-end" style={{ borderTop: '1px solid var(--border)' }}>
  <Button onClick={() => setShowDuplicates(false)}  variant="secondary">关闭</Button>
  </div>
  </div>
  </div>
  )}
  </div>
  )
}

export default Invoices
