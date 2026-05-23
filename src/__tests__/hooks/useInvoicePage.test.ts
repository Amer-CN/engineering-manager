import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies
vi.mock('@/utils/audit', () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logDelete: vi.fn(),
  logApprove: vi.fn(),
}))
vi.mock('@/store/toastStore', () => ({
  useToastStore: vi.fn(() => vi.fn()),
}))
vi.mock('@/services/fileService', () => ({
  processFileFields: vi.fn(async (data) => data),
  guessFileExt: vi.fn(() => '.pdf'),
  readUploadedFile: vi.fn(async () => 'data:application/pdf;base64,fake'),
  FILE_CATEGORIES: {
    INVOICE_OUT: { category: 'contracts', subCategory: 'invoice_out' },
    INVOICE_IN: { category: 'contracts', subCategory: 'invoice_in' },
    PAYMENT_IN: { category: 'contracts', subCategory: 'payment_in' },
    PAYMENT_OUT: { category: 'contracts', subCategory: 'payment_out' },
  },
}))

const mockInvoices = [
  { id: 1, name: '发票1', type: 'invoice_in', status: 'issued', projectId: 10, amount: 10000, issueDate: '2024-01-15', invoiceNo: 'INV001', sellerName: '供应商A', buyerName: '我方' },
  { id: 2, name: '发票2', type: 'invoice_out', status: 'received', projectId: 20, amount: 20000, issueDate: '2024-02-15', invoiceNo: 'INV002', sellerName: '我方', buyerName: '客户B' },
]
const mockPayments = [
  { id: 1, type: 'invoice_in', amount: 5000, recordDate: '2024-01-20', projectId: 10 },
]
const mockProjects = [
  { id: 10, name: '项目A' },
  { id: 20, name: '项目B' },
]
const mockPartners = [
  { id: 1, name: '供应商A' },
]
const mockIncomeContracts = [
  { id: 1, name: '收入合同1', projectId: 10 },
]
const mockExpenseContracts = [
  { id: 1, name: '支出合同1', projectId: 20 },
]

describe('useInvoicePage', () => {
  let ea: Record<string, any>

  beforeEach(() => {
    vi.clearAllMocks()
    ea = window.electronAPI as Record<string, any>
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data: mockInvoices })
    ea.getWagePaymentRecords = vi.fn().mockResolvedValue({ success: true, data: mockPayments })
    ea.getProjects = vi.fn().mockResolvedValue({ success: true, data: mockProjects })
    ea.getPartners = vi.fn().mockResolvedValue({ success: true, data: mockPartners })
    ea.getIncomeContracts = vi.fn().mockResolvedValue({ success: true, data: mockIncomeContracts })
    ea.getExpenseContracts = vi.fn().mockResolvedValue({ success: true, data: mockExpenseContracts })
    ea.updateInvoice = vi.fn().mockResolvedValue({ success: true })
    ea.createInvoice = vi.fn().mockResolvedValue({ success: true, data: { id: 3 } })
    ea.deleteInvoice = vi.fn().mockResolvedValue({ success: true })
    ea.updateInvoiceStatus = vi.fn().mockResolvedValue({ success: true })
    ea.createPaymentRecord = vi.fn().mockResolvedValue({ success: true, data: { id: 2 } })
    ea.updatePaymentRecord = vi.fn().mockResolvedValue({ success: true })
    ea.deletePaymentRecord = vi.fn().mockResolvedValue({ success: true })
    ea.readFile = vi.fn().mockResolvedValue({ success: true, data: { dataUrl: 'data:image/png;base64,fake', mimeType: 'image/png' } })
  })

  it('挂载时加载所有数据', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.invoices).toHaveLength(2)
    expect(result.current.paymentRecords).toHaveLength(1)
    expect(result.current.projects).toHaveLength(2)
    expect(result.current.partners).toHaveLength(1)
    expect(result.current.contracts.income).toHaveLength(1)
    expect(result.current.contracts.expense).toHaveLength(1)
  })

  it('filteredInvoices 按 type 筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterType('invoice_in') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].type).toBe('invoice_in')
  })

  it('filteredInvoices 按 status 筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterStatus('received') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].status).toBe('received')
  })

  it('filteredInvoices 按 projectId 筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterProject(10) })
    expect(result.current.filteredInvoices).toHaveLength(1)
  })

  it('filteredInvoices 按日期范围筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterDateStart('2024-02-01')
      result.current.setFilterDateEnd('2024-02-28')
    })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].issueDate).toBe('2024-02-15')
  })

  it('filteredPayments 按 type 筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterPaymentType('invoice_in') })
    expect(result.current.filteredPayments).toHaveLength(1)
  })

  it('handleEditInvoice 设置编辑状态', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Invoice with data: URL doesn't need file read
    const invoice = { ...mockInvoices[0], fileUrl: 'data:image/png;base64,fake' }
    await act(async () => {
      await result.current.handleEditInvoice(invoice as any)
    })
    expect(result.current.editingInvoice).toBeTruthy()
    expect(result.current.showInvoiceModal).toBe(true)
  })

  it('handleStatusChange 更新状态', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.handleStatusChange(1, 'received')
    })
    expect(ea.updateInvoiceStatus).toHaveBeenCalledWith(1, 'received')
  })

  it('setActiveTab 切换', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    expect(result.current.activeTab).toBe('invoices')
    act(() => { result.current.setActiveTab('payments') })
    await waitFor(() => expect(result.current.activeTab).toBe('payments'))
  })

  it('setPreview 设置预览', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const preview = { data: 'data:image/png;base64,abc', type: 'image' as const, title: 'test' }
    act(() => { result.current.setPreviewFile(preview) })
    expect(result.current.previewFile).toEqual(preview)
  })

  it('filterPaymentProject 筛选付款记录', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterPaymentProject(10) })
    expect(result.current.filteredPayments).toHaveLength(1)
  })
})
