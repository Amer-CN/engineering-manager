/**
 * MemberDetail 组件测试（S23 人员档案详情）
 * - 左档案栏 + 右 Tab 面板结构
 * - 管理人员 3 Tab（基本档案/考勤记录/薪酬明细），农民工无薪酬明细
 * - 身份证 PII 默认脱敏 + 眼睛按钮临时显真
 * - 考勤记录 Tab 拉取真实考勤数据
 */
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Member } from '@/types'
import { renderWithProviders, setMaskEnabled } from '@/test-utils/render'

const mockGetAttendancesByMember = vi.fn()

vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => ({
    getAttendancesByMember: mockGetAttendancesByMember,
  }),
}))

const importModule = async () => {
  const mod = await import('@/components/features/members/MemberDetail')
  return { MemberDetail: mod.MemberDetail }
}

const baseStaff: Member = {
  id: 1,
  name: '张三',
  role: '项目经理',
  phone: '13800138000',
  idCard: '510101199001011234',
  idCardFront: '',
  idCardBack: '',
  email: 'zhang.san@example.com',
  contractFile: '',
  contractFileType: '',
  entryDate: '2024-01-15',
  status: 'active',
  isTeamLeader: false,
  memberType: 'staff',
  gender: '男',
  ethnicity: '汉族',
  birthDate: '1990-01-01',
  teamName: '',
  projectName: '',
  dailyWage: 0,
  threeLevelEducation: false,
  createdAt: '2024-01-15',
  position: '部门经理',
  baseSalary: 12000,
} as Member

const baseWorker: Member = {
  ...baseStaff,
  id: 2,
  name: '李四',
  memberType: 'worker',
  workerType: 'carpenter',
  teamName: '木工一组',
  projectName: '测试项目',
} as Member

describe('MemberDetail (S23)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMaskEnabled(true)
    mockGetAttendancesByMember.mockResolvedValue({ success: true, data: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it('管理人员渲染 基本档案/考勤记录/薪酬明细 三个 Tab', async () => {
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseStaff} deptName="工程部" onClose={vi.fn()} />)
    expect(screen.getByText('基本档案')).toBeInTheDocument()
    expect(screen.getByText('考勤记录')).toBeInTheDocument()
    expect(screen.getByText('薪酬明细')).toBeInTheDocument()
  })

  it('农民工不显示薪酬明细 Tab', async () => {
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseWorker} onClose={vi.fn()} />)
    expect(screen.getByText('基本档案')).toBeInTheDocument()
    expect(screen.getByText('考勤记录')).toBeInTheDocument()
    expect(screen.queryByText('薪酬明细')).not.toBeInTheDocument()
  })

  it('左档案栏显示部门与职位', async () => {
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseStaff} deptName="工程部" onClose={vi.fn()} />)
    expect(screen.getByText('工程部')).toBeInTheDocument()
    // 职位出现在头像下药丸 + 职位行，至少 2 处
    expect(screen.getAllByText('部门经理').length).toBeGreaterThanOrEqual(2)
  })

  it('身份证默认脱敏，点击眼睛按钮临时显真', async () => {
    const user = userEvent.setup()
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseStaff} deptName="工程部" onClose={vi.fn()} />)
    // 默认脱敏：原文不出现在左栏
    expect(screen.queryByText('510101199001011234')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('显示身份证号'))
    expect(screen.getByText('510101199001011234')).toBeInTheDocument()
    // 再点击隐藏
    await user.click(screen.getByLabelText('隐藏身份证号'))
    expect(screen.queryByText('510101199001011234')).not.toBeInTheDocument()
  })

  it('切换到考勤记录 Tab 后拉取并渲染考勤数据', async () => {
    mockGetAttendancesByMember.mockResolvedValue({
      success: true,
      data: [
        { id: 11, memberId: 1, projectId: 0, yearMonth: '2026-06', workDays: 26, daysOff: 4, isFullAttendance: true, createdAt: '', updatedAt: '' },
        { id: 12, memberId: 1, projectId: 0, yearMonth: '2026-05', workDays: 20, daysOff: 10, isFullAttendance: false, createdAt: '', updatedAt: '' },
      ],
    })
    const user = userEvent.setup()
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseStaff} deptName="工程部" onClose={vi.fn()} />)
    await user.click(screen.getByText('考勤记录'))
    await waitFor(() => {
      expect(screen.getByText('2026-06')).toBeInTheDocument()
    })
    expect(mockGetAttendancesByMember).toHaveBeenCalledWith(1)
    expect(screen.getByText('2026-05')).toBeInTheDocument()
    // 「全勤」同时是列头与徽章文案
    expect(screen.getAllByText('全勤').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('非全勤')).toBeInTheDocument()
  })

  it('考勤记录为空时显示空态', async () => {
    const user = userEvent.setup()
    const { MemberDetail } = await importModule()
    renderWithProviders(<MemberDetail member={baseStaff} deptName="工程部" onClose={vi.fn()} />)
    await user.click(screen.getByText('考勤记录'))
    await waitFor(() => {
      expect(screen.getByText('暂无考勤记录')).toBeInTheDocument()
    })
  })
})
