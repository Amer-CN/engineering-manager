/**
 * Error 类型定义
 * 
 * 提供统一的错误处理机制
 */

/**
 * 应用错误码
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  
  // 业务错误
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  
  // 操作错误
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  
  // 系统错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  IPC_ERROR = 'IPC_ERROR',
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    
    // Node.js 特有功能，captureStackTrace 用于优化堆栈跟踪
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NodeError = Error as any
    if (NodeError.captureStackTrace) {
      NodeError.captureStackTrace(this, AppError)
    }
  }

  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.NOT_FOUND:
        return `未找到相关记录: ${this.message}`
      case ErrorCode.DUPLICATE:
        return `记录已存在: ${this.message}`
      case ErrorCode.VALIDATION_ERROR:
        return `数据验证失败: ${this.message}`
      case ErrorCode.CREATE_FAILED:
        return `创建失败: ${this.message}`
      case ErrorCode.UPDATE_FAILED:
        return `更新失败: ${this.message}`
      case ErrorCode.DELETE_FAILED:
        return `删除失败: ${this.message}`
      default:
        return this.message
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    }
  }
}

/**
 * 错误处理函数 - 将任意错误转换为 AppError
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorCode.UNKNOWN,
      error.message,
      { originalError: error.name }
    )
  }

  if (typeof error === 'string') {
    return new AppError(ErrorCode.UNKNOWN, error)
  }

  return new AppError(
    ErrorCode.UNKNOWN,
    '发生了未知错误',
    { originalError: String(error) }
  )
}

/**
 * 同步 try-catch 包装
 */
export function tryCatch<T>(
  fn: () => T,
  onError?: (error: AppError) => void
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    const appError = handleError(error)
    onError?.(appError)
    return { success: false, error: appError.getUserMessage() }
  }
}

/**
 * 异步 try-catch 包装
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const appError = handleError(error)
    onError?.(appError)
    return { success: false, error: appError.getUserMessage() }
  }
}
