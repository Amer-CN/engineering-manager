/**
 * JS03 质保金前端用例（Wave 1B-2）：
 * - SettlementForm step0 质保区渲染 + 编辑回填 + 提交透传
 * - SettlementList 质保徽标（到期派生 due_to_collect / 无质保无徽标 / 已释放）
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

const projects = [{ id: 1, name: '测试项目' }] as any
const partners = [{ id: 2, name: '测试单位' }] as any

describe('Settlement retention (JS03)', () => {
  afterEach(() => cleanup())

  it('Form：step0 显示质保区（金额/到期日/状态）', async () => {
    const { SettlementForm } = await import('@/components/features/settlement/SettlementForm')
    render(<SettlementForm settlement={null} projects={projects} partners={partners} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('质保金（可选）')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('无质保留空')).toBeInTheDocument()
    expect(screen.getByText('质保状态')).toBeInTheDocument()
  })

  it('Form：编辑回填质保三字段并随提交透传', async () => {
    const { SettlementForm } = await import('@/components/features/settlement/SettlementForm')
    const onSubmit = vi.fn()
    const settlement = {
      id: 21, projectId: 1, partnerId: 2, type: 'expense', subType: 'material',
      name: '质保结算', amount: 10000, settlementDate: '2026-07-01', status: 'pending',
      retentionAmount: 1234.56, retentionDueDate: '2027-06-30', retentionStatus: 'in_warranty',
      items: [],
    } as any
    const { container } = render(<SettlementForm settlement={settlement} projects={projects} partners={partners} onSubmit={onSubmit} onCancel={vi.fn()} />)
    // 回填：金额框显示 1234.56
    expect((screen.getByPlaceholderText('无质保留空') as HTMLInputElement).value).toBe('1234.56')
    // 走到第 3 步提交，断言透传
    fireEvent.click(screen.getByRole('button', { name: /下一步: 结算明细与核验/ }))
    fireEvent.click(screen.getByRole('button', { name: /下一步: 审批签发/ }))
    fireEvent.click(screen.getByRole('button', { name: '保存修改' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const data = onSubmit.mock.calls[0][0]
    expect(data.retentionAmount).toBe(1234.56)
    expect(data.retentionDueDate).toBe('2027-06-30')
    expect(data.retentionStatus).toBe('in_warranty')
    void container
  })

  it('List：到期派生显示“已到期待收”徽标', async () => {
    const { SettlementList } = await import('@/components/features/settlement/SettlementList')
    const settlements = [{
      id: 31, name: '过期质保单', settlementNo: 'JS-31', type: 'expense', subType: 'material',
      amount: 5000, status: 'pending', retentionAmount: 500,
      retentionDueDate: '2020-01-01', retentionStatus: 'in_warranty',
    }] as any
    const props = {
      settlements, onEdit: vi.fn(), onDelete: vi.fn(), onProcess: vi.fn(),
      onUnarchive: vi.fn(), onPrint: vi.fn(), onPreviewFile: vi.fn(),
    }
    render(React.createElement(SettlementList, props))
    expect(screen.getByText(/已到期待收/)).toBeTruthy()
  })

  it('List：无质保不显示徽标；已释放显示“已释放”', async () => {
    const { SettlementList } = await import('@/components/features/settlement/SettlementList')
    const mk = (over: any) => ({
      settlements: [{
        id: 32, name: '单', settlementNo: 'JS-32', type: 'expense', subType: 'material',
        amount: 5000, status: 'pending', ...over,
      }] as any,
      onEdit: vi.fn(), onDelete: vi.fn(), onProcess: vi.fn(),
      onUnarchive: vi.fn(), onPrint: vi.fn(), onPreviewFile: vi.fn(),
    })
    const { unmount } = render(React.createElement(SettlementList, mk({})))
    expect(screen.queryByText(/质保·/)).toBeNull()
    unmount()
    render(React.createElement(SettlementList, mk({ retentionAmount: 100, retentionDueDate: '2020-01-01', retentionStatus: 'released' })))
    expect(screen.getByText(/已释放/)).toBeTruthy()
  })
})
