import { renderHook, act, cleanup } from '@testing-library/react'

afterEach(cleanup)

describe('useRowHoverOpacity', () => {
  afterEach(() => {
    localStorage.removeItem('rowHoverOpacity')
    document.documentElement.style.removeProperty('--row-hover-opacity')
  })

  it('默认 opacity 应为 60', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())
    expect(result.current.opacity).toBe(60)
  })

  it('应从 localStorage 读取已保存的 opacity', async () => {
    localStorage.setItem('rowHoverOpacity', '80')
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())
    expect(result.current.opacity).toBe(80)
  })

  it('setOpacity 应更新 opacity 并 clamp 到 0-100', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())

    act(() => {
      result.current.setOpacity(75)
    })
    expect(result.current.opacity).toBe(75)

    // 超过上限
    act(() => {
      result.current.setOpacity(150)
    })
    expect(result.current.opacity).toBe(100)

    // 低于下限
    act(() => {
      result.current.setOpacity(-10)
    })
    expect(result.current.opacity).toBe(0)
  })

  it('setOpacity 应四舍五入', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())

    act(() => {
      result.current.setOpacity(55.7)
    })
    expect(result.current.opacity).toBe(56)

    act(() => {
      result.current.setOpacity(55.3)
    })
    expect(result.current.opacity).toBe(55)
  })

  it('opacity 变化时应设置 CSS 变量 --row-hover-opacity', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())

    act(() => {
      result.current.setOpacity(80)
    })

    const cssValue = document.documentElement.style.getPropertyValue('--row-hover-opacity')
    expect(cssValue).toBe('0.8')
  })

  it('setOpacity 应持久化到 localStorage', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())

    act(() => {
      result.current.setOpacity(70)
    })

    expect(localStorage.getItem('rowHoverOpacity')).toBe('70')
  })

  it('localStorage 中存储无效值时应使用默认值 60', async () => {
    localStorage.setItem('rowHoverOpacity', 'invalid')
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())
    expect(result.current.opacity).toBe(60)
  })

  it('localStorage 中存储超出范围的值时应使用默认值 60', async () => {
    localStorage.setItem('rowHoverOpacity', '200')
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    const { result } = renderHook(() => useRowHoverOpacity())
    expect(result.current.opacity).toBe(60)
  })

  it('CSS 变量值应为 opacity/100 的小数', async () => {
    const { useRowHoverOpacity } = await import('../../hooks/useRowHoverOpacity')
    renderHook(() => useRowHoverOpacity())
    
    // 初始值 60
    expect(document.documentElement.style.getPropertyValue('--row-hover-opacity')).toBe('0.6')
  })
})
