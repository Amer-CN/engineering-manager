import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

// ─── 可变 Mock 引用（vi.mock 提升后仍能访问） ─────────
const mockShowToast = vi.fn()

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => true }),
}))

vi.mock('framer-motion', () => ({
  motion: { div: 'div' as any, button: 'button' as any },
}))

vi.mock('mammoth', () => ({
  default: { extractRawText: vi.fn(() => Promise.resolve({ value: '' })) },
}))

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

vi.mock('@/components/features/contracts/contractConfig', () => ({
  CONFIG: {
    income: { label: '收入合同', exportType: 'income' as const, auditResource: 'contract_income', subCategory: 'income', accentColor: 'bg-emerald-500', partnerCategoryDefault: '甲方' },
    expense: { label: '支出合同', exportType: 'expense' as const, auditResource: 'contract_expense', subCategory: 'expense', accentColor: 'bg-red-500', partnerCategoryDefault: '乙方' },
    agreement: { label: '其他协议', exportType: 'agreement' as const, auditResource: 'contract_agreement', subCategory: 'agreement', accentColor: 'bg-sky-500', partnerCategoryDefault: '协议方' },
  },
  getApi: () => ({ getContracts: mockGetContracts, deleteContract: mockDeleteContract }),
  getStatusLabel: (s: string) => s === 'active' ? '履行中' : s === 'completed' ? '已完成' : s,
  getStatusColor: () => 'green',
  getContractPaymentTotal: () => 0,
  AGREEMENT_SUB_TYPE_LABELS: {},
  type: {} as any,
  Contract: {} as any,
}))

vi.mock('@/components/features/contracts/ContractFormModal', () => ({
  ContractFormModal: ({ onClose }: any) => <div data-testid="contract-modal"><button onClick={onClose}>Close</button></div>,
}))

vi.mock('@/components/features/templates', () => ({
  TemplateSelectorModal: ({ onClose }: any) => <div data-testid="template-selector"><button onClick={onClose}>Close</button></div>,
  TemplateGenerate: ({ onClose }: any) => <div data-testid="template-generate"><button onClick={onClose}>Close</button></div>,
}))

// ─── Mock 数据 ─────────
const mockContracts = [
  { id: 1, name: '测试收入合同A', contractNo: 'HT-2024-001', status: 'active', projectId: 10, amount: 1000000, partnerId: 1, createdAt: '2024-01-01' },
  { id: 2, name: '测试收入合同B', contractNo: 'HT-2024-002', status: 'archived', projectId: 10, amount: 500000, partnerId: 2, createdAt: '2024-02-01' },
]
const mockProjects = [{ id: 10, name: '测试项目' }]
const mockPartners = [{ id: 1, name: '甲方公司' }, { id: 2, name: '乙方公司' }]

// ─── 延迟导入 ─────────
const mockGetContracts = vi.fn(() => Promise.resolve({ success: true, data: mockContracts }))
const mockDeleteContract = vi.fn(() => Promise.resolve({ success: true }))

beforeEach(() => {
  mockGetContracts.mockImplementation(() => Promise.resolve({ success: true, data: mockContracts }))
  ;(window as any).electronAPI = {
    getProjects: vi.fn(() => Promise.resolve({ success: true, data: mockProjects })),
    getPartners: vi.fn(() => Promise.resolve({ success: true, data: mockPartners })),
    getPaymentRecords: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    getWagePaymentRecords: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    getWageOverdueList: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    getWageOverdueStats: vi.fn(() => Promise.resolve({ success: true, data: null })),
  }
  localStorage.clear()
  mockShowToast.mockClear()
})

afterEach(() => {
  cleanup()
  delete (window as any).electronAPI
  vi.clearAllMocks()
})

const importContractPage = async () => (await import('@/components/ContractPage')).default

describe('ContractPage.tsx', () => {
  test('收入类型应渲染页面标题', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="income" />)
    expect(await screen.findByText(/收入合同管理/)).toBeTruthy()
  }, 15000)

  test('支出类型应渲染页面标题', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="expense" />)
    expect(await screen.findByText(/支出合同管理/)).toBeTruthy()
  }, 15000)

  test('协议类型应渲染页面标题', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="agreement" />)
    expect(await screen.findByText(/其他协议管理/)).toBeTruthy()
  }, 15000)

  test('应显示新增合同按钮', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="income" />)
    expect(await screen.findByText(/新增合同/)).toBeTruthy()
  }, 15000)

  test('点击新增合同按钮应打开创建模态框', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="income" />)
    const addBtn = await screen.findByText(/新增合同/)
    fireEvent.click(addBtn)
    expect(await screen.findByTestId('contract-modal')).toBeTruthy()
  }, 15000)

  test('按状态筛选只显示匹配合同', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="income" />)

    // 等待两个合同都出现
    expect(await screen.findByText('测试收入合同A')).toBeTruthy()
    expect(screen.queryByText('测试收入合同B')).toBeTruthy()

    // 选择"已归档"状态（status='archived'）
    const selects = document.querySelectorAll('select')
    const statusSelect = selects[1] as HTMLSelectElement
    expect(statusSelect).toBeTruthy()

    // 选"已归档"(archived)
    fireEvent.change(statusSelect, { target: { value: 'archived' } })

    // 履行中(active) 的合同应消失，已归档(archived) 的应保留
    await waitFor(() => {
      expect(screen.queryByText('测试收入合同A')).toBeNull()
      expect(screen.getByText('测试收入合同B')).toBeTruthy()
    }, { timeout: 3000 })
  }, 15000)

  test('搜索关键词筛选合同', async () => {
    const ContractPage = await importContractPage()
    render(<ContractPage type="income" />)

    expect(await screen.findByText('测试收入合同A')).toBeTruthy()

    // 在搜索框输入关键词 "合同B"
    const searchInput = document.querySelector('input[placeholder*="搜索合同"]') as HTMLInputElement
    fireEvent.change(searchInput, { target: { value: '合同B' } })

    await waitFor(() => {
      expect(screen.queryByText('测试收入合同A')).toBeNull()
      expect(screen.getByText('测试收入合同B')).toBeTruthy()
    }, { timeout: 3000 })
  }, 15000)
})
