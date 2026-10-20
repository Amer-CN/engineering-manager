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
import { getInvoiceFormData } from '@/components/features/invoices/constants'
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
