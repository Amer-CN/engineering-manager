/**
 * usePagination Hook
 * 
 * 分页逻辑 Hook - 提供通用的分页功能
 */

import { useState, useCallback, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分页信息
 */
export interface PaginationInfo {
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * usePagination 返回类型
 */
export interface UsePaginationReturn<T> extends PaginationInfo {
  // 数据
  items: T[]
  
  // 分页操作
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  firstPage: () => void
  lastPage: () => void
  changePageSize: (newSize: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 分页 Hook
 * 
 * @param items - 原始数据数组
 * @param defaultPageSize - 默认每页数量 (默认: 10)
 * 
 * @example
 * ```tsx
 * function UserList() {
 *   const { items, currentPage, totalPages, goToPage } = usePagination(users, 20)
 *   
 *   return (
 *     <>
 *       {items.map(user => <UserItem key={user.id} user={user} />)}
 *       <Pagination current={currentPage} total={totalPages} onChange={goToPage} />
 *     </>
 *   )
 * }
 * ```
 */
export function usePagination<T>(items: T[], defaultPageSize = 10): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 计算分页数据
  const paginationData = useMemo<PaginationInfo>(() => {
    const totalItems = items.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
    const startIndex = (safeCurrentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)

    return {
      totalItems,
      totalPages,
      currentPage: safeCurrentPage,
      pageSize,
      startIndex,
      endIndex,
      hasNextPage: safeCurrentPage < totalPages,
      hasPrevPage: safeCurrentPage > 1,
    }
  }, [items, currentPage, pageSize])

  // 分页操作
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, paginationData.totalPages))
    setCurrentPage(targetPage)
  }, [paginationData.totalPages])

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const firstPage = useCallback(() => {
    goToPage(1)
  }, [goToPage])

  const lastPage = useCallback(() => {
    goToPage(paginationData.totalPages)
  }, [goToPage, paginationData.totalPages])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // 重置到第一页
  }, [])

  return {
    items: items.slice(paginationData.startIndex, paginationData.endIndex),
    ...paginationData,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
  }
}
