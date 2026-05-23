/**
 * InvoiceForm 组件测试
 * - 表单渲染（新增/编辑模式）
 * - 表单输入
 * - 表单提交（提交数据）
 * - 取消按钮
 * - 文件上传
 */
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Project, Partner, IncomeContract, ExpenseContract, InvoiceType, InvoiceKind, InvoiceTaxRate } from '@/types/electron'

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
    invoiceKind: 'electronic_special' as InvoiceKind,
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
    // 新建模式：标题为"新建发票"
    expect(screen.getByText('新建发票')).toBeInTheDocument()
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

  it('selects invoice kind', async () => {
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
    const kindSelect = selects[1] as HTMLSelectElement
    // 默认应为 electronic_special
    expect(kindSelect.value).toBe('electronic_special')

    await user.selectOptions(kindSelect, 'paper_special')
    expect(kindSelect.value).toBe('paper_special')
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
})
