/**
 * NotificationCenter 组件测试（S2 通知中心）
 * - 今天/更早分组、未读墨点、底栏、空态
 * - 点击项/全部已读/查看全部回调
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { AppNotification } from '@/hooks/useNotifications'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

const importModule = () => import('@/components/NotificationCenter')

const notifications: AppNotification[] = [
  { id: 'a', level: 'danger', icon: 'FileText', title: '合同即将到期：主体施工', summary: 'CN-001 还有 3 天到期', time: '3天', group: 'today', read: false, target: 'contracts' },
  { id: 'b', level: 'warning', icon: 'Receipt', title: '待回款发票：进度款', summary: '甲方 · 开票 2026-05-01', time: '昨天', group: 'earlier', read: true, target: 'invoices' },
]

describe('NotificationCenter (S2)', () => {
  const mockOnClose = vi.fn()
  const mockMarkAll = vi.fn()
  const mockItemClick = vi.fn()
  const mockViewAll = vi.fn()

  const renderPanel = (props: Partial<Parameters<Awaited<ReturnType<typeof importModule>>['NotificationCenter']>[0]> = {}) =>
    importModule().then(({ NotificationCenter }) =>
      render(<NotificationCenter open notifications={notifications} onClose={mockOnClose} onMarkAllRead={mockMarkAll} onItemClick={mockItemClick} onViewAll={mockViewAll} {...props} />))

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('open=false 时不渲染', async () => {
    const { NotificationCenter } = await importModule()
    render(<NotificationCenter open={false} notifications={notifications} onClose={mockOnClose} onMarkAllRead={mockMarkAll} onItemClick={mockItemClick} onViewAll={mockViewAll} />)
    expect(screen.queryByText('通知中心')).not.toBeInTheDocument()
  })

  it('渲染标题、今天/更早分组与未读计数', async () => {
    await renderPanel()
    expect(screen.getByText('通知中心')).toBeInTheDocument()
    expect(screen.getByText('今天')).toBeInTheDocument()
    expect(screen.getByText('更早')).toBeInTheDocument()
    expect(screen.getByText('1 条未读')).toBeInTheDocument()
    expect(screen.getByText('合同即将到期：主体施工')).toBeInTheDocument()
  })

  it('点击通知项触发 onItemClick', async () => {
    await renderPanel()
    fireEvent.click(screen.getByText('合同即将到期：主体施工'))
    expect(mockItemClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('底栏"全部已读""查看全部"回调', async () => {
    await renderPanel()
    fireEvent.click(screen.getByText('全部已读'))
    expect(mockMarkAll).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('查看全部'))
    expect(mockViewAll).toHaveBeenCalledTimes(1)
  })

  it('无通知时显示空态且不渲染底栏', async () => {
    const { NotificationCenter } = await importModule()
    render(<NotificationCenter open notifications={[]} onClose={mockOnClose} onMarkAllRead={mockMarkAll} onItemClick={mockItemClick} onViewAll={mockViewAll} />)
    expect(screen.getByText('暂无通知')).toBeInTheDocument()
    expect(screen.queryByText('全部已读')).not.toBeInTheDocument()
  })
})
