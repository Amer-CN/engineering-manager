// @ts-nocheck
import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useFilters } from '../../hooks/useFilters'

interface TestItem {
  id: number
  name: string
  category: string
  status: string
  tags: string[]
}

const mockItems: TestItem[] = [
  { id: 1, name: 'Apple', category: 'fruit', status: 'active', tags: ['red', 'sweet'] },
  { id: 2, name: 'Banana', category: 'fruit', status: 'active', tags: ['yellow', 'sweet'] },
  { id: 3, name: 'Carrot', category: 'vegetable', status: 'inactive', tags: ['orange'] },
  { id: 4, name: 'Apple Pie', category: 'dessert', status: 'active', tags: ['sweet'] },
]

describe('useFilters', () => {
  afterEach(() => {
    cleanup()
  })

  it('无筛选条件时返回全部数据', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    expect(result.current.filteredItems).toHaveLength(4)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('字符串模糊匹配（不区分大小写）', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('name', 'app') })
    expect(result.current.filteredItems).toHaveLength(2)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('精确匹配非字符串字段', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('category', 'fruit') })
    expect(result.current.filteredItems).toHaveLength(2)
  })

  it('空值不筛选', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('name', '') })
    expect(result.current.filteredItems).toHaveLength(4)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('null 值不筛选', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('name', null as unknown as string) })
    expect(result.current.filteredItems).toHaveLength(4)
  })

  it('undefined 值不筛选', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('name', undefined as unknown as string) })
    expect(result.current.filteredItems).toHaveLength(4)
  })

  it('clearFilters 应清除所有筛选', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('category', 'fruit') })
    expect(result.current.filteredItems).toHaveLength(2)

    act(() => { result.current.clearFilters() })
    expect(result.current.filteredItems).toHaveLength(4)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('clearFilter 应清除单个筛选条件', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('category', 'fruit') })
    act(() => { result.current.setFilter('status', 'active') })

    act(() => { result.current.clearFilter('category') })
    expect(result.current.filters.category).toBeUndefined()
    expect(result.current.filters.status).toBe('active')
  })

  it('多个条件应同时满足', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('category', 'fruit') })
    act(() => { result.current.setFilter('status', 'active') })
    expect(result.current.filteredItems).toHaveLength(2)
  })

  it('应支持默认筛选条件', () => {
    const { result } = renderHook(() =>
      useFilters<TestItem>(mockItems, { category: 'fruit' })
    )

    expect(result.current.filteredItems).toHaveLength(2)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('数组筛选应检查包含', () => {
    const { result } = renderHook(() => useFilters<TestItem>(mockItems))

    act(() => { result.current.setFilter('status', ['active', 'pending'] as unknown as string) })
    expect(result.current.filteredItems).toHaveLength(3)
  })
})
