/**
 * useLocalStorage Hook
 * 
 * 本地存储 Hook
 */

import { useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useLocalStorage 返回类型
 */
export interface UseLocalStorageReturn<T> {
  value: T                    // 存储的值
  setValue: (value: T) => void // 设置值
  removeValue: () => void      // 移除值
  error: Error | null          // 错误信息
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从 localStorage 获取值
 */
function getItem<T>(key: string, defaultValue: T): { value: T; error: Error | null } {
  try {
    const item = localStorage.getItem(key)
    
    if (item === null) {
      return { value: defaultValue, error: null }
    }
    
    const parsed = JSON.parse(item) as T
    return { value: parsed, error: null }
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return { value: defaultValue, error: error as Error }
  }
}

/**
 * 设置值到 localStorage
 */
function setItem<T>(key: string, value: T): Error | null {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
    return error as Error
  }
}

/**
 * 从 localStorage 移除值
 */
function removeItem(key: string): Error | null {
  try {
    localStorage.removeItem(key)
    return null
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
    return error as Error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * LocalStorage Hook
 * 
 * @param key - 存储键名
 * @param defaultValue - 默认值
 * 
 * @example
 * ```tsx
 * function Settings() {
 *   // 主题设置
 *   const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light')
 *   
 *   // 记住用户偏好
 *   const [username, setUsername] = useLocalStorage('username', '')
 *   
 *   return (
 *     <div>
 *       <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *         <option value="light">浅色</option>
 *         <option value="dark">深色</option>
 *       </select>
 *       
 *       <input
 *         value={username}
 *         onChange={(e) => setUsername(e.target.value)}
 *         placeholder="输入用户名"
 *       />
 *       
 *       <button onClick={removeTheme}>清除主题设置</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValueState] = useState<T>(() => {
    return getItem(key, defaultValue).value
  })
// @ts-ignore TS6133: error is declared but never read
  const [error, setError] = useState<Error | null>(null)

  // 设置值
  const setValue = useCallback((newValue: T) => {
    const err = setItem(key, newValue)
    if (err) {
      setError(err)
      return
    }
    setValueState(newValue)
    setError(null)
  }, [key])

  // 移除值
  const removeValue = useCallback(() => {
    const err = removeItem(key)
    if (err) {
      setError(err)
      return
    }
    setValueState(defaultValue)
    setError(null)
  }, [key, defaultValue])

  // 监听其他标签页的变化
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
 * 
 * @param key - 存储键名
 * @param defaultValue - 默认值
 * 
 * @example
 * ```tsx
 * function Settings() {
 *   const { value: theme, setValue, removeValue, error } = useLocalStorageSync('theme', 'light')
 *   
 *   return (
 *     <div>
 *       <select value={theme} onChange={(e) => setValue(e.target.value)}>
 *         <option value="light">浅色</option>
 *         <option value="dark">深色</option>
 *       </select>
 *       {error && <p>保存失败</p>}
 *     </div>
 *   )
 * }
 * ```
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
