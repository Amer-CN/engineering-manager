/**
 * useDebounce Hook
 *
 * 防抖 Hook
 */

import { useState, useEffect, useRef } from 'react'

export interface UseDebounceReturn<T> {
  value: T
  isPending: boolean
}

/**
 * 防抖值 Hook
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟时间 (毫秒，默认: 300)
 */
export function useDebounce<T>(value: T, delay = 300): UseDebounceReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastValueRef = useRef<T>(value)

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true)
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
      setIsPending(false)
      lastValueRef.current = value
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return { value: debouncedValue, isPending }
}

export type { UseDebouncedCallbackReturn } from './useDebouncedCallback'
export { useDebouncedCallback, useDebouncedFn } from './useDebouncedCallback'
