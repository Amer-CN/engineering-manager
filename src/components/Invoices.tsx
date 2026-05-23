import React from 'react'
import { useToastStore } from '@/store/toastStore'
import { useInvoicePage } from '../hooks/useInvoicePage'
import { printInvoiceList, printPaymentList, exportInvoiceList, handlePrint, printPaymentRecordList, exportPaymentRecordList } from './features/invoices/printExport'
import { formatMoney } from '../utils/format'
import {
  InvoiceStats, InvoiceFilters, InvoiceList, InvoiceForm,
  PaymentList, PaymentForm, PaymentStats,
} from './features/invoices'
import { getInvoiceFormData, getPaymentFormData } from './features/invoices/constants'
import { FilePreviewModal } from './features/invoices/FilePreviewModal'

interface InvoicesProps { refresh?: () => void }

const Invoices: React.FC<InvoicesProps> = ({ refresh }) => {
  const showToast = useToastStore(state => state.showToast)
  const h = useInvoicePage(refresh)

  if (h.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 bg-slate-50 px-6 pt-6 pb-2 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">发票管理</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">管理收票、开票及收款业务</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { h.setEditingPayment(null); h.setShowPaymentModal(true) }} className="btn bg-amber-500 hover:bg-amber-600 text-white">
              <span className="text-xl">+</span> 回款/付款登记
            </button>
            <button onClick={() => { h.setEditingInvoice(null); h.setShowInvoiceModal(true) }} className="btn btn-primary">
              <span className="text-xl">+</span> 新建发票
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
          <button onClick={() => h.setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${h.activeTab === 'invoices' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            发票列表
          </button>
          <button onClick={() => h.setActiveTab('payments')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${h.activeTab === 'payments' ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
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
          onExportExcel={h.activeTab === 'invoices' ? () => exportInvoiceList(h.filteredInvoices) : () => exportPaymentRecordList(h.filteredPayments, showToast as any)}
          isPaymentFilter={h.activeTab === 'payments'}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 max-w-[1400px] mx-auto w-full">
        {h.activeTab === 'invoices' && (
          <InvoiceList invoices={h.filteredInvoices} onEdit={h.handleEditInvoice} onDelete={h.handleDeleteInvoice}
            onStatusChange={h.handleStatusChange} onPrint={(inv) => printInvoiceList([inv])} onPreview={h.handlePreview} />
        )}
        {h.activeTab === 'payments' && (
          <PaymentList records={h.filteredPayments} onEdit={h.handleEditPayment} onDelete={h.handleDeletePayment}
            onPrint={(rec) => printPaymentList([rec])} onPreview={h.handlePreview} />
        )}
      </div>

      {h.showInvoiceModal && (
        <InvoiceForm initialData={getInvoiceFormData(h.editingInvoice)} projects={h.projects} partners={h.partners}
          contracts={h.contracts} onSubmit={h.handleSubmitInvoice}
          onCancel={() => { h.setShowInvoiceModal(false); h.setEditingInvoice(null) }} />
      )}
      {h.showPaymentModal && (
        <PaymentForm initialData={getPaymentFormData(h.editingPayment)} projects={h.projects} partners={h.partners}
          invoices={h.invoices} contracts={h.contracts} onSubmit={h.handleSubmitPayment}
          onCancel={() => { h.setShowPaymentModal(false); h.setEditingPayment(null) }} />
      )}
      {h.previewFile && <FilePreviewModal file={h.previewFile} onClose={() => h.setPreviewFile(null)} />}
    </div>
  )
}

export default Invoices
