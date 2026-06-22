/**
 * localStorage Storage Helpers
 * 
 * 本地存储底层操作函数
 */

/**
 * 从 localStorage 获取值
 */
export function getItem<T>(key: string, defaultValue: T): { value: T; error: Error | null } {
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
export function setItem<T>(key: string, value: T): Error | null {
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
export function removeItem(key: string): Error | null {
  try {
    localStorage.removeItem(key)
    return null
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
    return error as Error
  }
}
