/**
 * ProjectInsights / ProjectMilestoneTimeline 测试（S12 概览驾驶舱 ①④）
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children, ...p }: any) => <section {...p}>{children}</section> }),
}))
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))
vi.mock('@/constants/animations', () => ({ sectionVariant: {}, staggerContainer: {} }))

const importModule = () => import('@/components/features/projects/ProjectInsights')

const project: any = {
  id: 1, name: '天府智造', status: 'in_progress',
  startDate: '2024-01-01', endDate: '2025-12-31', budget: 1000000,
}

describe('ProjectInsights (S12 ①)', () => {
  afterEach(cleanup)

  it('渲染洞察条目与文字行动入口', async () => {
    const { ProjectInsights } = await importModule()
    const items = [
      { icon: 'TrendingDown', level: 'warning' as const, text: '预算使用率 90%', actionLabel: '查看成本', actionPage: 'costLedger' },
      { icon: 'CheckCircle', level: 'ok' as const, text: '项目运行平稳' },
    ]
    render(<ProjectInsights items={items} />)
    expect(screen.getByText('AI 项目洞察')).toBeInTheDocument()
    expect(screen.getByText('预算使用率 90%')).toBeInTheDocument()
    expect(screen.getByText('查看成本')).toBeInTheDocument()
  })

  it('行动入口点击派发 navigate 事件', async () => {
    const { ProjectInsights } = await importModule()
    const spy = vi.fn()
    window.addEventListener('navigate', spy)
    render(<ProjectInsights items={[{ icon: 'Receipt', level: 'warning', text: '3 张发票待处理', actionLabel: '去处理', actionPage: 'invoices' }]} />)
    fireEvent.click(screen.getByText('去处理'))
    expect(spy).toHaveBeenCalled()
    expect((spy.mock.calls[0][0] as CustomEvent).detail).toBe('invoices')
    window.removeEventListener('navigate', spy)
  })

  it('空洞察不渲染', async () => {
    const { ProjectInsights } = await importModule()
    const { container } = render(<ProjectInsights items={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('ProjectMilestoneTimeline (S12 ④)', () => {
  afterEach(cleanup)

  it('从真实日期推导里程碑节点（开工/签约/结算/竣工）', async () => {
    const { ProjectMilestoneTimeline } = await importModule()
    render(<ProjectMilestoneTimeline
      project={project}
      incomeContracts={[{ id: 1, name: '总承包合同', contractNo: 'CN-01', signedDate: '2024-03-01' } as any]}
      expenseContracts={[]}
      settlements={[{ id: 9, name: '首期结算', settlementNo: 'JS-01', settlementDate: '2024-06-01' } as any]}
    />)
    expect(screen.getByText('关键里程碑与近期动态')).toBeInTheDocument()
    expect(screen.getByText('项目开工')).toBeInTheDocument()
    expect(screen.getByText('签订合同：总承包合同')).toBeInTheDocument()
    expect(screen.getByText('结算办理：首期结算')).toBeInTheDocument()
    expect(screen.getByText('计划竣工')).toBeInTheDocument()
  })

  it('无任何日期时不渲染', async () => {
    const { ProjectMilestoneTimeline } = await importModule()
    const { container } = render(<ProjectMilestoneTimeline
      project={{ id: 2, name: '空', status: 'planning' } as any}
      incomeContracts={[]} expenseContracts={[]} settlements={[]}
    />)
    expect(container.textContent).toBe('')
  })
})
