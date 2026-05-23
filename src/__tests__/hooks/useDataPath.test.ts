import { renderHook, act, cleanup, waitFor } from '@testing-library/react'

afterEach(cleanup)

describe('useDataPath', () => {
  beforeEach(() => {
    // 确保 window.electronAPI 有 useDataPath 需要的方法
    const ea = window.electronAPI as Record<string, any>
    if (!ea.setDataPath) {
      ea.setDataPath = vi.fn().mockResolvedValue({ success: true, message: '路径已更新' })
    }
    if (!ea.getDataPath) {
      ea.getDataPath = vi.fn().mockResolvedValue('/default/data')
    }
    if (!ea.getConfig) {
      ea.getConfig = vi.fn().mockResolvedValue({
        success: true,
        data: { dataPath: '/current/path', defaultPath: '/default/data' },
      })
    }
    // 重置 mock 实现
    vi.mocked(ea.getConfig).mockResolvedValue({
      success: true,
      data: { dataPath: '/current/path', defaultPath: '/default/data' },
    })
    vi.mocked(ea.setDataPath).mockResolvedValue({ success: true, message: '路径已更新' })
    vi.mocked(ea.getDataPath).mockResolvedValue('/default/data')
  })

  it('挂载时应加载配置', async () => {
    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.dataPath).toBe('/current/path')
    expect(result.current.defaultPath).toBe('/default/data')
  })

  it('getConfig 失败时仍应结束 loading', async () => {
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.getConfig).mockResolvedValueOnce({ success: false })

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('handleChangeDataPath 成功时应更新路径并设置消息', async () => {
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.setDataPath).mockResolvedValueOnce({ success: true, message: '已更新' })
    vi.mocked(ea.getDataPath).mockResolvedValueOnce('/new/path')

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleChangeDataPath()
    })

    expect(result.current.dataPath).toBe('/new/path')
    expect(result.current.message?.type).toBe('success')
    expect(result.current.migrating).toBe(false)
  })

  it('handleChangeDataPath 失败时应设置错误消息', async () => {
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.setDataPath).mockResolvedValueOnce({ success: false, message: '修改失败' })

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleChangeDataPath()
    })

    expect(result.current.message?.type).toBe('error')
    expect(result.current.message?.text).toContain('修改失败')
  })

  it('handleChangeDataPath 异常时应设置错误消息', async () => {
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.setDataPath).mockRejectedValueOnce(new Error('异常错误'))

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleChangeDataPath()
    })

    expect(result.current.message?.type).toBe('error')
    expect(result.current.migrating).toBe(false)
  })

  it('handleResetToDefault 用户取消时应不做操作', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const ea = window.electronAPI as Record<string, any>
    const setDataPathCalls = vi.mocked(ea.setDataPath).mock.calls.length

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleResetToDefault()
    })

    // confirm 返回 false → 不应新增 setDataPath 调用
    expect(vi.mocked(ea.setDataPath).mock.calls.length).toBe(setDataPathCalls)
    confirmSpy.mockRestore()
  })

  it('handleResetToDefault 成功时应恢复默认路径', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.setDataPath).mockResolvedValueOnce({ success: true })
    vi.mocked(ea.getDataPath).mockResolvedValueOnce('/default/data')

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleResetToDefault()
    })

    expect(result.current.message?.type).toBe('success')
    expect(result.current.migrating).toBe(false)
    confirmSpy.mockRestore()
  })

  it('migrating 在操作期间应为 true', async () => {
    const ea = window.electronAPI as Record<string, any>
    let resolveMigration!: (v: any) => void
    vi.mocked(ea.setDataPath).mockReturnValueOnce(
      new Promise(r => { resolveMigration = r })
    )

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleChangeDataPath()
    })

    await waitFor(() => {
      expect(result.current.migrating).toBe(true)
    })

    await act(async () => {
      resolveMigration({ success: true, message: '完成' })
    })

    expect(result.current.migrating).toBe(false)
  })

  it('refresh 回调应在成功时调用', async () => {
    const refresh = vi.fn()
    const ea = window.electronAPI as Record<string, any>
    vi.mocked(ea.setDataPath).mockResolvedValueOnce({ success: true, message: '更新' })
    vi.mocked(ea.getDataPath).mockResolvedValueOnce('/new/path')

    const { useDataPath } = await import('../../hooks/useDataPath')
    const { result } = renderHook(() => useDataPath(refresh))

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleChangeDataPath()
    })

    expect(refresh).toHaveBeenCalled()
  })
})
