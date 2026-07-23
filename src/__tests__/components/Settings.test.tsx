import { screen, cleanup, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils/render'

// 「外观」面板依赖的主题/行悬停 hook（点击外观分类后才挂载）
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ scheme: 'white', setScheme: vi.fn() }),
}))
vi.mock('@/hooks/useRowHoverOpacity', () => ({
  useRowHoverOpacity: () => ({ opacity: 50, setOpacity: vi.fn() }),
}))

// Icon 简化为文本，避免 lucide 渲染开销
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

import Settings from '@/components/Settings'

describe('Settings.tsx (v0.83.0 重构：分类导航 + 按需挂载 + 搜索)', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => cleanup())

  test('显示标题与副标题', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    expect(await screen.findByText('系统设置')).toBeTruthy()
    expect(screen.getByText(/管理应用程序设置/)).toBeTruthy()
  }, 15000)

  test('左侧导航显示 6 个分类', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    for (const label of ['个人账户', '外观', 'AI 能力', '数据与存储', '通知与偏好', '关于与帮助']) {
      expect(await screen.findByText(label)).toBeTruthy()
    }
  }, 15000)

  test('默认打开「个人账户」面板', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    expect(await screen.findByText('我的信息')).toBeTruthy()
    expect(await screen.findByText('修改密码')).toBeTruthy()
  }, 15000)

  test('点击「外观」分类切换到外观面板（按需挂载）', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    fireEvent.click(await screen.findByText('外观'))
    expect(await screen.findByText('White')).toBeTruthy()
    expect(await screen.findByText('Graphite')).toBeTruthy()
  }, 15000)

  test('搜索关键词显示命中项', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    const input = await screen.findByPlaceholderText('搜索设置...')
    fireEvent.change(input, { target: { value: '主题' } })
    expect(await screen.findByText('主题')).toBeTruthy()
  }, 15000)

  test('搜索无匹配时显示空提示', async () => {
    renderWithProviders(<Settings refresh={undefined} />)
    const input = await screen.findByPlaceholderText('搜索设置...')
    fireEvent.change(input, { target: { value: 'zzzznomatch' } })
    expect(await screen.findByText('未找到匹配的设置')).toBeTruthy()
  }, 15000)
})
