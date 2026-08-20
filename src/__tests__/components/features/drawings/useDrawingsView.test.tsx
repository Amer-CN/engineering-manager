/**
 * 图纸视图模式测试（useDrawingsView）
 *
 * 用户裁决轮播只留知识库后：图纸仅画廊/列表二视图；
 * 覆盖：默认列表、切换持久化、非法值回落、历史 stack 值回落默认。
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

  it('历史 stack 持久化值回落默认列表（轮播已从图纸管理移除）', () => {
    localStorage.setItem('drawings.view', 'stack')
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('list')
  })
})
