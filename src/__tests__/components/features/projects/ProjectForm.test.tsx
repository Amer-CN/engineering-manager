/**
 * ProjectForm 组件测试
 * - 表单渲染（新增/编辑模式）
 * - 表单输入
 * - 表单提交（提交数据）
 * - 取消按钮
 * - 验证（项目负责人必选）
 */
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Project, Member } from '@/types/electron'

// ════════════════════════════════════════
// Mock：window.alert
// ════════════════════════════════════════
const mockAlert = vi.fn()
beforeEach(() => {
  window.alert = mockAlert
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ════════════════════════════════════════
// 动态 import 避免模块缓存
// ════════════════════════════════════════
const importModule = () => import('@/components/features/projects/ProjectForm')

describe('ProjectForm', () => {
  const mockMembers: Member[] = [
    {
      id: 1, name: '张三', role: '项目经理', phone: '13800138000',
      memberType: 'staff', status: 'active', entryDate: '2024-01-01',
      createdAt: '2024-01-01', email: '', idCard: '', idCardFront: '', idCardBack: '',
      contractFile: '', contractFileType: '', isTeamLeader: false,
      gender: '', ethnicity: '', birthDate: '', teamName: '', projectName: '', dailyWage: 0,
      threeLevelEducation: false,
    } as Member,
    {
      id: 2, name: '李四', role: '施工员', phone: '13800138001',
      memberType: 'staff', status: 'active', entryDate: '2024-02-01',
      createdAt: '2024-02-01', email: '', idCard: '', idCardFront: '', idCardBack: '',
      contractFile: '', contractFileType: '', isTeamLeader: false,
      gender: '', ethnicity: '', birthDate: '', teamName: '', projectName: '', dailyWage: 0,
      threeLevelEducation: false,
    } as Member,
    {
      id: 3, name: '王五', role: '焊工', phone: '13800138002',
      memberType: 'worker', status: 'active', entryDate: '2024-03-01',
      createdAt: '2024-03-01', email: '', idCard: '', idCardFront: '', idCardBack: '',
      contractFile: '', contractFileType: '', isTeamLeader: false,
      gender: '', ethnicity: '', birthDate: '', teamName: '', projectName: '', dailyWage: 300,
      threeLevelEducation: false,
    } as Member,
  ]

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  const mockProject: Project = {
    id: 1,
    name: '测试项目',
    description: '测试描述',
    address: '测试地址',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'in_progress',
    budget: 1000000,
    projectManagerId: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders in create mode', async () => {
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 新增模式：标题为"新建项目"
    expect(screen.getByText('新建项目')).toBeInTheDocument()
    // 取消按钮
    expect(screen.getByText('取消')).toBeInTheDocument()
    // 创建按钮
    expect(screen.getByText('创建')).toBeInTheDocument()
  })

  it('renders in edit mode with project data', async () => {
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        project={mockProject}
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 编辑模式：标题为"编辑项目"
    expect(screen.getByText('编辑项目')).toBeInTheDocument()
    // 项目名称输入框应有预填充值
    const nameInput = screen.getByPlaceholderText('请输入项目名称') as HTMLInputElement
    expect(nameInput.value).toBe('测试项目')
    // 项目描述
    const descInput = screen.getByPlaceholderText('请输入项目描述') as HTMLTextAreaElement
    expect(descInput.value).toBe('测试描述')
    // 项目地址
    const addrInput = screen.getByPlaceholderText('请输入项目地址') as HTMLInputElement
    expect(addrInput.value).toBe('测试地址')
  })

  it('updates form fields on user input', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 输入项目名称
    const nameInput = screen.getByPlaceholderText('请输入项目名称')
    await user.type(nameInput, '新项目名称')
    expect(nameInput).toHaveValue('新项目名称')

    // 输入项目描述
    const descInput = screen.getByPlaceholderText('请输入项目描述')
    await user.type(descInput, '新项目描述')
    expect(descInput).toHaveValue('新项目描述')

    // 输入项目地址
    const addrInput = screen.getByPlaceholderText('请输入项目地址')
    await user.type(addrInput, '新地址')
    expect(addrInput).toHaveValue('新地址')
  })

  it('selects project manager', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 找到项目负责人 select（第一个 combobox）
    const selects = screen.getAllByRole('combobox')
    const managerSelect = selects[0] as HTMLSelectElement
    // 选项应包含 staff 成员
    expect(screen.getByText('张三 - 项目经理')).toBeInTheDocument()
    expect(screen.getByText('李四 - 施工员')).toBeInTheDocument()
    // worker 不应出现在选项中
    expect(screen.queryByText('王五 - 焊工')).not.toBeInTheDocument()

    await user.selectOptions(managerSelect, '1')
    expect(managerSelect.value).toBe('1')
  })

  it('selects project status', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 找到状态 select（第二个 combobox）
    const selects = screen.getAllByRole('combobox')
    const statusSelect = selects[1] as HTMLSelectElement
    // 选项应包含状态标签
    expect(screen.getByText('筹备中')).toBeInTheDocument()
    expect(screen.getByText('进行中')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('已归档')).toBeInTheDocument()

    await user.selectOptions(statusSelect, 'in_progress')
    expect(statusSelect.value).toBe('in_progress')
  })

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    await user.click(screen.getByText('取消'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('shows alert when submitting without project manager', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )
    // 移除 required 属性（jsdom 中会阻止表单提交事件）
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 不选择项目负责人，直接提交
    const submitButton = screen.getByText('创建')
    await user.click(submitButton)

    // 应触发 alert
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('请选择项目负责人')
    })
    // onSubmit 不应被调用
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 填写项目名称
    const nameInput = screen.getByPlaceholderText('请输入项目名称')
    await user.type(nameInput, '测试项目')

    // 选择项目负责人
    const managerSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement
    await user.selectOptions(managerSelect, '1')

    // 移除 required 属性（jsdom 中会阻止提交）
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交
    await user.click(screen.getByText('创建'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.name).toBe('测试项目')
    expect(submitted?.projectManagerId).toBe(1)
  })

  it('submits edit form with updated data', async () => {
    const user = userEvent.setup()
    const { ProjectForm } = await importModule()
    render(
      <ProjectForm
        project={mockProject}
        members={mockMembers}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // 修改项目名称
    const nameInput = screen.getByPlaceholderText('请输入项目名称')
    await user.clear(nameInput)
    await user.type(nameInput, '更新后的项目名称')

    // 移除 required 属性
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'))

    // 提交（保存按钮）
    await user.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })

    const submitted = mockOnSubmit.mock.calls[0]?.[0]
    expect(submitted?.name).toBe('更新后的项目名称')
    expect(submitted?.id).toBeUndefined() // ProjectFormData 不含 id
  })
})
