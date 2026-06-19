/**
 * ContractFormModal 组件测试 — Package B1 完整覆盖
 * 测试重点：渲染（新增/编辑）、表单填写、验证、提交（CREATE/UPDATE）、协议类型
 */
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { Project, Partner, Contract, ContractType } from '@/types/electron'

// ─── vi.hoisted()：确保 mock 引用在 vi.mock() 提升后仍然有效 ───
const {
  mockShowToast,
  mockLogCreate,
  mockLogUpdate,
  mockUpdateContract,
} = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockLogCreate: vi.fn(),
  mockLogUpdate: vi.fn(),
  mockUpdateContract: vi.fn(),
}))

// ─── framer-motion mock ─────────────────────────────
vi.mock('framer-motion', () => ({
  motion: { div: 'div' as any, button: 'button' as any, form: 'form' as any },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ─── useToastStore mock ─────────────────────────────
// 组件调用：const showToast = useToastStore(state => state.showToast)
// selector = (state) => state.showToast，mock 需让 selector 正确返回 mockShowToast
vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: any) => selector({ showToast: mockShowToast }),
}))

// ─── usePermission mock ────────────────────────────
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: () => true }),
}))

// ─── Icon mock ────────────────────────────────
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) =>
    React.createElement('span', { 'data-testid': `icon-${name}`, className }, name),
}))

// ─── PartnerSelect mock ─────────────────────────────
vi.mock('@/components/features/partners/PartnerSelect', () => ({
  PartnerSelect: vi.fn(({ value, onChange, placeholder }: any) =>
    React.createElement('select', {
      'data-testid': 'partner-select',
      value: value || '',
      onChange: (e: any) => onChange(e.target.value ? Number(e.target.value) : null),
    }, [
      React.createElement('option', { value: '' }, placeholder || '请选择'),
      React.createElement('option', { value: '1' }, '合作单位A'),
      React.createElement('option', { value: '2' }, '合作单位B'),
    ])
  ),
}))

// ─── FileDropZone mock ──────────────────────────────
vi.mock('@/components/features/partners/FileDropZone', () => ({
  FileDropZone: vi.fn(({ label }: any) =>
    React.createElement('div', { 'data-testid': 'file-drop-zone' }, label)
  ),
}))

// ─── audit mock ──────────────────────────────────
vi.mock('@/utils/audit', () => ({
  logCreate: mockLogCreate,
  logUpdate: mockLogUpdate,
}))

// ─── contractConfig mock ───────────────────────────
vi.mock('@/components/features/contracts/contractConfig', () => {
  const AgreementSubTypeLabels: Record<string, string> = {
    cooperation: '合作协议',
    framework: '框架协议',
    settlement: '和解协议',
    compensation: '赔偿协议',
    personal: '个人协议',
    other: '其他协议',
  }
  return {
    CONFIG: {
      income: {
        label: '收入合同', exportType: 'income' as const, auditResource: 'contract_income',
        subCategory: 'income', accentBgLight: 'bg-emerald-100',
        modalCreateTitle: '新增收入合同', partnerLabel: '甲方单位', partnerPlaceholder: '选择甲方单位',
      },
      expense: {
        label: '支出合同', exportType: 'expense' as const, auditResource: 'contract_expense',
        subCategory: 'expense', accentBgLight: 'bg-red-100',
        modalCreateTitle: '新增支出合同', partnerLabel: '乙方单位', partnerPlaceholder: '选择乙方单位',
      },
      agreement: {
        label: '其他协议', exportType: 'agreement' as const, auditResource: 'contract_agreement',
        subCategory: 'agreement', accentBgLight: 'bg-sky-100',
        modalCreateTitle: '新增协议合同', partnerLabel: '协议方', partnerPlaceholder: '选择协议方',
      },
    },
    AGREEMENT_SUB_TYPE_LABELS: AgreementSubTypeLabels,
    getApi: () => ({ getContracts: vi.fn(), deleteContract: vi.fn() }),
    getStatusLabel: (s: string) => s,
    getStatusColor: () => 'green',
    getContractPaymentTotal: () => 0,
    type: {} as any,
    Contract: {} as any,
  }
})

// ─── data/regions mock ─────────────────────────────
vi.mock('@/data/regions', () => ({
  paymentMethods: [
    { value: 'one_time', label: '一次性付款' },
    { value: 'monthly', label: '按月付款' },
    { value: 'by_progress', label: '按进度付款' },
    { value: 'by_stage', label: '按阶段付款' },
  ],
  contractStatuses: [
    { value: 'draft', label: '草稿' },
    { value: 'pending', label: '待履行' },
    { value: 'active', label: '履行中' },
    { value: 'completed', label: '已完成' },
    { value: 'expired', label: '已到期' },
    { value: 'terminated', label: '已终止' },
    { value: 'archived', label: '已归档' },
  ],
}))

// ─── 延迟导入组件 ─────────────────────────────
const importModule = async () => {
  const mod = await import('@/components/features/contracts/ContractFormModal')
  return { ContractFormModal: mod.ContractFormModal }
}

// ─── 测试数据 ─────────────────────────────────────
const mockProjects: Project[] = [
  { id: 1, name: '测试项目A', status: 'in_progress' } as unknown as Project,
  { id: 2, name: '测试项目B', status: 'completed' } as unknown as Project,
]

const mockPartners: Partner[] = [
  { id: 1, name: '甲方公司', category: 'client' } as unknown as Partner,
  { id: 2, name: '乙方公司', category: 'supplier' } as unknown as Partner,
]

const mockEditingContract: Contract = {
  id: 100,
  name: '编辑测试合同',
  contractNo: 'HT-EDIT-001',
  amount: 500000,
  projectId: 1,
  partnerId: 1,
  signedDate: '2024-03-01',
  startDate: '2024-03-01',
  endDate: '2024-12-31',
  status: 'active',
  paymentMethod: 'by_progress',
  remarks: '原备注',
} as unknown as Contract

// ─── 辅助：设置 window.electronAPI 并渲染 ───
async function setupRender(
  show: boolean,
  type: ContractType,
  editingContract: Contract | null,
) {
  const mockApi = {
    createContract: vi.fn().mockResolvedValue({ success: true, data: { id: 99 } }),
    updateContract: mockUpdateContract,
  }
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnShowTemplateSelector = vi.fn()

  // 在渲染前设置好 window.electronAPI
  ;(window as any).electronAPI = {
    saveContractFile: vi.fn().mockResolvedValue({ success: true, data: '/path/to/file.pdf' }),
  }

  const { ContractFormModal } = await importModule()
  const ui = render(React.createElement(ContractFormModal, {
    show,
    type,
    editingContract,
    projects: mockProjects,
    partners: mockPartners,
    api: mockApi,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    onShowTemplateSelector: mockOnShowTemplateSelector,
  }))

  return { ...ui, mockApi, mockOnClose, mockOnSuccess, mockOnShowTemplateSelector }
}

describe('ContractFormModal — Package B1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShowToast.mockClear()
    mockLogCreate.mockClear()
    mockLogUpdate.mockClear()
    mockUpdateContract.mockClear()
  })

  afterEach(() => {
    cleanup()
    delete (window as any).electronAPI
  })

  // ═══════════════════════════════════
  // 1. 渲染测试
  // ═══════════════════════════════════
  it('show=false 时不渲染', async () => {
    const { container } = await setupRender(false, 'income', null)
    expect(container.firstChild).toBeNull()
  })

  it('创建模式（income）渲染正确标题和按钮', async () => {
    await setupRender(true, 'income', null)
    expect(screen.getByText('新增收入合同')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
    expect(screen.getByText('添加')).toBeInTheDocument()
  })

  it('创建模式（expense）渲染正确标题', async () => {
    await setupRender(true, 'expense', null)
    expect(screen.getByText('新增支出合同')).toBeInTheDocument()
  })

  it('编辑模式渲染「编辑合同」标题并填充表单', async () => {
    await setupRender(true, 'income', mockEditingContract)
    expect(screen.getByText('编辑合同')).toBeInTheDocument()
    expect(screen.getByDisplayValue('编辑测试合同')).toBeInTheDocument()
    expect(screen.getByDisplayValue('HT-EDIT-001')).toBeInTheDocument()
    expect(screen.getByText('保存')).toBeInTheDocument()
  })

  it('点击取消按钮调用 onClose', async () => {
    const user = userEvent.setup()
    const { mockOnClose } = await setupRender(true, 'income', null)
    await user.click(screen.getByText('取消'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('渲染文件上传区域', async () => {
    await setupRender(true, 'income', null)
    expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument()
  })

  // ═══════════════════════════════════
  // 2. 表单填写
  // ═══════════════════════════════════
  it('可以填写合同名称', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '新合同名称')
    expect(nameInput.value).toBe('新合同名称')
  })

  it('可以选择关联项目', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    expect(projectSelect.value).toBe('1')
  })

  it('可以填写合同金额', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '123456')
    expect(parseFloat(amountInput.value)).toBeGreaterThan(0)
  })

  // ═══════════════════════════════════
  // 3. 表单验证
  // ═══════════════════════════════════
  it('合同名称为空时提交显示错误 toast', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    // 只选项目，不填名称
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '10000')
    // 用 fireEvent.submit 绕过 HTML5 原生验证，直接触发 React handleSubmit
    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('合同名称'), 'error')
    }, { timeout: 4000 })
  })

  it('未选择项目时提交显示错误 toast', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    // 只填名称，不选项目
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '测试合同')
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '10000')
    // 用 fireEvent.submit 绕过 HTML5 原生验证
    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('项目'), 'error')
    }, { timeout: 4000 })
  })

  it('合同金额为 0 时（非协议类型）提交显示错误 toast', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '测试合同')
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    // 金额留空（即为 0），用 fireEvent.submit 绕过 HTML5 验证
    const form = container.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('金额'), 'error')
    }, { timeout: 4000 })
  })

  // ═══════════════════════════════════
  // 4. 提交测试（CREATE）
  // ═══════════════════════════════════
  it('CREATE：填写完整表单后提交调用 createContract', async () => {
    const user = userEvent.setup()
    const { mockApi, container } = await setupRender(true, 'income', null)
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '测试合同')
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '88888')
    const submitBtn = screen.getByText('添加')
    await user.click(submitBtn)
    await waitFor(() => {
      expect(mockApi.createContract).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('CREATE 成功后调用 onClose 和 onSuccess', async () => {
    const user = userEvent.setup()
    const { container, mockOnClose, mockOnSuccess } = await setupRender(true, 'income', null)
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '成功测试合同')
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '77777')
    const submitBtn = screen.getByText('添加')
    await user.click(submitBtn)
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
      expect(mockOnSuccess).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('CREATE 成功后显示成功 toast', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'income', null)
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, 'toast测试')
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.type(amountInput, '11111')
    await user.click(screen.getByText('添加'))
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('成功'), 'success')
    }, { timeout: 5000 })
  })

  // ═══════════════════════════════════
  // 5. 提交测试（UPDATE）
  // ═══════════════════════════════════
  it('UPDATE：编辑模式提交调用 updateContract', async () => {
    const user = userEvent.setup()
    const { mockApi } = await setupRender(true, 'income', mockEditingContract)
    const saveBtn = screen.getByText('保存')
    await user.click(saveBtn)
    await waitFor(() => {
      expect(mockApi.updateContract).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('UPDATE 成功后调用 logUpdate', async () => {
    const user = userEvent.setup()
    await setupRender(true, 'income', mockEditingContract)
    await user.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockLogUpdate).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  // ═══════════════════════════════════
  // 6. 协议类型特殊逻辑
  // ═══════════════════════════════════
  it('type=agreement 时渲染「新增协议合同」标题', async () => {
    await setupRender(true, 'agreement', null)
    expect(screen.getByText('新增协议合同')).toBeInTheDocument()
  })

  it('type=agreement 时显示协议类型下拉框', async () => {
    await setupRender(true, 'agreement', null)
    expect(screen.getByText('合作协议')).toBeInTheDocument()
  })

  it('type=agreement 时不显示付款方式下拉框', async () => {
    const { container } = await setupRender(true, 'agreement', null)
    // 协议类型只有 partner-select 和 agreement-sub-type select，不应含「付款」option
    const allSelects = container.querySelectorAll('select')
    let hasPaymentMethod = false
    allSelects.forEach(sel => {
      const options = Array.from(sel.options)
      if (options.some(opt => opt.text.includes('付款'))) {
        hasPaymentMethod = true
      }
    })
    expect(hasPaymentMethod).toBe(false)
  })

  it('type=agreement 时金额为非必填（不报金额错误）', async () => {
    const user = userEvent.setup()
    const { container } = await setupRender(true, 'agreement', null)
    // 填名称 + 选项目，但不填金额
    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement
    await user.type(nameInput, '协议测试')
    const projectSelect = container.querySelectorAll('select')[0] as HTMLSelectElement
    await user.selectOptions(projectSelect, '1')
    // 协议类型金额非必填，提交应成功（不报金额错误）
    await user.click(screen.getByText('添加'))
    // 等待一下，确认没有「金额」相关的 toast 错误
    await new Promise(r => setTimeout(r, 1200))
    const errorCalls = mockShowToast.mock.calls.filter(
      ([msg, type]) => type === 'error' && typeof msg === 'string' && msg.includes('金额')
    )
    expect(errorCalls.length).toBe(0)
  })
})
