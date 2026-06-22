/**
 * useLocalStorage Hook
 */

import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem, removeItem } from './useLocalStorage.storage'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useLocalStorage 返回类型
 */
export interface UseLocalStorageReturn<T> {
  value: T
  setValue: (value: T) => void
  removeValue: () => void
  error: Error | null
}

/**
 * LocalStorage Hook
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValueState] = useState<T>(() => {
    return getItem(key, defaultValue).value
  })
  const [_error, setError] = useState<Error | null>(null)

  const setValue = useCallback((newValue: T) => {
    const err = setItem(key, newValue)
    if (err) {
      setError(err)
      return
    }
    setValueState(newValue)
    setError(null)
  }, [key])

  const removeValue = useCallback(() => {
    const err = removeItem(key)
    if (err) {
      setError(err)
      return
    }
    setValueState(defaultValue)
    setError(null)
  }, [key, defaultValue])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as T
          setValueState(newValue)
        } catch {
          // 忽略解析错误
        }
      } else if (e.key === key && e.newValue === null) {
        setValueState(defaultValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, defaultValue])

  return [value, setValue, removeValue]
}

/**
 * LocalStorage 同步 Hook (返回对象形式)
 */
export function useLocalStorageSync<T>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T> {
  const [value, setValue, removeValue] = useLocalStorage(key, defaultValue)
  const [error, setError] = useState<Error | null>(null)

  const setValueWithError = useCallback((newValue: T) => {
    const err = setItem(key, newValue)
    if (err) {
      setError(err)
    } else {
      setError(null)
    }
    setValue(newValue)
  }, [key, setValue])

  const removeValueWithError = useCallback(() => {
    const err = removeItem(key)
    if (err) {
      setError(err)
    } else {
      setError(null)
    }
    removeValue()
  }, [key, removeValue])

  return {
    value,
    setValue: setValueWithError,
    removeValue: removeValueWithError,
    error,
  }
}
