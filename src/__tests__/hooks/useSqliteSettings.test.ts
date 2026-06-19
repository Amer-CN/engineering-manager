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
    ;(window.electronAPI as any).enableSqlite = vi.fn()
    ;(window.electronAPI as any).migrateToSqlite = vi.fn()
    ;(window.electronAPI as any).setSqliteReadMode = vi.fn()
  })

  test('初始时应加载状态', async () => {
    ;(window.electronAPI as any).getSqliteStatus.mockResolvedValue(makeStatus())
    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.status?.ready).toBe(false)
  })

  test('handleEnable 成功后应刷新状态', async () => {
    ;(window.electronAPI as any).getSqliteStatus
      .mockResolvedValueOnce(makeStatus())
      .mockResolvedValueOnce(makeStatus({ ready: true, dbSize: 848000, summary: { 'table1': 1000 } }))
    ;(window.electronAPI as any).enableSqlite.mockResolvedValue({ success: true, message: 'SQLite 已启用' })

    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleEnable()
    })

    expect(result.current.enabling).toBe(false)
    expect(result.current.message).toEqual({ type: 'success', text: 'SQLite 已启用' })
    expect(result.current.status?.ready).toBe(true)
  })

  test('handleEnable 失败时应显示错误', async () => {
    ;(window.electronAPI as any).getSqliteStatus.mockResolvedValue(makeStatus())
    ;(window.electronAPI as any).enableSqlite.mockResolvedValue({ success: false, message: '初始化失败' })

    const { result } = renderHook(() => useSqliteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleEnable()
    })

    expect(result.current.message).toEqual({ type: 'error', text: '初始化失败' })
  })

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
