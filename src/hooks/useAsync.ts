/**
 * useAsync Hook
 * 
 * 异步操作状态管理 Hook
 */

import { useState, useCallback, useRef } from 'react'
import { handleError, Result } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useAsync 返回类型
 */
export interface UseAsyncReturn<TArgs extends unknown[], TResult> {
  loading: boolean
  error: string | null
  data: TResult | null
  execute: (...args: TArgs) => Promise<Result<TResult>>
  reset: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 异步操作 Hook
 * 
 * @param asyncFunction - 异步函数
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const fetchData = async (id: number): Promise<Result<User>> => {
 *     const response = await api.getUser(id)
 *     return { success: true, data: response }
 *   }
 *   
 *   const { loading, error, data, execute, reset } = useAsync([(id: number) => fetchData(id)])
 *   
 *   const handleLoad = () => {
 *     execute(1) // 调用异步函数
 *   }
 *   
 *   return (
 *     <>
 *       {loading && <Spinner />}
 *       {error && <ErrorMessage error={error} />}
 *       {data && <UserCard user={data} />}
 *     </>
 *   )
 * }
 * ```
 */
export function useAsync<TArgs extends unknown[], TResult>(
  asyncFunction: (...args: TArgs) => Promise<Result<TResult>>
): UseAsyncReturn<TArgs, TResult> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TResult | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async (...args: TArgs) => {
    // 取消之前的请求 (如果有)
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const result = await asyncFunction(...args)
      
      if (result.success) {
        setData(result.data)
        return { success: true, data: result.data } as Result<TResult>
      } else {
        const err = (result as { success: false; error: string }).error
        setError(err)
        return { success: false, error: err } as Result<TResult>
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.getUserMessage())
      return { success: false, error: appError.getUserMessage() } as Result<TResult>
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

/**
 * 简单异步操作 Hook (不需要参数)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { loading, error, data, execute, reset } = useAsyncSimple(async () => {
 *     const response = await api.getUser()
 *     return response
 *   })
 *   
 *   return (
 *     <button onClick={execute} disabled={loading}>
 *       {loading ? '加载中...' : '加载数据'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useAsyncSimple<TResult>(
  asyncFunction: () => Promise<Result<TResult>>
): Omit<UseAsyncReturn<[], TResult>, 'execute'> & { execute: () => Promise<Result<TResult>> } {
  const asyncHook = useAsync(async () => {
    return await asyncFunction()
  })
  
  return {
    ...asyncHook,
    execute: asyncHook.execute,
  }
}
