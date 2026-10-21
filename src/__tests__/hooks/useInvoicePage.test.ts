import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ can: () => true, canAny: () => true, isAdmin: () => true, isLoggedIn: () => true }) }))
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
    ea.getPaymentRecords = vi.fn().mockResolvedValue({ success: true, data: mockPayments })
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

  // 服务端 400（如税收分类编码非法 / 超长）不能被当成成功：不关抽屉、不刷新、不误报
  it('保存返回 success:false 时保留抽屉且不刷新列表', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const beforeCalls = (ea.getInvoices as any).mock.calls.length
    ea.createInvoice = vi.fn().mockResolvedValue({ success: false, error: '税收分类编码需为 32 位以内数字或字母' })
    act(() => { result.current.setShowInvoiceModal(true) })

    await act(async () => {
      await result.current.handleSubmitInvoice({
        name: '非法编码票', amount: 1, type: 'invoice_in', fileUrl: '', fileType: '',
      } as any)
    })

    expect(result.current.showInvoiceModal).toBe(true)
    expect((ea.getInvoices as any).mock.calls.length).toBe(beforeCalls)
    expect((ea.createInvoice as any)).toHaveBeenCalledTimes(1)
  })

  // 编辑路径同样不能被 400 当成成功
  it('编辑保存返回 success:false 时保留抽屉且不刷新列表', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const beforeCalls = (ea.getInvoices as any).mock.calls.length
    ea.updateInvoice = vi.fn().mockResolvedValue({ success: false, error: '优惠政策长度不能超过 64 个字符' })
    act(() => { result.current.handleEditInvoice(mockInvoices[0] as any) })
    expect(result.current.showInvoiceModal).toBe(true)

    await act(async () => {
      await result.current.handleSubmitInvoice({
        name: '编辑票', amount: 1, type: 'invoice_in', fileUrl: '', fileType: '',
      } as any)
    })

    expect(result.current.showInvoiceModal).toBe(true)
    expect((ea.getInvoices as any).mock.calls.length).toBe(beforeCalls)
    expect((ea.updateInvoice as any)).toHaveBeenCalledTimes(1)
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

  it('filterDeductStatus=deducted 仅保留已抵扣进项，销项永不进入', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', isDeducted: false },
      { id: 3, type: 'invoice_out', isDeducted: true, deductPeriod: '2024-03' },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterDeductStatus('deducted') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
    expect(result.current.filteredInvoices.every(inv => inv.type === 'invoice_in')).toBe(true)
  })

  it('filterDeductStatus=undeducted 仅保留未抵扣进项，销项永不进入', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', isDeducted: false },
      { id: 3, type: 'invoice_out', isDeducted: false },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterDeductStatus('undeducted') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(2)
    expect(result.current.filteredInvoices.every(inv => inv.type === 'invoice_in')).toBe(true)
  })

  it('filterDeductPeriod 按税款所属期筛选进项，无所属期的行与销项被排除', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', isDeducted: false, deductPeriod: null },
      { id: 3, type: 'invoice_out', isDeducted: true, deductPeriod: '2024-03' },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterDeductPeriod('2024-03') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
  })

  it('抵扣状态与税款所属期可叠加（AND），销项两项均命中也不返回', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-04' },
      { id: 3, type: 'invoice_out', isDeducted: true, deductPeriod: '2024-03' },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterDeductStatus('deducted')
      result.current.setFilterDeductPeriod('2024-03')
    })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
  })

  it('filterStatus 与抵扣筛选为 AND：两个条件须同时满足', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', status: 'issued', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', status: 'received', isDeducted: true, deductPeriod: '2024-03' },
      { id: 3, type: 'invoice_in', status: 'issued', isDeducted: false },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterStatus('issued')
      result.current.setFilterDeductStatus('deducted')
    })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
  })

  it('filterStatus 与抵扣筛选 AND：状态命中但抵扣不命中的行被排除', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', status: 'issued', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', status: 'issued', isDeducted: false },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterStatus('issued')
      result.current.setFilterDeductPeriod('2024-04')
    })
    expect(result.current.filteredInvoices).toHaveLength(0)
  })

  it('deductPeriod 缺失（undefined）的进项被所属期筛选排除', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in', isDeducted: false },   // deductPeriod 为 undefined
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterDeductPeriod('2024-03') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
    expect(result.current.filteredInvoices.some(inv => inv.id === 2)).toBe(false)
  })

  it('isDeducted 缺失（undefined）不算已抵扣，也不满足未抵扣之外的抵扣状态筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_in' },   // isDeducted 为 undefined
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setFilterDeductStatus('deducted') })
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
  })

  it('filterType 切到 invoice_out 时清空抵扣两项筛选，列表恢复为该票种全量', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_out', isDeducted: false },
      { id: 3, type: 'invoice_out', isDeducted: true, deductPeriod: '2024-03' },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterDeductStatus('deducted')
      result.current.setFilterDeductPeriod('2024-03')
    })
    // 抵扣筛选生效时，两张开票行都被排除，仅剩 1 张进项
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
    act(() => { result.current.handleFilterTypeChange('invoice_out') })
    expect(result.current.filterType).toBe('invoice_out')
    expect(result.current.filterDeductStatus).toBe('')
    expect(result.current.filterDeductPeriod).toBe('')
    // 抵扣筛选已清空，开票视图恢复全量（不会被恒空）
    expect(result.current.filteredInvoices).toHaveLength(2)
    expect(result.current.filteredInvoices.every(inv => inv.type === 'invoice_out')).toBe(true)
  })

  it('filterType 切到 invoice_in 时不动抵扣筛选', async () => {
    const { useInvoicePage } = await import('@/hooks/useInvoicePage')
    const data = [
      { id: 1, type: 'invoice_in', isDeducted: true, deductPeriod: '2024-03' },
      { id: 2, type: 'invoice_out', isDeducted: false },
    ]
    ea.getInvoices = vi.fn().mockResolvedValue({ success: true, data })
    const { result } = renderHook(() => useInvoicePage())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setFilterDeductStatus('deducted')
      result.current.setFilterDeductPeriod('2024-03')
    })
    act(() => { result.current.handleFilterTypeChange('invoice_in') })
    expect(result.current.filterDeductStatus).toBe('deducted')
    expect(result.current.filterDeductPeriod).toBe('2024-03')
    expect(result.current.filteredInvoices).toHaveLength(1)
    expect(result.current.filteredInvoices[0].id).toBe(1)
  })
})
