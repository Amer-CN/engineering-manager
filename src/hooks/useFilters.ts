/**
 * useFilters Hook
 * 
 * 筛选逻辑 Hook - 提供通用的筛选功能
 */

import { useState, useCallback, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useFilters 返回类型
 */
export interface UseFiltersReturn<T extends Record<string, unknown>> {
  // 数据
  filters: Partial<T>
  filteredItems: T[]
  
  // 操作方法
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void
  clearFilters: () => void
  clearFilter: <K extends keyof T>(key: K) => void
  
  // 状态
  hasActiveFilters: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 筛选 Hook
 * 
 * @param items - 原始数据数组
 * @param defaultFilters - 默认筛选条件 (可选)
 * 
 * @example
 * ```tsx
 * function ProductList() {
 *   const {
 *     filteredItems,
 *     filters,
 *     setFilter,
 *     clearFilters,
 *     hasActiveFilters
 *   } = useFilters(products)
 *   
 *   return (
 *     <>
 *       <FilterBar filters={filters} onFilterChange={setFilter} />
 *       {filteredItems.map(product => <ProductItem key={product.id} product={product} />)}
 *       {hasActiveFilters && <button onClick={clearFilters}>清除筛选</button>}
 *     </>
 *   )
 * }
 * ```
 */
export function useFilters<T extends Record<string, unknown>>(
  items: T[],
  defaultFilters?: Partial<T>
): UseFiltersReturn<T> {
  const [filters, setFilters] = useState<Partial<T>>(defaultFilters || {})

  // 过滤后的数据
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        // 空值不筛选
        if (value === undefined || value === null || value === '') {
          return true
        }
        
        const itemValue = item[key as keyof T]
        
        // 字符串模糊匹配
        if (typeof value === 'string' && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase())
        }
        
        // 数组包含检查
        if (Array.isArray(value)) {
          return value.includes(itemValue as never)
        }
        
        // 精确匹配
        return itemValue === value
      })
    })
  }, [items, filters])

  // 设置筛选条件
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // 清除所有筛选条件
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // 清除单个筛选条件
  const clearFilter = useCallback(<K extends keyof T>(key: K) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  // 是否有激活的筛选条件
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => 
      v !== undefined && v !== null && v !== ''
    )
  }, [filters])

  return {
    filters,
    filteredItems,
    setFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters,
  }
}
