/**
 * 图纸视图模式测试（useDrawingsView）
 *
 * 忠实度批：stack 视图回归（改接 GlassCarousel）；
 * 覆盖：默认列表、切换持久化、非法值回落、stack 持久化恢复。
 */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useDrawingsView } from '@/components/features/drawings/useDrawingsView'

describe('useDrawingsView', () => {
  beforeEach(() => localStorage.removeItem('drawings.view'))

  it('无持久化记录时默认列表视图', () => {
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('list')
  })

  it('切换视图持久化到 localStorage 并可恢复', () => {
    const { result } = renderHook(() => useDrawingsView())
    act(() => result.current.setViewMode('gallery'))
    expect(localStorage.getItem('drawings.view')).toBe('gallery')
    const { result: restored } = renderHook(() => useDrawingsView())
    expect(restored.current.viewMode).toBe('gallery')
  })

  it('localStorage 存了非法值时回落默认列表', () => {
    localStorage.setItem('drawings.view', 'bogus')
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('list')
  })

  it('stack 持久化值可恢复（忠实度批：堆叠舞台回归）', () => {
    localStorage.setItem('drawings.view', 'stack')
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('stack')
  })
})
