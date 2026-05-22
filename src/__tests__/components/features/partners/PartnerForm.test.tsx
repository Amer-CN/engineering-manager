// @ts-nocheck
/**
 * PartnerForm 组件测试
 * - 表单渲染（新增/编辑模式）
 * - 表单输入
 * - 表单提交（提交数据）
 * - 取消按钮
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Partner, Project } from '@/types/electron'

// ═══════════════════════════════════════════════
// Mock：useCompanyQuery hook
// ═══════════════════════════════════════════════
vi.mock('@/components/features/partners/useCompanyQuery', () => ({
  useCompanyQuery: vi.fn(() => ({
    queryLoading: false,
    handleQueryCreditCode: vi.fn(),
  })),
}))

// ═══════════════════════════════════════════════
// Mock：FileDropZone 组件（named export）
// ═══════════════════════════════════════════════
vi.mock('./FileDropZone', () => ({
  FileDropZone: vi.fn(({ label, onFileSelect, onRemove, file }: any) => (
    <div data-testid="file-drop-zone">
      <span>{label}</span>
      {file && <button type="button" onClick={onRemove}>删除{label}</button>}
      <input
        type="file"
        data-testid={`file-input-${label}`}
        onChange={(e: any) => {
          const f = e.target.files?.[0]
          if (f) onFileSelect(f)
        }}
      />
    </div>
  )),
}))

// ═══════════════════════════════════════════════
// 动态 import 避免模块缓存
// ═══════════════════════════════════════════════
const importModule = () => import('@/components/features/partners/PartnerForm')

describe('PartnerForm', () => {
  const mockProjects: Project[] = [
    { id: 1, name: '测试项目A', status: 'in_progress' } as unknown as Project,
    { id: 2, name: '测试项目B', status: 'completed' } as unknown as Project,
  ]

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders in add mode', async () => {
    const { default: PartnerForm } = await importModule()
    render(
      <PartnerForm
        projects={mockProjects}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 新增模式：按钮文字为"添加"
    expect(screen.getByText('添加')).toBeInTheDocument()
    // 单位名称 label 存在
    expect(screen.getByText('单位名称 *')).toBeInTheDocument()
    // 取消按钮
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('renders in edit mode with partner data', async () => {
    const { default: PartnerForm } = await importModule()
    const mockPartner: Partner = {
      id: 1,
      name: '测试单位',
      category: 'material',
      contact: '测试人',
      phone: '13800138000',
      email: 'test@example.com',
      address: '测试地址',
      bankAccount: '6222021234567890',
      bankName: '测试银行',
      taxNumber: '',
      creditCode: '91110000MA00AA000A',
      registeredAddress: '注册地址',
      businessScope: '经营范围',
      taxType: 'general',
      licenseFile: '',
      licenseFileType: '',
      otherFiles: '',
      otherFilesType: '',
      projectIds: [1],
      remarks: '备注',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    }
    render(
      <PartnerForm
        partner={mockPartner}
        projects={mockProjects}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 编辑模式：按钮文字为"保存"
    expect(screen.getByText('保存')).toBeInTheDocument()
    // 单位名称输入框应有预填充值
    const nameInput = screen.getAllByRole('textbox')[0] as HTMLInputElement
    expect(nameInput.value).toBe('测试单位')
  })

  it('updates form fields on user input', async () => {
    const user = userEvent.setup()
    const { default: PartnerForm } = await importModule()
    render(
      <PartnerForm
        projects={mockProjects}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 输入单位名称（第一个 textbox）
    const nameInput = screen.getAllByRole('textbox')[0]
    await user.type(nameInput, '新单位名称')
    expect(nameInput).toHaveValue('新单位名称')

    // 输入联系人（第二个 textbox）
    const contactInput = screen.getAllByRole('textbox')[1]
    await user.type(contactInput, '联系人A')
    expect(contactInput).toHaveValue('联系人A')
  })

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup()
    const { default: PartnerForm } = await importModule()
    render(
      <PartnerForm
        projects={mockProjects}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    await user.click(screen.getByText('取消'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('submits form with required fields', async () => {
    const user = userEvent.setup()
    const { default: PartnerForm } = await importModule()
    render(
      <PartnerForm
        projects={mockProjects}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 填写单位名称（第一个 textbox）
    const nameInput = screen.getAllByRole('textbox')[0]
    await user.type(nameInput, '新单位')

    // 填写统一社会信用代码（第二个 textbox）
    const codeInput = screen.getAllByRole('textbox')[1]
    // 用 fireEvent.change 确保 React 状态立即更新
    fireEvent.change(codeInput, { target: { value: '91110000MA00AA000A' } })

    // 选择单位类型（第二个 combobox，第一个是纳税资质）
    const categorySelect = screen.getAllByRole('combobox')[1] as HTMLSelectElement
    await user.selectOptions(categorySelect, 'material')

    // jsdom 中 required 属性会阻止表单提交，移除它
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交（点击添加按钮）
    await user.click(screen.getByText('添加'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.name).toBe('新单位')
    expect(submitted?.creditCode).toBe('91110000MA00AA000A')
    expect(submitted?.category).toBe('material')
  })
})
