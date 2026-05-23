/**
 * ProjectDetailTabs 组件测试
 * - ContractsTab: 渲染收入/支出合同、空状态、合计金额
 * - InvoicesTab: 渲染发票列表、空状态、统计卡片
 * - MembersTab: 渲染成员列表、项目经理、添加弹窗、调离弹窗
 * - PartnersTab: 渲染合作单位、空状态
 */
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Project, Member, Partner, IncomeContract, ExpenseContract, WorkerTeam, Invoice } from '@/types'
import type { ProjectStatsData } from '@/components/features/projects/ProjectStats'

// ════════════════════════════════════════
// Mock: Icon / Badge 子组件
// ════════════════════════════════════════
vi.mock('@/components/ui/Icon', () => ({ Icon: () => null }))
vi.mock('@/components/ui/Badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }))

// ════════════════════════════════════════
// Mock: formatMoney
// ════════════════════════════════════════
vi.mock('@/utils/format', () => ({
  formatMoney: (n: number) => n.toLocaleString('zh-CN'),
}))

// ════════════════════════════════════════
// Mock: window.electronAPI
// ════════════════════════════════════════
const mockElectronAPI = {
  getProjectWorkers: vi.fn(),
  getProjects: vi.fn(),
  getProjectMembers: vi.fn(),
  addProjectMember: vi.fn(),
  updateProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
}

beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
  })
})

// ════════════════════════════════════════
// 测试数据
// ════════════════════════════════════════
const mockProject: Project = {
  id: 1,
  name: '测试项目',
  description: '',
  address: '',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  status: 'in_progress',
  budget: 5000000,
  projectManagerId: 1,
  projectManagerName: '张三',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

const mockStats: ProjectStatsData = {
  totalExpenses: 0,
  incomeTotal: 2000000,
  expenseTotal: 800000,
  invoiceInTotal: 0,
  invoiceOutTotal: 0,
  receivedInTotal: 0,
  receivedOutTotal: 0,
  staffCount: 2,
  workerCount: 5,
  teamCount: 1,
  materialTotal: 0,
  settlementIncomeTotal: 0,
  settlementExpenseTotal: 0,
  totalRevenue: 0,
  totalCost: 0,
  netProfit: 0,
  daysElapsed: 0,
  totalDays: 0,
  timeProgress: 0,
  partnerCount: 0,
  materialCount: 0,
  workerCountTotal: 5,
}

const mockMembers: Member[] = [
  {
    id: 1, name: '张三', role: '项目经理', phone: '13800138000',
    memberType: 'staff', status: 'active', entryDate: '2024-01-01',
    createdAt: '2024-01-01', email: '', idCard: '', idCardFront: '', idCardBack: '',
    contractFile: '', contractFileType: '', isTeamLeader: false,
    gender: '', ethnicity: '', birthDate: '', teamName: '', projectName: '', dailyWage: 0,
    threeLevelEducation: false,
  },
  {
    id: 2, name: '李四', role: '施工员', phone: '13800138001',
    memberType: 'staff', status: 'active', entryDate: '2024-02-01',
    createdAt: '2024-02-01', email: '', idCard: '', idCardFront: '', idCardBack: '',
    contractFile: '', contractFileType: '', isTeamLeader: false,
    gender: '', ethnicity: '', birthDate: '', teamName: '', projectName: '', dailyWage: 0,
    threeLevelEducation: false,
  },
]

const mockIncomeContracts: IncomeContract[] = [
  { id: 1, projectId: 1, name: '主合同', amount: 2000000, partnerName: '甲方公司', signedDate: '2024-01-15', createdAt: '' },
]
const mockExpenseContracts: ExpenseContract[] = [
  { id: 2, projectId: 1, name: '材料采购合同', amount: 800000, partnerName: '材料商', signedDate: '2024-02-01', createdAt: '' },
]

const mockInvoices: Invoice[] = [
  { id: 1, projectId: 1, invoiceNo: 'INV-001', type: 'invoice_in', name: '材料发票', amount: 300000, receivedAmount: 0, status: 'received', billingDate: '2024-03-01', createdAt: '' },
]

const mockPartners: Partner[] = [
  { id: 1, name: '甲方公司', category: 'owner', contact: '王总', phone: '13900000000', createdAt: '' },
]

const mockWorkerTeams: WorkerTeam[] = [
  { id: 1, name: '钢筋班组', projectId: 1, leaderId: null, leaderName: '赵六', createdAt: '', updatedAt: '' },
]

// ════════════════════════════════════════
// 动态 import
// ════════════════════════════════════════
const importModules = () => import('@/components/features/projects/ProjectDetailTabs')

// ════════════════════════════════════════
// 测试开始
// ════════════════════════════════════════
describe('ProjectDetailTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockElectronAPI.getProjectWorkers.mockResolvedValue({ success: true, data: [] })
    mockElectronAPI.getProjects.mockResolvedValue({ success: true, data: [] })
    mockElectronAPI.getProjectMembers.mockResolvedValue({ success: true, data: [] })
    mockElectronAPI.addProjectMember.mockResolvedValue({ success: true })
    mockElectronAPI.updateProjectMember.mockResolvedValue({ success: true })
    mockElectronAPI.removeProjectMember.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  // ───────────────────────────────────────
  // ContractsTab
  // ───────────────────────────────────────
  describe('ContractsTab', () => {
    it('renders income and expense contract sections', async () => {
      const { ContractsTab } = await importModules()
      render(<ContractsTab incomeContracts={mockIncomeContracts} expenseContracts={mockExpenseContracts} stats={mockStats} />)
      expect(screen.getByText('主合同')).toBeInTheDocument()
      expect(screen.getByText('材料采购合同')).toBeInTheDocument()
    })

    it('displays formatted amounts for contracts', async () => {
      const { ContractsTab } = await importModules()
      render(<ContractsTab incomeContracts={mockIncomeContracts} expenseContracts={mockExpenseContracts} stats={mockStats} />)
      // 合同金额和合计行都可能显示相同金额，用 getAllByText 验证至少出现一次
      expect(screen.getAllByText('¥2,000,000').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('¥800,000').length).toBeGreaterThanOrEqual(1)
    })

    it('shows empty state when no income contracts', async () => {
      const { ContractsTab } = await importModules()
      render(<ContractsTab incomeContracts={[]} expenseContracts={mockExpenseContracts} stats={mockStats} />)
      expect(screen.getByText('暂无收入合同')).toBeInTheDocument()
    })

    it('shows empty state when no expense contracts', async () => {
      const { ContractsTab } = await importModules()
      render(<ContractsTab incomeContracts={mockIncomeContracts} expenseContracts={[]} stats={mockStats} />)
      expect(screen.getByText('暂无支出合同')).toBeInTheDocument()
    })

    it('shows income total in summary row', async () => {
      const { ContractsTab } = await importModules()
      render(<ContractsTab incomeContracts={mockIncomeContracts} expenseContracts={mockExpenseContracts} stats={mockStats} />)
      // 收入合计和支出合计都包含"合计"文本，用 getAllByText 验证至少出现
      expect(screen.getAllByText('合计').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ───────────────────────────────────────
  // InvoicesTab
  // ───────────────────────────────────────
  describe('InvoicesTab', () => {
    it('renders invoice summary cards', async () => {
      const { InvoicesTab } = await importModules()
      render(<InvoicesTab invoices={mockInvoices} stats={mockStats} />)
      expect(screen.getByText('进项发票')).toBeInTheDocument()
      expect(screen.getByText('销项发票')).toBeInTheDocument()
    })

    it('renders invoice table with data', async () => {
      const { InvoicesTab } = await importModules()
      render(<InvoicesTab invoices={mockInvoices} stats={mockStats} />)
      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('材料发票')).toBeInTheDocument()
    })

    it('shows empty state when no invoices', async () => {
      const { InvoicesTab } = await importModules()
      render(<InvoicesTab invoices={[]} stats={mockStats} />)
      expect(screen.getByText('暂无发票记录')).toBeInTheDocument()
    })

    it('renders invoice table headers', async () => {
      const { InvoicesTab } = await importModules()
      render(<InvoicesTab invoices={mockInvoices} stats={mockStats} />)
      expect(screen.getByText('发票号')).toBeInTheDocument()
      expect(screen.getByText('类型')).toBeInTheDocument()
      expect(screen.getByText('名称')).toBeInTheDocument()
      expect(screen.getByText('金额')).toBeInTheDocument()
      expect(screen.getByText('已收/已付')).toBeInTheDocument()
      expect(screen.getByText('状态')).toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────
  // MembersTab
  // ───────────────────────────────────────
  describe('MembersTab', () => {
    it('renders project manager info', async () => {
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={mockWorkerTeams}
          members={mockMembers}
          stats={mockStats}
        />
      )
      expect(screen.getByText('项目经理')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
    })

    it('renders worker teams section', async () => {
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={mockWorkerTeams}
          members={mockMembers}
          stats={{ ...mockStats, workerCount: 5 }}
        />
      )
      // "农民工" 文本被 span 分割，用 getAllByText 或检查 textContent
      expect(screen.getByText((_, el) => el?.textContent === '农民工 (5)')).toBeInTheDocument()
      expect(screen.getByText('钢筋班组')).toBeInTheDocument()
    })

    it('shows empty state for worker teams', async () => {
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={[]}
          members={mockMembers}
          stats={mockStats}
        />
      )
      expect(screen.getByText('暂无农民工班组')).toBeInTheDocument()
    })

    it('opens add member modal when add button clicked', async () => {
      const user = userEvent.setup()
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={mockWorkerTeams}
          members={mockMembers}
          stats={mockStats}
        />
      )
      const addButton = screen.getByText('添加成员')
      await user.click(addButton)
      expect(screen.getByText('添加项目成员')).toBeInTheDocument()
    })

    it('closes add modal when close button clicked', async () => {
      const user = userEvent.setup()
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={mockWorkerTeams}
          members={mockMembers}
          stats={mockStats}
        />
      )
      // 打开弹窗
      await user.click(screen.getByText('添加成员'))
      expect(screen.getByText('添加项目成员')).toBeInTheDocument()
      // 关闭弹窗：点击遮罩层（最外层 div 的 onClick 会触发 onClose）
      const overlay = document.querySelector('.fixed.inset-0')
      if (overlay) {
        await user.click(overlay)
      }
      await waitFor(() => {
        expect(screen.queryByText('添加项目成员')).not.toBeInTheDocument()
      })
    })

    it('loads project members on mount', async () => {
      const { MembersTab } = await importModules()
      render(
        <MembersTab
          project={mockProject}
          staffMembers={mockMembers}
          allStaffMembers={mockMembers}
          workerTeams={mockWorkerTeams}
          members={mockMembers}
          stats={mockStats}
        />
      )
      await waitFor(() => {
        expect(mockElectronAPI.getProjectMembers).toHaveBeenCalledWith(1)
      })
    })
  })

  // ───────────────────────────────────────
  // PartnersTab
  // ───────────────────────────────────────
  describe('PartnersTab', () => {
    it('renders partners list', async () => {
      const { PartnersTab } = await importModules()
      render(<PartnersTab partners={mockPartners} />)
      expect(screen.getByText('甲方公司')).toBeInTheDocument()
      expect(screen.getByText('王总')).toBeInTheDocument()
    })

    it('shows partner category label', async () => {
      const { PartnersTab } = await importModules()
      render(<PartnersTab partners={mockPartners} />)
      expect(screen.getByText('建设单位')).toBeInTheDocument()
    })

    it('shows empty state when no partners', async () => {
      const { PartnersTab } = await importModules()
      render(<PartnersTab partners={[]} />)
      expect(screen.getByText('暂无关联单位')).toBeInTheDocument()
    })

    it('shows partner count in title', async () => {
      const { PartnersTab } = await importModules()
      render(<PartnersTab partners={mockPartners} />)
      expect(screen.getByText('关联单位 (1)')).toBeInTheDocument()
    })
  })
})
