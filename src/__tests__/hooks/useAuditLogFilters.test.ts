// @ts-nocheck
import { renderHook, act, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(cleanup)

describe('useAuditLogFilters', () => {
  it('初始状态应为空值且 page=1', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())
    expect(result.current.startDate).toBe('')
    expect(result.current.endDate).toBe('')
    expect(result.current.filterAction).toBe('')
    expect(result.current.filterResource).toBe('')
    expect(result.current.filterLevel).toBe('')
    expect(result.current.keyword).toBe('')
    expect(result.current.page).toBe(1)
  })

  it('set 应更新单个字段', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => {
      result.current.set('startDate', '2025-01-01')
    })
    expect(result.current.startDate).toBe('2025-01-01')

    act(() => {
      result.current.set('filterAction', 'CREATE')
    })
    expect(result.current.filterAction).toBe('CREATE')
  })

  it('set 应更新多个字段而不影响其他字段', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => {
      result.current.set('startDate', '2025-01-01')
    })
    act(() => {
      result.current.set('keyword', '测试')
    })

    expect(result.current.startDate).toBe('2025-01-01')
    expect(result.current.keyword).toBe('测试')
    expect(result.current.endDate).toBe('') // 未受影响
  })

  it('reset 应恢复所有字段为初始值', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => {
      result.current.set('startDate', '2025-01-01')
      result.current.set('filterAction', 'CREATE')
      result.current.set('keyword', '测试')
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.startDate).toBe('')
    expect(result.current.filterAction).toBe('')
    expect(result.current.keyword).toBe('')
    expect(result.current.page).toBe(1)
  })

  it('setPage 应更新页码', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.page).toBe(3)
  })

  it('filterParams 空字符串应转为 undefined', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    expect(result.current.filterParams.startDate).toBeUndefined()
    expect(result.current.filterParams.endDate).toBeUndefined()
    expect(result.current.filterParams.action).toBeUndefined()
    expect(result.current.filterParams.resource).toBeUndefined()
    expect(result.current.filterParams.level).toBeUndefined()
    expect(result.current.filterParams.keyword).toBeUndefined()
  })

  it('filterParams 有值时应保留', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => {
      result.current.set('startDate', '2025-01-01')
      result.current.set('filterAction', 'DELETE')
      result.current.set('keyword', '审计')
    })

    expect(result.current.filterParams.startDate).toBe('2025-01-01')
    expect(result.current.filterParams.action).toBe('DELETE')
    expect(result.current.filterParams.keyword).toBe('审计')
    // 未设置的字段仍为 undefined
    expect(result.current.filterParams.endDate).toBeUndefined()
  })

  it('set 应支持所有字段类型', async () => {
    const { useAuditLogFilters } = await import('../../hooks/useAuditLogFilters')
    const { result } = renderHook(() => useAuditLogFilters())

    act(() => { result.current.set('startDate', '2025-01-01') })
    act(() => { result.current.set('endDate', '2025-12-31') })
    act(() => { result.current.set('filterAction', 'UPDATE') })
    act(() => { result.current.set('filterResource', 'project') })
    act(() => { result.current.set('filterLevel', 'WARN') })
    act(() => { result.current.set('keyword', '搜索') })
    act(() => { result.current.set('page', 5) })

    expect(result.current.startDate).toBe('2025-01-01')
    expect(result.current.endDate).toBe('2025-12-31')
    expect(result.current.filterAction).toBe('UPDATE')
    expect(result.current.filterResource).toBe('project')
    expect(result.current.filterLevel).toBe('WARN')
    expect(result.current.keyword).toBe('搜索')
    expect(result.current.page).toBe(5)
  })
})
