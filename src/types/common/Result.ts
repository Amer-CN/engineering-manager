/**
 * Result 类型定义
 * 
 * 提供统一的操作结果类型，用于替代 throw/catch 模式
 */

export type Result<T, E = string> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: E; warning?: string }

export type VoidResult<E = string> = 
  | { success: true }
  | { success: false; error: E }

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 检查 Result 是否成功
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

/**
 * 检查 Result 是否失败
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

/**
 * 创建成功结果
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data }
}

/**
 * 创建失败结果
 */
export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Option 类型 (可选值)
 */
export type Option<T> = 
  | { isSome: true; value: T }
  | { isSome: false }

export function some<T>(value: T): Option<T> {
  return { isSome: true, value }
}

export function none<T>(): Option<T> {
  return { isSome: false }
}

export function isSome<T>(option: Option<T>): option is { isSome: true; value: T } {
  return option.isSome === true
}

export function isNone<T>(option: Option<T>): option is { isSome: false } {
  return option.isSome === false
}
