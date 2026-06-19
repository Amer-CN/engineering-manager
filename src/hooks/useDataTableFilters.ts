import { useCallback } from 'react'

/**
 * useDataTableFilters — DataTable 筛选操作回调 (v0.75.0 拆分)
 *
 * 提供 handleFilterToggle / handleFilterSelectAll / handleFilterClear 三个回调,
 * 配合 useDataTableState 的 setFilters 使用.
 *
 * 注: filterable 列的 onChange 由 useDataTableState.handleFilterChange 处理
 * (接受 Set<string>). 这里三个回调是给 DataTable 内部 ColFilterDropdown UI 用的.
 */
export function useDataTableFilters(
  setFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>,
) {
  const handleFilterToggle = useCallback((colKey: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev }
      const set = new Set(next[colKey] || [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      next[colKey] = set
      return next
    })
  }, [setFilters])

  const handleFilterSelectAll = useCallback((colKey: string, allValues: string[]) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set(allValues),
    }))
  }, [setFilters])

  const handleFilterClear = useCallback((colKey: string) => {
    setFilters(prev => ({
      ...prev,
      [colKey]: new Set<string>(),
    }))
  }, [setFilters])

  return { handleFilterToggle, handleFilterSelectAll, handleFilterClear }
}
