import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

/**
 * G2 B1 前端门控测试：SnapshotsTab 的「手动创建备份/删除快照」按钮
 * 无 settings:update 码角色渲染 → 按钮不存在；有码角色 → 存在。
 * 门控形式：can('settings:update') && 渲染条件 + handler 守卫（SnapshotsTab.tsx）。
 */

// 可变 can 返回值（无码/有码两态）
const { mockCan } = vi.hoisted(() => ({ mockCan: { value: true } }))
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ can: (code: string) => mockCan.value }),
}))

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => <span data-testid={`icon-${name}`} className={className}>{name}</span>,
}))

// 快照列表数据（空列表 + 一行的两种状态由 data 数组控制）
const snapshotsData = vi.hoisted(() => ({ rows: [] as any[] }))
vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => ({
    getSnapshots: async () => ({ success: true, data: snapshotsData.rows }),
    getMaxSnapshots: async () => ({ success: true, data: { maxCount: 200 } }),
    createSnapshot: async () => ({ success: true, data: { id: 'x' } }),
    deleteSnapshot: async () => ({ success: true }),
    restoreSnapshot: async () => ({ success: true }),
    setMaxSnapshots: async () => ({ success: true, data: { maxCount: 200 } }),
  }),
}))

describe('SnapshotsTab 门控（settings:update）', () => {
  beforeEach(() => {
    mockCan.value = true
    snapshotsData.rows = []
  })
  afterEach(cleanup)

  test('无 settings:update 码角色 → 「手动创建备份」按钮不存在', async () => {
    mockCan.value = false
    const { SnapshotsTab } = await import('@/components/SnapshotsTab')
    render(React.createElement(SnapshotsTab))
    await screen.findByText('数据快照')
    expect(screen.queryByText('手动创建备份')).toBeNull()
  })

  test('有 settings:update 码角色 → 「手动创建备份」按钮存在', async () => {
    mockCan.value = true
    const { SnapshotsTab } = await import('@/components/SnapshotsTab')
    render(React.createElement(SnapshotsTab))
    await screen.findByText('数据快照')
    expect(screen.getByText('手动创建备份')).toBeTruthy()
  })

  test('无码角色 + 有快照行 → 行内删除按钮不存在（Trash2 不渲染）', async () => {
    mockCan.value = false
    snapshotsData.rows = [{ timestamp: '2026-08-01T10:00:00', fileSize: 1024, label: 't' }]
    const { SnapshotsTab } = await import('@/components/SnapshotsTab')
    render(React.createElement(SnapshotsTab))
    await screen.findByText('数据快照')
    expect(screen.queryByTestId('icon-Trash2')).toBeNull()
  })

  test('有码角色 + 有快照行 → 行内删除按钮存在', async () => {
    mockCan.value = true
    snapshotsData.rows = [{ timestamp: '2026-08-01T10:00:00', fileSize: 1024, label: 't' }]
    const { SnapshotsTab } = await import('@/components/SnapshotsTab')
    render(React.createElement(SnapshotsTab))
    await screen.findByText('数据快照')
    expect(screen.getByTestId('icon-Trash2')).toBeTruthy()
  })
})
