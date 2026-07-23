import { renderHook, act, cleanup } from '@testing-library/react'
import { useTheme } from '../../hooks/useTheme'

// useTheme 已从旧的 light/dark toggle 迁移到三主题 scheme 系统
// (white / graphite / sandstone), 使用模块级全局 store (useSyncExternalStore).
describe('useTheme (三主题 scheme)', () => {
  afterEach(cleanup)

  // 每个用例先把全局 store 复位到 white (localStorage 已加载, 只能经 setScheme 改)
  beforeEach(() => {
    const { result, unmount } = renderHook(() => useTheme())
    act(() => { result.current.setScheme('white') })
    unmount()
  })

  it('setScheme 应更新 scheme', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setScheme('graphite') })
    expect(result.current.scheme).toBe('graphite')
  })

  it('setScheme 应写入 localStorage(app-theme) 与 data-theme 属性', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setScheme('sandstone') })
    expect(result.current.scheme).toBe('sandstone')
    expect(localStorage.getItem('app-theme')).toBe('sandstone')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sandstone')
  })

  it('切回 white 应生效并持久化', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setScheme('graphite') })
    act(() => { result.current.setScheme('white') })
    expect(result.current.scheme).toBe('white')
    expect(localStorage.getItem('app-theme')).toBe('white')
  })

  it('多个 useTheme 实例应共享同一 scheme', () => {
    const a = renderHook(() => useTheme())
    const b = renderHook(() => useTheme())
    act(() => { a.result.current.setScheme('graphite') })
    expect(a.result.current.scheme).toBe('graphite')
    expect(b.result.current.scheme).toBe('graphite')
  })
})
