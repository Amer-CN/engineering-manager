/**
 * 公共类型定义
 *
 * 包含 Result 类型、Error 类型等通用类型定义
 */

export type { Result, VoidResult, PaginatedResult } from './Result'

export {
  isSuccess,
  isFailure,
  ok,
  err,
} from './Result'

export type { Option } from './Result'

export {
  some,
  none,
  isSome,
  isNone,
} from './Result'

export {
  AppError,
  ErrorCode,
  handleError,
  tryCatch,
  tryCatchAsync,
} from './Error'
