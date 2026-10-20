/**
 * InvoiceForm 组件测试
 * - 表单渲染（新增/编辑模式）
 * - 表单输入
 * - 表单提交（提交数据）
 * - 取消按钮
 * - 文件上传
 */
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Project, Partner, IncomeContract, ExpenseContract, InvoiceType, InvoiceKind, InvoiceTaxRate, InvoiceMedium, InvoiceCategory } from '@/types/electron'
import { getInvoiceFormData, resolveTaxRateSelectOptions } from '@/components/features/invoices/constants'
import { dimensionsFromOcrType, isElectronicInvoice } from '@/components/features/invoices/invoiceConfig'

// ═════════════════════════════════════
// Mock：FileDropZone 组件（named export）
// ═════════════════════════════════════
vi.mock('@/components/features/partners/FileDropZone', () => ({
  FileDropZone: vi.fn(({ label, file, onFileSelect, onRemove, onClickUpload }: any) => (
    <div data-testid="file-drop-zone">
      <span>{label}</span>
      {file && <button type="button" onClick={onRemove}>删除</button>}
      <input
        type="file"
        data-testid="file-input"
        onChange={(e: any) => {
          const f = e.target.files?.[0]
          if (f) onFileSelect(f)
        }}
      />
      <button type="button" onClick={onClickUpload}>点击上传</button>
    </div>
  )),
}))

// ═════════════════════════════════════
// Mock：FilePreviewModal 组件
// ═════════════════════════════════════
vi.mock('@/components/features/invoices/FilePreviewModal', () => ({
  default: vi.fn(({ file, onClose }: any) => (
    <div data-testid="file-preview-modal">
      <span>预览</span>
      <button type="button" onClick={onClose}>关闭</button>
    </div>
  )),
}))

// ═════════════════════════════════════
// Mock：useInvoiceOCR（OCR 识别块不加载 pdfjs；用例中按需返回结果）
// ═════════════════════════════════════
const mockProcessInvoiceFile = vi.fn()
vi.mock('@/hooks/useInvoiceOCR', () => ({
  useInvoiceOCR: () => ({
    processInvoiceFile: mockProcessInvoiceFile,
    validateFile: () => null,
  }),
}))

// ═════════════════════════════════════
// Mock：useTaxRates（P1/T1 税率主数据）+ useResolveTaxRate（P1/T1b 默认税率解析）
// InvoiceFormFields 链上挂了 useTaxRates（react-query）——本文件不测主数据加载，
// 与 writingToolbarDraft.test.tsx 对 useActiveLlmModel 同口径 mock 掉，
// 免 QueryClientProvider；hook 自身的正常/失败两条路径由 useTaxRates.test.ts 覆盖。
// 返回空数组 → 组件走 constants 兜底，下拉 6 档与原行为一致。
// useResolveTaxRate 同理 mock 成可重置的 mutation 形状（默认 reject，用例按需覆盖）。
// ═════════════════════════════════════
const mockTaxRatesQuery = vi.hoisted(() => ({ data: undefined as any, isLoading: false, isError: false }))
const mockResolveMutateAsync = vi.hoisted(() => vi.fn())
const mockResolveTaxRate = vi.hoisted(() => ({
  mutateAsync: mockResolveMutateAsync,
  isPending: false,
}))
vi.mock('@/hooks/data/useTaxRates', () => ({
  useTaxRates: () => mockTaxRatesQuery,
  useResolveTaxRate: () => mockResolveTaxRate,
}))

// ═════════════════════════════════════
// 动态 import 避免模块缓存
// ═════════════════════════════════════
const importModule = () => import('@/components/features/invoices/InvoiceForm')

describe('InvoiceForm', () => {
  const mockProjects: Project[] = [
    { id: 1, name: '测试项目A', status: 'in_progress' } as unknown as Project,
    { id: 2, name: '测试项目B', status: 'completed' } as unknown as Project,
  ]

  const mockPartners: Partner[] = [
    { id: 1, name: '供应商A', category: 'material', taxType: 'general' } as unknown as Partner,
    { id: 2, name: '客户B', category: 'client', taxType: 'general' } as unknown as Partner,
  ]

  const mockContracts = {
    income: [{ id: 1, name: '收入合同A', projectId: 1, partnerId: 2 } as unknown as IncomeContract],
    expense: [{ id: 2, name: '支出合同B', projectId: 1, partnerId: 1 } as unknown as ExpenseContract],
  }

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  const createInitialData = (overrides: Partial<any> = {}): any => ({
    type: 'invoice_in' as InvoiceType,
    invoiceMedium: 'electronic',
    invoiceCategory: 'special',
    invoiceKind: 'electronic_special' as InvoiceKind,
    nonDeductibleReason: '',
    isDeducted: false,
    deductDate: '',
    deductPeriod: '',
    deductibleTax: 0,
    invoiceNo: '',
    invoiceCode: '',
    name: '',
    amount: 0,
    priceAmount: 0,
    taxAmount: 0,
    taxRate: 0.13 as InvoiceTaxRate,
    issueDate: '',
    sellerId: '' as any,
    buyerId: '' as any,
    projectId: '' as any,
    contractId: '' as any,
    remarks: '',
    fileUrl: '',
    fileType: '',
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
    mockTaxRatesQuery.data = undefined  // 默认：主数据未加载 → constants 兜底
    mockResolveTaxRate.isPending = false
    // 默认：解析不可用（用例按需覆盖）——防止任何「意外自动调用」静默通过
    mockResolveMutateAsync.mockReset()
    mockResolveMutateAsync.mockRejectedValue(new Error('未配置'))
    // Mock clipboard API - use stubGlobal
    Object.defineProperty(navigator, 'clipboard', {
      value: { read: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders in create mode', async () => {
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 新建模式：抽屉标题为"发票智能录入"（S17）
    expect(screen.getByText('发票智能录入')).toBeInTheDocument()
    // 取消按钮
    expect(screen.getByText('取消')).toBeInTheDocument()
    // 创建按钮
    expect(screen.getByText('创建')).toBeInTheDocument()
  })

  it('renders in edit mode with initialData', async () => {
    const { InvoiceForm } = await importModule()
    const editData = createInitialData({
      invoiceNo: 'INV-001',
      name: '测试发票',
      amount: 113,
      taxRate: 0.13,
    })
    render(
      <InvoiceForm
        initialData={editData}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 编辑模式：标题为"编辑发票"
    expect(screen.getByText('编辑发票')).toBeInTheDocument()
  })

  it('updates form fields on user input', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 输入发票号码（第一个 textbox）
    const inputs = screen.getAllByRole('textbox')
    const noInput = inputs[0]
    await user.type(noInput, 'INV-2024-001')
    expect(noInput).toHaveValue('INV-2024-001')

    // 输入发票名称（第二个 textbox）
    const nameInput = inputs[1]
    await user.type(nameInput, '新发票名称')
    expect(nameInput).toHaveValue('新发票名称')
  })

  it('selects invoice type', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const selects = screen.getAllByRole('combobox')
    const typeSelect = selects[0] as HTMLSelectElement
    expect(typeSelect).toHaveValue('invoice_in')

    await user.selectOptions(typeSelect, 'invoice_out')
    expect(typeSelect.value).toBe('invoice_out')
  })

  it('selects invoice medium and category (two dimensions)', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const selects = screen.getAllByRole('combobox')
    // 顺序：发票类型 / 介质 / 票种
    const mediumSelect = selects[1] as HTMLSelectElement
    const categorySelect = selects[2] as HTMLSelectElement
    expect(mediumSelect.value).toBe('electronic')
    expect(categorySelect.value).toBe('special')

    await user.selectOptions(mediumSelect, 'paper')
    await user.selectOptions(categorySelect, 'regular')
    expect(mediumSelect.value).toBe('paper')
    expect(categorySelect.value).toBe('regular')
  })

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(screen.getByText('取消'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onSubmit with form data when form is submitted', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 填写发票名称（第二个 textbox）
    const inputs = screen.getAllByRole('textbox')
    const nameInput = inputs[1]
    await user.type(nameInput, '测试发票')

    // 填写发票号码（第一个 textbox）
    const noInput = inputs[0]
    await user.type(noInput, 'INV-001')

    // 移除 required 属性（jsdom 中会阻止表单提交）
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交
    await user.click(screen.getByText('创建'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.name).toBe('测试发票')
    expect(submitted?.invoiceNo).toBe('INV-001')
  })

  it('submits two dimensions and derived kind (electronic + passenger transport → empty kind)', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[1], 'electronic')
    await user.selectOptions(selects[2], 'passenger_transport')

    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'INV-2026-001')
    await user.type(inputs[1], '旅客运输发票')

    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))
    await user.click(screen.getByText('创建'))

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1))
    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.invoiceMedium).toBe('electronic')
    expect(submitted?.invoiceCategory).toBe('passenger_transport')
    expect(submitted?.invoiceKind).toBe('')
  })

  it('backfills two dimensions from OCR invoiceType (电子旅客运输 → electronic + passenger_transport, empty kind)', async () => {
    const user = userEvent.setup()
    // OCR 识别块会先 fetch(fileUrl) 再交给 processInvoiceFile
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      blob: async () => new Blob(['ocr'], { type: 'image/jpeg' }),
    }))
    mockProcessInvoiceFile.mockResolvedValue({
      invoiceNo: 'INV-OCR-001',
      invoiceCode: '',
      issueDate: '',
      invoiceType: '电子旅客运输',
      amount: 100,
      priceAmount: 100,
      taxAmount: 0,
      taxRate: 0.09,
      sellerName: '',
      purchaserName: '',
      itemName: '',
      remarks: '',
    })

    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({
          fileUrl: 'data:image/jpeg;base64,ocr',
          fileType: 'image',
          invoiceMedium: 'paper',
          invoiceCategory: 'regular',
          invoiceKind: 'paper_regular',
        })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: /AI 识别发票/ }))

    const selects = screen.getAllByRole('combobox')
    await waitFor(() => {
      expect((selects[1] as HTMLSelectElement).value).toBe('electronic')
      expect((selects[2] as HTMLSelectElement).value).toBe('passenger_transport')
    })

    // 提交 payload 中 kind 为空（旅客运输不折叠成电子普票）
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))
    await user.click(screen.getByText('创建'))

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1))
    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.invoiceMedium).toBe('electronic')
    expect(submitted?.invoiceCategory).toBe('passenger_transport')
    expect(submitted?.invoiceKind).toBe('')
  })

  it('backfills legacy invoiceKind (paper_special) into two dimensions', async () => {
    const { InvoiceForm } = await importModule()
    const legacy = createInitialData({ invoiceKind: 'paper_special' })
    delete legacy.invoiceMedium
    delete legacy.invoiceCategory
    render(
      <InvoiceForm
        initialData={legacy}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const selects = screen.getAllByRole('combobox')
    expect((selects[1] as HTMLSelectElement).value).toBe('paper')
    expect((selects[2] as HTMLSelectElement).value).toBe('special')
    // 纸质票才渲染发票代码栏
    expect(screen.getByText('发票代码')).toBeInTheDocument()
  })

  it('shows file upload zone', async () => {
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // FileDropZone 应被渲染
    expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument()
    expect(screen.getByText('上传发票')).toBeInTheDocument()
  })

  it('renders partner selects (seller and buyer)', async () => {
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 销售方 select
    expect(screen.getByText('请选择销售方')).toBeInTheDocument()
    // 购买方 select
    expect(screen.getByText('请选择购买方')).toBeInTheDocument()
    // 合作单位选项 - 使用 getAllByText 避免多匹配报错
    expect(screen.getAllByText('供应商A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('客户B').length).toBeGreaterThan(0)
  })

  it('renders project select', async () => {
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 项目 select
    expect(screen.getByText('请选择项目')).toBeInTheDocument()
    expect(screen.getByText('测试项目A')).toBeInTheDocument()
    expect(screen.getByText('测试项目B')).toBeInTheDocument()
  })

  it('P0-b：进项勾选已抵扣后显示三字段，提交随 payload 透传（税额默认值可改）', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxAmount: 130 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 进项（收票）默认未勾选，三字段不渲染
    const checkbox = screen.getByRole('checkbox', { name: '已抵扣' })
    expect(checkbox).not.toBeChecked()
    expect(screen.queryByLabelText(/税款所属期/)).toBeNull()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    // 可抵扣税额默认等于税额（130）
    const deductibleTaxInput = screen.getByLabelText(/可抵扣税额/) as HTMLInputElement
    expect(deductibleTaxInput.value).toBe('130')
    // F6：实际改值后，提交 payload 必须透传新值（不是默认 130）
    fireEvent.change(deductibleTaxInput, { target: { value: '99.5' } })
    expect(deductibleTaxInput.value).toBe('99.5')

    fireEvent.change(screen.getByLabelText(/抵扣日期/), { target: { value: '2026-10-20' } })
    fireEvent.change(screen.getByLabelText(/税款所属期/), { target: { value: '2026-09' } })

    await user.type(screen.getByLabelText(/发票号码/), 'INV-2026-DED')
    await user.type(screen.getByLabelText(/发票名称/), '进项抵扣票')

    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))
    await user.click(screen.getByText('创建'))

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1))
    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.isDeducted).toBe(true)
    expect(submitted?.deductDate).toBe('2026-10-20')
    expect(submitted?.deductPeriod).toBe('2026-09')
    expect(submitted?.deductibleTax).toBe(99.5)
  })

  it('P0-b：开票（销项）不显示抵扣登记，切到开票时清空已填抵扣值', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({
          isDeducted: true,
          deductDate: '2026-10-20',
          deductPeriod: '2026-09',
          deductibleTax: 88,
        })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'invoice_out')
    expect(screen.queryByRole('checkbox', { name: '已抵扣' })).toBeNull()

    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))
    await user.click(screen.getByText('创建'))

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1))
    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.isDeducted).toBe(false)
    expect(submitted?.deductDate).toBe('')
    expect(submitted?.deductPeriod).toBe('')
    expect(submitted?.deductibleTax).toBe(0)
  })

  // ═════════════════════════════════════
  // P1/T1：税率下拉数据源 —— 主数据优先 / constants 兜底
  // ═════════════════════════════════════
  // 税率 select 的 <label> 无 htmlFor（既有实现），按「税率 *」文本的相邻 select 取。
  const getTaxRateSelect = (): HTMLSelectElement => {
    const label = Array.from(document.querySelectorAll('label.label'))
      .find(l => l.textContent?.trim() === '税率 *')
    const select = label?.parentElement?.querySelector('select')
    if (!select) throw new Error('未找到税率下拉')
    return select as HTMLSelectElement
  }

  it('P1/T1：税率主数据可用时，下拉用主数据标签', async () => {
    mockTaxRatesQuery.data = [
      { id: 6, code: 'VAT13', name: '13%', rate: 0.13, category: 'general', effectiveFrom: '2026-01-01', effectiveTo: null, isDefault: 0 },
      { id: 1, code: 'VAT0', name: '不征税', rate: 0, category: 'zero', effectiveFrom: '2026-01-01', effectiveTo: null, isDefault: 1 },
    ] as any
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const select = getTaxRateSelect()
    expect(Array.from(select.options).map(o => o.label)).toEqual(['不征税', '13%'])
  })

  it('P1/T1：主数据缺失（失败/空）时，下拉回落 constants 六档兜底', async () => {
    mockTaxRatesQuery.data = undefined
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData()}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const select = getTaxRateSelect()
    expect(Array.from(select.options).map(o => o.label)).toEqual(['不征税', '1%', '3%', '6%', '9%', '13%'])
  })

  // ═════════════════════════════════════
  // P1/T1b：默认税率解析 —— 显式点击三路径 + 「无自动改税率」防御
  // 财税零容错：解析只能由用户点击「按规则取默认」触发；matchedBy=none 不得改税率。
  // ═════════════════════════════════════
  const getResolveButton = () => screen.getByRole('button', { name: '按规则取默认' })

  it('P1/T1b：点击命中规则 → 税率改为解析值且提示含「规则」', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.09, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(getTaxRateSelect().value).toBe('0.09')

    await user.click(getResolveButton())

    await waitFor(() => expect(getTaxRateSelect().value).toBe('0.13'))
    // 提示文案核对：数值 + 来源（rule → 规则），排除把「按规则取默认」按钮文字误当提示
    expect(screen.getByText(/^已按规则取默认：13%（规则）$/)).toBeInTheDocument()
    // 入参：issueDate 空 → date 不下发；对方资质取收票（进项）的销售方
    expect(mockResolveMutateAsync).toHaveBeenCalledWith({ date: undefined, partnerTaxType: 'general' })
  })

  it('P1/T1b：matchedBy=none → 税率不变且提示「无匹配规则」', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: null, code: null, rate: null, matchedBy: 'none' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.09, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())

    await waitFor(() => expect(screen.getByText('无匹配规则，未改动')).toBeInTheDocument())
    expect(getTaxRateSelect().value).toBe('0.09')
  })

  it('P1/T1b：解析抛错 → 提示「取默认税率失败」且税率不变', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockRejectedValue(new Error('后端不可用'))
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.09, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())

    await waitFor(() => expect(screen.getByText('取默认税率失败')).toBeInTheDocument())
    expect(getTaxRateSelect().value).toBe('0.09')
  })

  it('P1/T1b：开票（销项）取购买方纳税资质，且带开票日期', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ type: 'invoice_out', taxRate: 0.06, buyerId: 2, issueDate: '2026-10-21' })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())

    await waitFor(() => expect(getTaxRateSelect().value).toBe('0.13'))
    expect(mockResolveMutateAsync).toHaveBeenCalledWith({ date: '2026-10-21', partnerTaxType: 'general' })
  })

  it('P1/T1b：无对方资质 → partnerTaxType 为 undefined，不伪造维度（默认档 0% 不回填）', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 1, code: 'VAT0', rate: 0, matchedBy: 'default' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.13 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())

    await waitFor(() => expect(screen.getByText('默认档为 0%（不征税），未自动回填，请手工确认')).toBeInTheDocument())
    expect(mockResolveMutateAsync).toHaveBeenCalledWith({ date: undefined, partnerTaxType: undefined })
    // F1：default 档 0% 不得回填，用户已选的 13% 保持不动
    expect(getTaxRateSelect().value).toBe('0.13')
  })

  // ═════════════════════════════════════
  // T1b 第 2 轮加固（F1/F2/F3）：0% 默认护栏 / 档位校验 / 维度变化清提示
  // ═════════════════════════════════════
  it('T1b-F1：matchedBy=default 且 rate=0 → 税率不变且提示「未自动回填」', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 1, code: 'VAT0', rate: 0, matchedBy: 'default' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.13, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(getTaxRateSelect().value).toBe('0.13')
    await user.click(getResolveButton())

    const hint = await screen.findByText(/未自动回填，请手工确认/)
    expect(hint).toHaveAttribute('aria-live', 'polite')
    // 关键断言：不得被静默改成 0%
    expect(getTaxRateSelect().value).toBe('0.13')
  })

  it('T1b-F2：rate 不在可用档位（5%）→ 税率不变且提示「不在可用税率档位」', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 9, code: 'VAT5', rate: 0.05, matchedBy: 'rule' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.13, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())

    await waitFor(() => expect(screen.getByText('解析结果不在可用税率档位内，未改动')).toBeInTheDocument())
    expect(getTaxRateSelect().value).toBe('0.13')
  })

  it('T1b-F3：切换票种/对方后旧提示被清除', async () => {
    const user = userEvent.setup()
    mockResolveMutateAsync.mockResolvedValue({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.09, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(getResolveButton())
    await waitFor(() => expect(screen.getByText(/^已按规则取默认：13%（规则）$/)).toBeInTheDocument())

    // 切票种（收票 → 开票）：对方主体含义变了，旧结论作废
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'invoice_out')
    await waitFor(() => expect(screen.queryByText(/^已按规则取默认：13%（规则）$/)).toBeNull())

    // 再点一次拿到提示后，改对方主体同样清除
    mockResolveMutateAsync.mockResolvedValue({ rateId: 6, code: 'VAT13', rate: 0.13, matchedBy: 'rule' })
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'invoice_in')
    await user.click(getResolveButton())
    await waitFor(() => expect(screen.getByText(/^已按规则取默认：13%（规则）$/)).toBeInTheDocument())

    const sellerSelect = screen.getByText('请选择销售方').closest('select') as HTMLSelectElement
    await user.selectOptions(sellerSelect, '2')
    await waitFor(() => expect(screen.queryByText(/^已按规则取默认：13%（规则）$/)).toBeNull())
  })

  it('P1/T1b 防御：挂载/改日期/改对方都不触发解析（不存在自动改税率的路径）', async () => {
    const user = userEvent.setup()
    const { InvoiceForm } = await importModule()
    render(
      <InvoiceForm
        initialData={createInitialData({ taxRate: 0.09, sellerId: 1 })}
        projects={mockProjects}
        partners={mockPartners}
        contracts={mockContracts}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 挂载后 + 用户改开票日期 + 改销售方：解析接口一次都不许被调用
    expect(mockResolveMutateAsync).not.toHaveBeenCalled()

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'invoice_out')
    await user.selectOptions(selects[0], 'invoice_in')
    fireEvent.change(screen.getByLabelText(/开票日期/), { target: { value: '2026-10-21' } })

    expect(mockResolveMutateAsync).not.toHaveBeenCalled()
    expect(getTaxRateSelect().value).toBe('0.09')
  })
})

describe('resolveTaxRateSelectOptions（P1/T1 主数据 → 下拉选项，R3 去重顺序）', () => {
  const rate = (over: Record<string, unknown>) => ({
    id: 1, code: 'VAT13', name: '13%', rate: 0.13, category: 'general',
    effectiveFrom: '2026-01-01', effectiveTo: null, isDefault: 0, ...over,
  }) as any

  it('同一税率多生效期时，保留 effectiveFrom 最新的一条', () => {
    const options = resolveTaxRateSelectOptions([
      rate({ id: 1, rate: 0.13, name: '13%（旧）', effectiveFrom: '2025-01-01' }),
      rate({ id: 2, rate: 0.13, name: '13%（新）', effectiveFrom: '2026-01-01' }),
    ])
    expect(options).toEqual([{ value: 0.13, label: '13%（新）' }])
  })

  it('effectiveFrom 缺失/空视为最早，不抢占已有生效期', () => {
    const options = resolveTaxRateSelectOptions([
      rate({ id: 1, rate: 0.09, name: '9%（无生效期）', effectiveFrom: '' }),
      rate({ id: 2, rate: 0.09, name: '9%（有生效期）', effectiveFrom: '2026-01-01' }),
    ])
    expect(options).toEqual([{ value: 0.09, label: '9%（有生效期）' }])
  })

  it('去重后仍按 rate 升序输出', () => {
    const options = resolveTaxRateSelectOptions([
      rate({ id: 1, code: 'VAT13', rate: 0.13, name: '13%', effectiveFrom: '2026-01-01' }),
      rate({ id: 2, code: 'VAT0', rate: 0, name: '不征税', effectiveFrom: '2026-01-01', isDefault: 1 }),
      rate({ id: 3, code: 'VAT6', rate: 0.06, name: '6%', effectiveFrom: '2026-01-01' }),
    ])
    expect(options.map(o => o.value)).toEqual([0, 0.06, 0.13])
  })

  it('空/缺失回落 constants 六档兜底', () => {
    expect(resolveTaxRateSelectOptions(null).map(o => o.value)).toEqual([0, 0.01, 0.03, 0.06, 0.09, 0.13])
    expect(resolveTaxRateSelectOptions([]).map(o => o.value)).toEqual([0, 0.01, 0.03, 0.06, 0.09, 0.13])
  })
})

describe('getInvoiceFormData（票种两维回填）', () => {
  const baseInvoice = {
    id: 1, type: 'invoice_in', status: 'issued', invoiceNo: '001', name: '测试',
    amount: 100, priceAmount: 100, taxAmount: 0, taxRate: 0.09, issueDate: '2026-01-01',
    sellerId: 1, buyerId: 2, projectId: null, contractId: null, remarks: '',
  } as any

  it('旧数据只有 invoiceKind 时从 kind 推导两维', () => {
    const data = getInvoiceFormData({ ...baseInvoice, invoiceKind: 'paper_special' })
    expect(data.invoiceMedium).toBe('paper')
    expect(data.invoiceCategory).toBe('special')
    expect(data.invoiceKind).toBe('paper_special')
  })

  it('两维存在时优先使用两维（即便 kind 为空）', () => {
    const data = getInvoiceFormData({
      ...baseInvoice,
      invoiceKind: '',
      invoiceMedium: 'electronic',
      invoiceCategory: 'train',
    })
    expect(data.invoiceMedium).toBe('electronic')
    expect(data.invoiceCategory).toBe('train')
    expect(data.invoiceKind).toBe('')
  })

  it('两维与 kind 都为空时不再兜底成 electronic_regular', () => {
    const data = getInvoiceFormData({ ...baseInvoice, invoiceKind: '', invoiceMedium: null, invoiceCategory: null })
    expect(data.invoiceMedium).toBe('')
    expect(data.invoiceCategory).toBe('')
    expect(data.invoiceKind).toBe('')
  })
})

describe('dimensionsFromOcrType（OCR 票种/介质映射）', () => {
  // 「具体票种优先，专用/普通最后」：覆盖 8 类票种与别名。
  const categoryCases: Array<[string, InvoiceMedium | '', InvoiceCategory | '']> = [
    ['通行费', '', 'toll'],
    ['旅客运输', '', 'passenger_transport'],
    ['火车票', '', 'train'],
    ['飞机票', '', 'plane'],
    ['定额发票', 'paper', 'quota'],
    ['卷式发票', 'paper', 'roll'],
    ['增值税专用发票', 'paper', 'special'],
    ['增值税普通发票', 'paper', 'regular'],
    ['过路费', '', 'toll'],
    ['过桥费', '', 'toll'],
    ['客运发票', 'paper', 'passenger_transport'],
    ['公路客运', '', 'passenger_transport'],
    ['水路运输', '', 'passenger_transport'],
    ['出租车票', '', 'passenger_transport'],
    ['铁路电子客票', 'electronic', 'train'],
    ['铁路旅客运输电子客票', 'electronic', 'train'],
    ['铁路客运', '', 'train'],
    ['航空运输电子客票行程单', 'electronic', 'plane'],
    ['航空旅客运输电子客票', 'electronic', 'plane'],
    ['行程单', '', 'plane'],
    ['卷票', '', 'roll'],
  ]

  it.each(categoryCases)('「%s」→ medium=%s / category=%s', (type, medium, category) => {
    const result = dimensionsFromOcrType(type)
    expect(result.medium).toBe(medium)
    expect(result.category).toBe(category)
  })

  it('「旅客运输电子普通发票」优先命中旅客运输，不得判成 regular', () => {
    const result = dimensionsFromOcrType('旅客运输电子普通发票')
    expect(result.medium).toBe('electronic')
    expect(result.category).toBe('passenger_transport')
    expect(result.category).not.toBe('regular')
  })

  const mediumCases: Array<[string, InvoiceMedium, boolean]> = [
    ['电子发票', 'electronic', false],
    ['ELECTRONIC INVOICE', 'electronic', false],
    ['电子普通发票', 'electronic', false],
    ['纸质发票', 'paper', false],
    ['paper invoice', 'paper', false],
    ['增值税普通发票', 'paper', true],
    ['住宿服务发票', 'paper', true],
    ['invoice', 'paper', true],
  ]

  it.each(mediumCases)('「%s」→ medium=%s（按票面文字推断=%s）', (type, medium, inferred) => {
    const result = dimensionsFromOcrType(type)
    expect(result.medium).toBe(medium)
    expect(result.mediumInferredFromInvoiceText).toBe(inferred)
  })

  it('未命中介质/票种时保留 fallback', () => {
    const result = dimensionsFromOcrType('住宿服务', 'electronic', 'special')
    expect(result.medium).toBe('electronic')
    expect(result.category).toBe('special')
    expect(result.mediumInferredFromInvoiceText).toBe(false)
  })

  it('空文本保留 fallback', () => {
    const result = dimensionsFromOcrType('', 'paper', 'train')
    expect(result.medium).toBe('paper')
    expect(result.category).toBe('train')
  })
})

describe('isElectronicInvoice（FP06 前端门控）', () => {
  it.each([
    ['旧数据 electronic_regular', { invoiceKind: 'electronic_regular' }, true],
    ['kind 含空格/大写', { invoiceKind: ' ELECTRONIC_REGULAR ' }, true],
    ['两维 electronic 含空格', { invoiceMedium: ' electronic ' }, true],
    ['纸质票', { invoiceMedium: 'paper', invoiceKind: 'paper_regular' }, false],
    ['空值', {}, false],
  ])('%s → %s', (_label, invoice, expected) => {
    expect(isElectronicInvoice(invoice as any)).toBe(expected)
  })
})
