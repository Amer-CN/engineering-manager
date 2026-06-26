/**
 * 审计日志模块 — Barrel Export
 * 所有外部 import '@/utils/audit' 或 '../utils/audit' 保持不变
 */

// ─── 类型 re-export ───
export type { AuditAction, AuditLevel, AuditLog, AuditLogQuery, AuditLogResult } from './types'

// ─── 日志记录 re-export ───
export {
  setCurrentAuditUser,
  logAudit,
  logCreate,
  logUpdate,
  logDelete,
  logExport,
  logImport,
  logLogin,
  logLogout,
  logApprove,
  logLock,
  logUnlock,
} from './logger'

// ─── 查询 re-export ───
export { queryAuditLogs } from './query'

// ─── 统计 re-export ───
export { getAuditStats } from './stats'
export type { AuditStats } from './stats'

// ─── 导出 re-export ───
export { exportAuditLogsToJson, exportAuditLogsToCsv } from './export'

// ─── 清理 re-export ───
export { clearOldLogs, clearAllLogs } from './cleanup'
