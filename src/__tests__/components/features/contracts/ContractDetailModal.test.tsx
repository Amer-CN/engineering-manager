/**
 * ContractDetailModal 组件测试（S14 合同详情）
 * - 基本信息区块字段渲染
 * - 真实收付款记录 + 进度条
 * - 状态时间线、附件、相关方区块
 * - 编辑回调
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

const importModule = () => import('@/components/features/contracts/ContractDetailModal')

const config = {
  label: '收入合同', paymentColumnLabel: '已收款', paymentRecordType: 'invoice_out',
  partnerLabel: '甲方单位', subCategory: 'income',
} as any

const projects = [{ id: 1, name: '天府智造中心二期' }] as any
const partners = [{ id: 2, name: '四川建工集团', contact: '张建国', phone: '13800000000' }] as any

const baseContract = {
  id: 9, projectId: 1, partnerId: 2, contractNo: 'CN-2024-TF-0892', name: '主体施工总承包合同',
  amount: 15000000, signedDate: '2024-03-01', startDate: '2024-03-01', endDate: '2025-08-30',
  status: 'active', paymentMethod: 'by_progress', remarks: '', fileUrl: '', fileType: undefined,
} as any

const paymentRecords = [
  { id: 101, type: 'invoice_out', amount: 1500000, recordDate: '2024-03-15', contractId: 9, remarks: '预付款', invoiceDetails: [], projectId: 1, partnerId: 2, createdAt: '' },
] as any

describe('ContractDetailModal (S14)', () => {
  const mockOnClose = vi.fn()
  const mockOnEdit = vi.fn()

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('渲染基本信息字段', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} onEdit={mockOnEdit} />)
    expect(screen.getByText('合同详情')).toBeInTheDocument()
    expect(screen.getByText('CN-2024-TF-0892')).toBeInTheDocument()
    expect(screen.getByText('主体施工总承包合同')).toBeInTheDocument()
    expect(screen.getByText('基本信息')).toBeInTheDocument()
  })

  it('渲染真实收付款记录与进度条百分比', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} />)
    expect(screen.getByText('预付款')).toBeInTheDocument()
    // 1,500,000 / 15,000,000 = 10%
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('渲染状态时间线（签署/开始/结束/当前状态）', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} />)
    expect(screen.getByText('状态时间线')).toBeInTheDocument()
    expect(screen.getByText('签署合同')).toBeInTheDocument()
    expect(screen.getByText('开始执行')).toBeInTheDocument()
    expect(screen.getByText('合同结束')).toBeInTheDocument()
  })

  it('渲染相关方与关联项目', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} />)
    expect(screen.getByText('相关方')).toBeInTheDocument()
    expect(screen.getByText('四川建工集团')).toBeInTheDocument()
    expect(screen.getByText('张建国')).toBeInTheDocument()
    expect(screen.getByText('天府智造中心二期')).toBeInTheDocument()
  })

  it('无附件时显示"暂无附件"', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} />)
    expect(screen.getByText('暂无附件')).toBeInTheDocument()
  })

  it('点击编辑触发 onEdit 回调', async () => {
    const { ContractDetailModal } = await importModule()
    render(<ContractDetailModal contract={baseContract} type="income" config={config} projects={projects} partners={partners} paymentRecords={paymentRecords} onClose={mockOnClose} onEdit={mockOnEdit} />)
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    expect(mockOnEdit).toHaveBeenCalledTimes(1)
  })

  it('协议类型不显示收付款记录区', async () => {
    const { ContractDetailModal } = await importModule()
    const agreement = { ...baseContract, agreementType: 'cooperation' }
    const agreementConfig = { ...config, label: '其他协议', paymentRecordType: '' }
    render(<ContractDetailModal contract={agreement} type="agreement" config={agreementConfig} projects={projects} partners={partners} paymentRecords={[]} onClose={mockOnClose} />)
    expect(screen.queryByText(/金额与.*记录/)).not.toBeInTheDocument()
  })
})
