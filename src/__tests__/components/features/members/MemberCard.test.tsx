/**
 * MemberCard 组件测试
 * - 展示成员信息（姓名、角色、电话、状态）
 * - 操作按钮（编辑、删除、调组、离场/重新入场）
 * - 农民工 vs 管理人员 不同展示
 */
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Member } from '@/types'

// ═════════════════════════════════════════
// 不 mock Icon —— 真实渲染 SVG，jsdom 可正常处理
// ═════════════════════════════════════════

// 动态 import —— MemberCard 是 named export
const importModule = async () => {
  const mod = await import('@/components/features/members/MemberCard')
  return { MemberCard: mod.MemberCard }
}

describe('MemberCard', () => {
  const mockOnClick = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnReEntry = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // 注意：组件第 210 行判断的是 idCardFront（文件），不是 idCard（号码）
  const baseStaff: Member = {
    id: 1,
    name: '张三',
    role: '项目经理',
    phone: '13800138000',
    idCard: '510101199001011234',
    idCardFront: '',
    idCardBack: '',
    email: '',
    contractFile: '',
    contractFileType: '',
    entryDate: '2024-01-15',
    status: 'active',
    isTeamLeader: false,
    memberType: 'staff',
    gender: '',
    ethnicity: '',
    birthDate: '',
    teamName: '',
    projectName: '',
    dailyWage: 0,
    threeLevelEducation: false,
    createdAt: '2024-01-15',
  }

  it('renders staff member name and role', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseStaff}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('项目经理')).toBeInTheDocument()
  })

  it('renders phone number', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseStaff}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('13800138000')).toBeInTheDocument()
  })

  it('shows active status badge', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseStaff, status: 'active' }}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('在职')).toBeInTheDocument()
  })

  it('shows left status badge', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseStaff, status: 'left' }}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('已离场')).toBeInTheDocument()
  })

  it('shows team leader badge', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseStaff, isTeamLeader: true }}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('组长')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup()
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseStaff}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    await user.click(screen.getByText('张三'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup()
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseStaff}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    await user.click(screen.getByText('编辑'))
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup()
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseStaff}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    await user.click(screen.getByText('删除'))
    expect(mockOnDelete).toHaveBeenCalledTimes(1)
  })

  it('shows idCard number when idCard exists', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseStaff, idCard: '510101199001011234' }}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    // idCard 存在时应显示身份证号（font-mono）
    expect(screen.getByText('510101199001011234')).toBeInTheDocument()
  })

  it('shows idCardFront badge when idCardFront exists', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseStaff, idCardFront: 'idcard-front.png' }}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    // idCardFront 存在时显示"身份证"标签
    expect(screen.getByText(/身份证/)).toBeInTheDocument()
  })

  // ═════════════════════════════════════════
  // 农民工模式
  // ═════════════════════════════════════════
  const baseWorker: Member = {
    ...baseStaff,
    memberType: 'worker',
    workerType: 'carpenter',
    dailyWage: 350,
    status: 'active',
    entryDate: '2024-03-01',
  }

  it('renders worker type for worker member', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseWorker}
        type="worker"
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('木工')).toBeInTheDocument()
  })

  it('renders daily wage for worker member', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={baseWorker}
        type="worker"
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText(/350/)).toBeInTheDocument()
  })

  it('shows re-entry button for left worker', async () => {
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseWorker, status: 'left' }}
        type="worker"
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onReEntry={mockOnReEntry}
      />
    )
    expect(screen.getByText('重新入场')).toBeInTheDocument()
  })

  it('calls onReEntry when re-entry button clicked', async () => {
    const user = userEvent.setup()
    const { MemberCard } = await importModule()
    render(
      <MemberCard
        member={{ ...baseWorker, status: 'left' }}
        type="worker"
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onReEntry={mockOnReEntry}
      />
    )
    await user.click(screen.getByText('重新入场'))
    expect(mockOnReEntry).toHaveBeenCalledTimes(1)
  })
})
