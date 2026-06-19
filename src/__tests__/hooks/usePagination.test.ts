import { renderHook, act, cleanup } from '@testing-library/react'
import { usePagination } from '../../hooks/usePagination'

describe('usePagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  afterEach(() => {
    cleanup()
  })

  it('应返回正确的初始分页状态', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    expect(result.current.currentPage).toBe(1)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.totalItems).toBe(25)
    expect(result.current.pageSize).toBe(10)
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.hasPrevPage).toBe(false)
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(10)
  })

  it('应正确分页数据', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    expect(result.current.items).toHaveLength(10)
    expect(result.current.items[0].id).toBe(1)
    expect(result.current.items[9].id).toBe(10)
  })

  it('goToPage 应跳转到指定页', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.goToPage(2) })
    expect(result.current.currentPage).toBe(2)
    expect(result.current.items[0].id).toBe(11)
    expect(result.current.startIndex).toBe(10)
  })

  it('goToPage 超出范围应被限制', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.goToPage(100) })
    expect(result.current.currentPage).toBe(3)

    act(() => { result.current.goToPage(0) })
    expect(result.current.currentPage).toBe(1)
  })

  it('nextPage / prevPage 应正确翻页', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.nextPage() })
    expect(result.current.currentPage).toBe(2)

    act(() => { result.current.prevPage() })
    expect(result.current.currentPage).toBe(1)
  })

  it('firstPage / lastPage 应跳到首页和末页', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.lastPage() })
    expect(result.current.currentPage).toBe(3)

    act(() => { result.current.firstPage() })
    expect(result.current.currentPage).toBe(1)
  })

  it('已到首页时 prevPage 不应低于 1', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.prevPage() })
    expect(result.current.currentPage).toBe(1)
  })

  it('已到末页时 nextPage 不应超出', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.goToPage(3) })
    act(() => { result.current.nextPage() })
    expect(result.current.currentPage).toBe(3)
  })

  it('changePageSize 应重置到第一页', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.goToPage(2) })
    expect(result.current.currentPage).toBe(2)

    act(() => { result.current.changePageSize(5) })
    expect(result.current.pageSize).toBe(5)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.totalPages).toBe(5)
  })

  it('空数组应返回安全默认值', () => {
    const { result } = renderHook(() => usePagination([], 10))

    expect(result.current.totalItems).toBe(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.items).toHaveLength(0)
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.hasPrevPage).toBe(false)
  })

  it('最后一页可能有少于 pageSize 的项', () => {
    const { result } = renderHook(() => usePagination(items, 10))

    act(() => { result.current.goToPage(3) })
    expect(result.current.items).toHaveLength(5)
    expect(result.current.hasNextPage).toBe(false)
  })
})
