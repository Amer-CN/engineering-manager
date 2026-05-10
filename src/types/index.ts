/**
 * 类型定义入口文件
 * 
 * 统一导出所有类型定义
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 导出 electron.d.ts 中的所有类型
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // 项目管理
  Project,
  Task,
  Material,
  Expense,
  CostLedgerEntry,
  CostLedgerSummary,
  CostLedgerCategory,
  Drawing,
  
  // 人员管理
  Member,
  MemberType,
  WorkerType,
  WorkerTeam,
  WorkerTransferRecord,
  WorkerStatus,
  
  // 合作单位
  Partner,
  PartnerCategory,
  Region,
  Supervisor,
  SupervisorCategory,
  
  // 合同管理
  ContractStatus,
  PaymentMethod,
  IncomeContract,
  IncomeRecord,
  ExpenseContract,
  ExpenseRecord,
  ContractStats,
  ContractExpiringItem,
  
  // 结算办理
  Settlement,
  SettlementStatus,
  SettlementType,
  SettlementItem,
  
  // 合同模板
  ContractTemplate,
  TemplateType,
  TemplateVariable,

  // 模板管理（新版）
  Template,
  TemplateCategory,
  
  // 进销存
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  
  // 发票管理
  Invoice,
  InvoiceType,
  InvoiceStatus,
  InvoiceTaxRate,
  InvoiceKind,
  InvoiceItem,
  InvoicePaymentDetail,
  PaymentRecord,
  
  // 统计
  DashboardStats,

  // 考勤管理
  AttendanceRecord,
  DayStatus,

  // 工资管理
  WageRecord,
  WageStats,

  // Electron API
  ElectronAPI,
} from './electron.d'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出公共类型
// ═══════════════════════════════════════════════════════════════════════════════

export type { Result, VoidResult, PaginatedResult } from './common/Result'
export type { Option } from './common/Result'

export { 
  isSuccess, 
  isFailure, 
  ok, 
  err,
  some,
  none,
  isSome,
  isNone,
} from './common/Result'

export { 
  AppError, 
  ErrorCode, 
  handleError,
  tryCatch,
  tryCatchAsync,
} from './common/Error'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export {
  Guards,
  isString,
  isNumber,
  isBoolean,
  isDateString,
  isArray,
  isObject,
  isProject,
  isMember,
  isTask,
  isMaterial,
  isExpense,
  isDrawing,
  isPartner,
  isContract,
  isInvoice,
  isWorkerTeam,
  isSettlement,
  isInventoryItem,
  isProjectArray,
  isMemberArray,
  isTaskArray,
  isExpenseArray,
  isPartnerArray,
  isInvoiceArray,
} from './guards'

// ═══════════════════════════════════════════════════════════════════════════════
// 常用类型别名
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 实体 ID 类型
 */
export type EntityId = number

/**
 * 日期字符串 (ISO 格式)
 */
export type DateString = string

/**
 * 可空类型
 */
export type Nullable<T> = T | null

/**
 * 可选类型
 */
export type Optional<T> = T | undefined


/**
 * 记录类型
 */
export type Record<K extends keyof any, V> = {
  [P in K]: V
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出路由类型
// ═══════════════════════════════════════════════════════════════════════════════

export type { RouteConfig } from './router'
export type { PageId, ContractView, RouteMeta } from '../routes'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出权限类型
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SYSTEM_ROLES,
  getUserRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  hasRole,
  isAuthenticated,
  getCurrentUser,
  setCurrentUser,
} from './permissions'

export type {
  Permission,
  PermissionAction,
  PermissionResource,
  PermissionCode,
  Role,
  SystemRole,
  AuthContext,
} from './permissions'
