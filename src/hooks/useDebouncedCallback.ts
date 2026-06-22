/**
 * useDebouncedCallback / useDebouncedFn
 *
 * 防抖回调变体 Hook
 */

import { useRef, useCallback, useEffect } from 'react'

export interface UseDebouncedCallbackReturn<TArgs extends unknown[]> {
  callback: (...args: TArgs) => void
  cancel: () => void
}

/**
 * 防抖回调 Hook
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
): UseDebouncedCallbackReturn<TArgs> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback((...args: TArgs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { callback: debouncedCallback, cancel }
}

/**
 * 立即执行防抖 Hook (第一次立即执行，后续防抖)
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
      return
    }

    callback(...args)

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      if (lastArgsRef.current) {
        callback(...lastArgsRef.current)
        lastArgsRef.current = null
      }
    }, delay)
  }, [callback, delay])
}
