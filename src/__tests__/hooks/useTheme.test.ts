import { renderHook, act, cleanup } from '@testing-library/react'

afterEach(cleanup)

describe('useTheme', () => {
  // 每个测试清空 localStorage
  afterEach(() => {
    localStorage.removeItem('app-theme')
    document.documentElement.classList.remove('dark')
  })

  it('默认应为 light 主题', async () => {
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('应从 localStorage 读取已保存的 dark 主题', async () => {
    localStorage.setItem('app-theme', 'dark')
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('setTheme 应切换主题并更新 localStorage', async () => {
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
    expect(localStorage.getItem('app-theme')).toBe('dark')
  })

  it('toggleTheme 应在 light 和 dark 之间切换', async () => {
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('light')
  })

  it('dark 主题时应在 documentElement 添加 dark class', async () => {
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('light 主题时应移除 dark class', async () => {
    localStorage.setItem('app-theme', 'dark')
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      result.current.setTheme('light')
    })

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('localStorage 中存储无效值时应回退到 light', async () => {
    localStorage.setItem('app-theme', 'invalid-theme')
    const { useTheme } = await import('../../hooks/useTheme')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })
})
