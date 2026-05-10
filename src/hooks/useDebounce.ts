/**
 * useDebounce Hook
 * 
 * 防抖 Hook
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useDebounce 返回类型
 */
export interface UseDebounceReturn<T> {
  value: T           // 防抖后的值
  isPending: boolean // 是否正在等待
}

/**
 * useDebouncedCallback 返回类型
 */
export interface UseDebouncedCallbackReturn<TArgs extends unknown[]> {
  callback: (...args: TArgs) => void  // 防抖后的回调
  cancel: () => void                  // 取消执行
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hooks Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 防抖值 Hook
 * 
 * @param value - 需要防抖的值
 * @param delay - 延迟时间 (毫秒，默认: 300)
 * 
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [searchTerm, setSearchTerm] = useState('')
 *   const debouncedTerm = useDebounce(searchTerm, 500) // 500ms 防抖
 *   
 *   useEffect(() => {
 *     // 只在停止输入 500ms 后执行搜索
 *     if (debouncedTerm) {
 *       fetchResults(debouncedTerm)
 *     }
 *   }, [debouncedTerm])
 *   
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="搜索..."
 *     />
 *   )
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay = 300): UseDebounceReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastValueRef = useRef<T>(value)

  useEffect(() => {
    // 标记为等待中
    if (value !== debouncedValue) {
      setIsPending(true)
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
      setIsPending(false)
      lastValueRef.current = value
    }, delay)

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return {
    value: debouncedValue,
    isPending,
  }
}

/**
 * 防抖回调 Hook
 * 
 * @param callback - 需要防抖的回调函数
 * @param delay - 延迟时间 (毫秒，默认: 300)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const handleSearch = useCallback((query: string) => {
 *     console.log('搜索:', query)
 *   }, [])
 *   
 *   const { callback: debouncedSearch, cancel } = useDebouncedCallback(handleSearch, 500)
 *   
 *   return (
 *     <input
 *       onChange={(e) => debouncedSearch(e.target.value)}
 *       placeholder="搜索..."
 *     />
 *   )
 * }
 * ```
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
): UseDebouncedCallbackReturn<TArgs> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback((...args: TArgs) => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    callback: debouncedCallback,
    cancel,
  }
}

/**
 * 立即执行防抖 Hook (第一次立即执行，后续防抖)
 * 
 * @param callback - 回调函数
 * @param delay - 延迟时间
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const handleClick = useDebouncedFn(() => {
 *     console.log('点击')
 *   }, 1000)
 *   
 *   return <button onClick={handleClick}>快速点击</button> // 只执行一次
 * }
 * ```
 */
export function useDebouncedFn<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
): (...args: TArgs) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastArgsRef = useRef<TArgs | null>(null)

  return useCallback((...args: TArgs) => {
    lastArgsRef.current = args

    if (timeoutRef.current) {
      return // 已有人在等待，忽略
    }

    // 立即执行
    callback(...args)

    // 设置防抖
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      
      // 如果有新参数，再执行一次
      if (lastArgsRef.current) {
        callback(...lastArgsRef.current)
        lastArgsRef.current = null
      }
    }, delay)
  }, [callback, delay])
}
