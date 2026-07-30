/**
 * SettlementForm 组件测试（S20 结算编制表单）
 * - FormStepper 三步导航（基本信息 / 结算明细与核验 / 审批签发）
 * - 第 1 步必填校验驱动"下一步"按钮
 * - 第 2 步自动核验提示区（未录入 / 通过 / 有差异）
 * - 第 3 步提交按钮与底部异常计数
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

const importModule = () => import('@/components/features/settlement/SettlementForm')

const projects = [{ id: 1, name: '测试项目' }] as any
const partners = [{ id: 2, name: '测试单位' }] as any

const fillStep0 = (container: HTMLElement) => {
  fireEvent.change(screen.getByPlaceholderText('如：2024年3月工程进度款'), { target: { value: '3月进度款结算' } })
  const selects = container.querySelectorAll('select')
  // 顺序：结算类型 / 结算类别 / 关联项目 / 关联单位
  fireEvent.change(selects[2], { target: { value: '1' } })
  fireEvent.change(selects[3], { target: { value: '2' } })
}

describe('SettlementForm (S20)', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('初始显示第 1 步，未填必填项时"下一步"禁用', async () => {
    const { SettlementForm } = await importModule()
    render(<SettlementForm settlement={null} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    expect(screen.getByPlaceholderText('如：2024年3月工程进度款')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: /下一步: 结算明细与核验/ })
    expect(nextBtn).toBeDisabled()
  })

  it('填齐必填项后可进入第 2 步，显示自动核验区（尚未录入明细）', async () => {
    const { SettlementForm } = await importModule()
    const { container } = render(<SettlementForm settlement={null} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    fillStep0(container)
    const nextBtn = screen.getByRole('button', { name: /下一步: 结算明细与核验/ })
    expect(nextBtn).not.toBeDisabled()
    fireEvent.click(nextBtn)
    expect(screen.getByText('自动核验')).toBeInTheDocument()
    expect(screen.getByText('尚未录入明细')).toBeInTheDocument()
    expect(screen.getByText(/未解决异常项:/)).toBeInTheDocument()
  })

  it('编辑模式：明细合计与金额一致时显示"核验通过"', async () => {
    const { SettlementForm } = await importModule()
    const settlement = {
      id: 9, projectId: 1, partnerId: 2, type: 'expense', subType: 'material',
      name: '钢材结算', amount: 1000, settlementDate: '2026-07-01', status: 'pending',
      items: [{ description: '钢筋', quantity: 2, unit: '吨', unitPrice: 500, amount: 1000, remarks: '' }],
    } as any
    render(<SettlementForm settlement={settlement} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /下一步: 结算明细与核验/ }))
    expect(screen.getByText('核验通过')).toBeInTheDocument()
    expect(screen.getByText(/未解决异常项:/)).toBeInTheDocument()
  })

  it('编辑模式：明细合计与金额不一致时显示"有差异"', async () => {
    const { SettlementForm } = await importModule()
    const settlement = {
      id: 10, projectId: 1, partnerId: 2, type: 'expense', subType: 'material',
      name: '砼结算', amount: 1500, settlementDate: '2026-07-01', status: 'pending',
      items: [{ description: '商砼', quantity: 2, unit: 'm³', unitPrice: 500, amount: 1000, remarks: '' }],
    } as any
    render(<SettlementForm settlement={settlement} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /下一步: 结算明细与核验/ }))
    expect(screen.getByText('有差异')).toBeInTheDocument()
  })

  it('第 3 步显示凭证/备注与提交按钮，点击提交回调', async () => {
    const { SettlementForm } = await importModule()
    const { container } = render(<SettlementForm settlement={null} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    fillStep0(container)
    fireEvent.click(screen.getByRole('button', { name: /下一步: 结算明细与核验/ }))
    fireEvent.click(screen.getByRole('button', { name: /下一步: 审批签发/ }))
    expect(screen.getByPlaceholderText('其他说明...')).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: '创建结算单' })
    fireEvent.click(submitBtn)
    expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    expect(mockOnSubmit.mock.calls[0][0].name).toBe('3月进度款结算')
  })

  it('上一步可返回，编辑已有结算时提交按钮为"保存修改"', async () => {
    const { SettlementForm } = await importModule()
    const settlement = {
      id: 11, projectId: 1, partnerId: 2, type: 'income', subType: 'other',
      name: '进度款', amount: 0, settlementDate: '', status: 'draft', items: [],
    } as any
    render(<SettlementForm settlement={settlement} projects={projects} partners={partners} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /下一步: 结算明细与核验/ }))
    fireEvent.click(screen.getByRole('button', { name: /下一步: 审批签发/ }))
    expect(screen.getByRole('button', { name: '保存修改' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '上一步' }))
    expect(screen.getByText('自动核验')).toBeInTheDocument()
  })
})
