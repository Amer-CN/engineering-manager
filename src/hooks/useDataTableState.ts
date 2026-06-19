import { useState, useMemo, useCallback } from 'react'
import type { Column } from '../components/DataTable'

/**
 * useDataTableState — DataTable 内部状态逻辑 (sort / filter / pagination)
 *
 * v0.74.0 创建 + v0.75.0 接入 DataTable.tsx. 从 DataTable 函数体内提取出
 * sort / filter / pagination state + memos + handlers, 减 DataTable.tsx 行数.
 * 逻辑等价, 0 业务改动.
 */
export function useDataTableState<T>(
  data: T[],
  columns: Column<T>[],
  defaultSortKey: string | undefined,
  defaultSortOrder: 'asc' | 'desc',
  enablePagination: boolean,
  defaultPageSize: number,
  onSortChange?: (key: string | null, order: 'asc' | 'desc') => void,
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [filters, setFilters] = useState<Record<string, Set<string>>>({})

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    return [...data].sort((a, b) => {
      if (col?.sorter) return sortOrder === 'asc' ? col.sorter(a, b) : col.sorter(b, a)
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [data, sortKey, sortOrder, columns])

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, s]) => s.size > 0)
    if (activeFilters.length === 0) return sortedData
    return sortedData.filter(item => {
      return activeFilters.every(([key, valueSet]) => {
        const col = columns.find(c => c.key === key)
        const accessor = col?.filterAccessor || ((i: T) => String((i as Record<string, unknown>)[key] ?? ''))
        const itemVal = accessor(item)
        return valueSet.has(itemVal)
      })
    })
  }, [sortedData, filters, columns])

  const paginatedData = useMemo(() => {
    if (!enablePagination || pageSize === 0) return filteredData
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize, enablePagination])

  const totalPages = enablePagination && pageSize > 0 ? Math.ceil(data.length / pageSize) : 1

  const handleSort = useCallback(
    (key: string) => {
      setSortKey(prev => {
        const nextKey = prev === key ? null : key
        const nextOrder = prev === key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
        setSortOrder(nextOrder)
        onSortChange?.(nextKey, nextOrder)
        return nextKey
      })
    },
    [sortOrder, onSortChange],
  )

  const handleFilterChange = useCallback((columnKey: string, values: Set<string>) => {
    setFilters(prev => {
      const next = { ...prev }
      if (values.size === 0) delete next[columnKey]
      else next[columnKey] = values
      return next
    })
    setCurrentPage(1)
  }, [])

  return {
    sortKey, sortOrder, currentPage, pageSize, filters,
    sortedData, filteredData, paginatedData, totalPages,
    setCurrentPage, setPageSize,
    handleSort, handleFilterChange,
  }
}
