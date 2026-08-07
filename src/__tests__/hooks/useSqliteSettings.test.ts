vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ can: () => true, canAny: () => true, isAdmin: () => true, isLoggedIn: () => true }) }))
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSqliteSettings } from '@/hooks/useSqliteSettings'

const makeStatus = (overrides: any = {}) => ({
  ready: false,
  migrated: false,
  dbPath: null as string | null,
  dbSize: 0,
  summary: null as Record<string, number> | null,
  readMode: 'dual' as const,
  ...overrides,
})

describe('useSqliteSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(window.electronAPI as any).getSqliteStatus = vi.fn()
    ;(window.electronAPI as any).migrateToSqlite = vi.fn()
    ;(window.electronAPI as any).setSqliteReadMode = vi.fn()
  })

  test('初始时应加载状态', async () => {
    ;(window.electronAPI as any).getSqliteStatus.mockResolvedValue(makeStatus())
    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status?.ready).toBe(false)
  })

  // J-4: handleEnable 已随 /api/sqlite/enable 端点删除（数据已原生 SQLite，无需启用动作）

  test('handleMigrate 成功后应显示统计', async () => {
    ;(window.electronAPI as any).getSqliteStatus.mockResolvedValue(makeStatus({ ready: true }))
    ;(window.electronAPI as any).migrateToSqlite.mockResolvedValue({
      success: true, migratedTables: 42, totalRows: 1000, verificationPassed: true,
      errors: [], warnings: [], duration: 5000,
    })

    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleMigrate()
    })

    expect(result.current.migrating).toBe(false)
    expect(result.current.message?.type).toBe('success')
    expect(result.current.message?.text).toContain('42 张表')
  })

  test('handleSetReadMode 应成功切换', async () => {
    ;(window.electronAPI as any).getSqliteStatus.mockResolvedValue(makeStatus({ ready: true, readMode: 'dual' }))
    ;(window.electronAPI as any).setSqliteReadMode.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleSetReadMode('sqlite-primary')
    })

    expect(result.current.switching).toBe(false)
    expect(result.current.message).toEqual({ type: 'success', text: '已切换到SQLite 优先' })
  })
})
