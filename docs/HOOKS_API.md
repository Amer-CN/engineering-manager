# Hooks API 设计规范

> 版本: 1.0.0
> 更新时间: 2026-04-30
> 维护者: 软件架构师

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| **单一职责** | 每个 Hook 只管理一种状态 |
| **可组合** | Hooks 可以相互组合 |
| **返回值一致** | 所有 Hook 返回统一的接口 |
| **可测试** | 业务逻辑可单独测试 |

---

## 2. Hooks 契约规范

### 2.1 标准返回值接口

```typescript
/**
 * 标准 Hook 返回值接口
 */
export interface UseDataReturn<T, DTO = Partial<T>> {
  // ═══════════════════════════════════════
  // 数据状态
  // ═══════════════════════════════════════
  data: T[]
  loading: boolean
  error: string | null
  selectedItem: T | null
  
  // ═══════════════════════════════════════
  // 操作方法 (useCallback 包装)
  // ═══════════════════════════════════════
  loadData: () => Promise<void>
  create: (data: DTO) => Promise<Result<{ id: number }>>
  update: (data: T) => Promise<Result<void>>
  delete: (id: number) => Promise<Result<void>>
  
  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════
  setSelectedItem: (item: T | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}
```

---

## 3. 核心 Hooks 实现

### 3.1 useProjects - 项目管理

```typescript
// src/hooks/useProjects.ts

import { useState, useCallback, useEffect } from 'react'
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '@/types/domain'
import type { Result } from '@/types/common'

/**
 * 项目管理 Hook
 * 
 * @description 提供项目管理相关的状态和操作
 * 
 * @example
 * ```tsx
 * function ProjectsPage() {
 *   const {
 *     data: projects,
 *     loading,
 *     error,
 *     create,
 *     update,
 *     delete: deleteProject,
 *     refresh
 *   } = useProjects()
 * 
 *   // 使用...
 * }
 * ```
 */
export function useProjects(filters?: ProjectFilters) {
  // ═══════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // ═══════════════════════════════════════
  // 数据加载
  // ═══════════════════════════════════════
  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.getProjects()
      
      if (result.success && result.data) {
        setProjects(result.data)
      } else {
        setError(result.error || '加载失败')
      }
    } catch (err) {
      setError(handleError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ═══════════════════════════════════════
  // CRUD 操作
  // ═══════════════════════════════════════
  const create = useCallback(async (data: CreateProjectDTO): Promise<Result<{ id: number }>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.createProject(data)
      
      if (result.success) {
        await loadProjects()  // 刷新列表
        return { success: true, data: { id: result.data?.id || 0 } }
      }
      
      setError(result.error || '创建失败')
      return { success: false, error: result.error || '创建失败' }
    } catch (err) {
      const error = handleError(err)
      setError(error.message)
      return { success: false, error: error.message }
    }
  }, [loadProjects])

  const update = useCallback(async (project: Project): Promise<Result<void>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.updateProject(project)
      
      if (result.success) {
        await loadProjects()
        return { success: true }
      }
      
      setError(result.error || '更新失败')
      return { success: false, error: result.error || '更新失败' }
    } catch (err) {
      const error = handleError(err)
      setError(error.message)
      return { success: false, error: error.message }
    }
  }, [loadProjects])

  const deleteProject = useCallback(async (id: number): Promise<Result<void>> => {
    setError(null)
    
    try {
      const result = await window.electronAPI.deleteProject(id)
      
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== id))
        if (selectedProject?.id === id) {
          setSelectedProject(null)
        }
        return { success: true }
      }
      
      setError(result.error || '删除失败')
      return { success: false, error: result.error || '删除失败' }
    } catch (err) {
      const error = handleError(err)
      setError(error.message)
      return { success: false, error: error.message }
    }
  }, [selectedProject])

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  // 初始加载
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    data: projects,
    loading,
    error,
    selectedItem: selectedProject,
    loadData: loadProjects,
    create,
    update,
    delete: deleteProject,
    setSelectedItem: setSelectedProject,
    clearError,
    refresh,
  }
}

// 筛选器类型
export interface ProjectFilters {
  status?: Project['status']
  searchTerm?: string
  managerId?: number
}
```

### 3.2 usePagination - 分页逻辑

```typescript
// src/hooks/usePagination.ts

import { useState, useCallback, useMemo } from 'react'

/**
 * 分页 Hook
 * 
 * @description 提供通用的分页逻辑
 */
export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 计算分页数据
  const paginationData = useMemo(() => {
    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedItems = items.slice(startIndex, endIndex)

    return {
      totalItems,
      totalPages,
      currentPage,
      pageSize,
      startIndex,
      endIndex,
      items: paginatedItems,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
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
    setCurrentPage(1)  // 重置到第一页
  }, [])

  return {
    ...paginationData,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
  }
}
```

### 3.3 useFilters - 筛选逻辑

```typescript
// src/hooks/useFilters.ts

import { useState, useCallback, useMemo } from 'react'

/**
 * 筛选 Hook
 * 
 * @description 提供通用的筛选逻辑
 */
export function useFilters<T extends Record<string, unknown>>(
  items: T[],
  defaultFilters?: Partial<T>
) {
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

  // 清除筛选条件
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
```

### 3.4 useModal - 弹窗状态

```typescript
// src/hooks/useModal.ts

import { useState, useCallback } from 'react'

/**
 * 弹窗 Hook
 * 
 * @description 提供弹窗的打开/关闭状态管理
 */
export function useModal<T = unknown>(initialData?: T) {
  const [isOpen, setIsOpen] = useState(false)
  const [modalData, setModalData] = useState<T | undefined>(initialData)

  const open = useCallback((data?: T) => {
    setModalData(data)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // 可选：清除数据
    // setModalData(undefined)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    modalData,
    open,
    close,
    toggle,
  }
}

/**
 * 确认对话框 Hook
 */
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    content: string
    onConfirm: () => void
    onCancel?: () => void
  } | null>(null)

  const confirm = useCallback((
    title: string,
    content: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmConfig({ title, content, onConfirm, onCancel })
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    confirmConfig?.onConfirm()
    setIsOpen(false)
    setConfirmConfig(null)
  }, [confirmConfig])

  const handleCancel = useCallback(() => {
    confirmConfig?.onCancel?.()
    setIsOpen(false)
    setConfirmConfig(null)
  }, [confirmConfig])

  return {
    isOpen,
    config: confirmConfig,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
```

### 3.5 useAsync - 异步操作

```typescript
// src/hooks/useAsync.ts

import { useState, useCallback, useRef } from 'react'
import type { Result } from '@/types/common'

/**
 * 异步操作 Hook
 * 
 * @description 提供通用的异步操作状态管理
 */
export function useAsync<TArgs extends unknown[], TResult>(
  asyncFunction: (...args: TArgs) => Promise<Result<TResult>>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TResult | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (...args: TArgs) => {
    // 取消之前的请求
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const result = await asyncFunction(...args)
      
      if (result.success) {
        setData(result.data)
        return { success: true, data: result.data }
      } else {
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (err) {
      const error = handleError(err)
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [asyncFunction])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
    abortControllerRef.current?.abort()
  }, [])

  return {
    loading,
    error,
    data,
    execute,
    reset,
  }
}
```

---

## 4. Hooks 索引

```typescript
// src/hooks/index.ts

// 数据管理 Hooks
export { useProjects } from './useProjects'
export { useMembers } from './useMembers'
export { useTasks } from './useTasks'
export { useContracts } from './useContracts'
export { useInvoices } from './useInvoices'

// 通用 Hooks
export { usePagination } from './usePagination'
export { useFilters } from './useFilters'
export { useModal } from './useModal'
export { useConfirm } from './useConfirm'
export { useAsync } from './useAsync'

// 工具 Hooks
export { useForm } from './useForm'
export { useDebounce } from './useDebounce'
export { useLocalStorage } from './useLocalStorage'
```

---

## 5. 使用示例

### 5.1 组合多个 Hooks

```tsx
// src/components/features/projects/ProjectList.tsx

import { useProjects } from '@/hooks/useProjects'
import { usePagination } from '@/hooks/usePagination'
import { useFilters } from '@/hooks/useFilters'
import { ProjectCard } from '@/components/business/ProjectCard'
import { ProjectFilters } from './ProjectFilters'

export function ProjectList() {
  // 数据获取
  const {
    data: projects,
    loading,
    error,
    delete: deleteProject,
    refresh,
  } = useProjects()

  // 筛选
  const {
    filteredItems,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
  } = useFilters(projects)

  // 分页
  const {
    items: paginatedProjects,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination(filteredItems, 12)

  // 处理删除
  const handleDelete = async (id: number) => {
    const result = await deleteProject(id)
    if (result.success) {
      toast.success('删除成功')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="project-list">
      <ProjectFilters
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={refresh} />
      ) : paginatedProjects.length === 0 ? (
        <Empty description="暂无项目" />
      ) : (
        <>
          <div className="grid">
            {paginatedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>

          <Pagination
            current={currentPage}
            total={totalPages}
            onChange={goToPage}
            hasNext={hasNextPage}
            hasPrev={hasPrevPage}
          />
        </>
      )}
    </div>
  )
}
```

---

## 6. 规范检查清单

- [ ] Hook 名称以 `use` 开头
- [ ] 返回类型包含 `loading`, `error`, `data`
- [ ] 异步操作使用 `useCallback` 包装
- [ ] 使用 `handleError` 处理错误
- [ ] 返回统一格式的 `Result`
- [ ] 正确处理依赖数组
- [ ] 组件卸载时清理副作用

---

*文档版本: 1.0.0*
