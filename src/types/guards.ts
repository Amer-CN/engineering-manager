/**
 * 类型守卫函数库
 * 
 * 提供类型安全的类型守卫函数，用于运行时类型检查
 */

import type {
  Project,
  Member,
  Material,
  Expense,
  Drawing,
  Partner,
  Invoice,
  WorkerTeam,
  Settlement,
  InventoryItem,
} from './electron.d'

// ═══════════════════════════════════════════════════════════════════════════════
// 基础类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export function isString(val: unknown): val is string {
  return typeof val === 'string'
}

export function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val)
}

export function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean'
}

export function isDateString(val: unknown): val is string {
  if (!isString(val)) return false
  const date = new Date(val)
  return !isNaN(date.getTime())
}

export function isArray<T>(val: unknown, guard: (item: unknown) => item is T): val is T[] {
  return Array.isArray(val) && val.every(guard)
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 实体类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Project 类型守卫
 */
export function isProject(val: unknown): val is Project {
  if (!isObject(val)) return false
  const p = val as Record<string, unknown>
  
  return (
    isNumber(p.id) &&
    isString(p.name) &&
    ['planning', 'in_progress', 'completed', 'archived'].includes(p.status as string)
  )
}

/**
 * Member 类型守卫
 */
export function isMember(val: unknown): val is Member {
  if (!isObject(val)) return false
  const m = val as Record<string, unknown>
  
  return (
    isNumber(m.id) &&
    isString(m.name) &&
    ['staff', 'worker'].includes(m.memberType as string)
  )
}

/**
 * Material 类型守卫
 */
export function isMaterial(val: unknown): val is Material {
  if (!isObject(val)) return false
  const m = val as Record<string, unknown>
  
  return (
    isNumber(m.id) &&
    isNumber(m.projectId) &&
    isString(m.name)
  )
}

/**
 * Expense 类型守卫
 */
export function isExpense(val: unknown): val is Expense {
  if (!isObject(val)) return false
  const e = val as Record<string, unknown>
  
  return (
    isNumber(e.id) &&
    isNumber(e.projectId) &&
    isNumber(e.amount)
  )
}

/**
 * Drawing 类型守卫
 */
export function isDrawing(val: unknown): val is Drawing {
  if (!isObject(val)) return false
  const d = val as Record<string, unknown>
  
  return (
    isNumber(d.id) &&
    isNumber(d.projectId) &&
    isString(d.name) &&
    isString(d.filePath)
  )
}

/**
 * Partner 类型守卫
 */
export function isPartner(val: unknown): val is Partner {
  if (!isObject(val)) return false
  const p = val as Record<string, unknown>
  
  return (
    isNumber(p.id) &&
    isString(p.name) &&
    isString(p.category)
  )
}

/**
 * Contract 类型守卫
 */
export function isContract(val: unknown): val is { id: number; name: string; status: string } {
  if (!isObject(val)) return false
  const c = val as Record<string, unknown>
  
  return (
    isNumber(c.id) &&
    isString(c.name) &&
    ['draft', 'pending', 'active', 'expired', 'terminated', 'archived'].includes(c.status as string)
  )
}

/**
 * Invoice 类型守卫
 */
export function isInvoice(val: unknown): val is Invoice {
  if (!isObject(val)) return false
  const i = val as Record<string, unknown>
  
  return (
    isNumber(i.id) &&
    isString(i.invoiceNo) &&
    ['invoice_in', 'invoice_out'].includes(i.type as string)
  )
}

/**
 * WorkerTeam 类型守卫
 */
export function isWorkerTeam(val: unknown): val is WorkerTeam {
  if (!isObject(val)) return false
  const t = val as Record<string, unknown>
  
  return (
    isNumber(t.id) &&
    isString(t.name) &&
    isNumber(t.projectId)
  )
}

/**
 * Settlement 类型守卫
 */
export function isSettlement(val: unknown): val is Settlement {
  if (!isObject(val)) return false
  const s = val as Record<string, unknown>
  
  return (
    isNumber(s.id) &&
    isString(s.settlementNo) &&
    ['income', 'expense'].includes(s.type as string)
  )
}

/**
 * InventoryItem 类型守卫
 */
export function isInventoryItem(val: unknown): val is InventoryItem {
  if (!isObject(val)) return false
  const i = val as Record<string, unknown>
  
  return (
    isNumber(i.id) &&
    isString(i.code) &&
    isString(i.name)
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 数组类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export function isProjectArray(val: unknown): val is Project[] {
  return isArray(val, isProject)
}

export function isMemberArray(val: unknown): val is Member[] {
  return isArray(val, isMember)
}

export function isExpenseArray(val: unknown): val is Expense[] {
  return isArray(val, isExpense)
}

export function isPartnerArray(val: unknown): val is Partner[] {
  return isArray(val, isPartner)
}

export function isInvoiceArray(val: unknown): val is Invoice[] {
  return isArray(val, isInvoice)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result 类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E }

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出所有守卫
// ═══════════════════════════════════════════════════════════════════════════════

export const Guards = {
  // 基础
  isString,
  isNumber,
  isBoolean,
  isDateString,
  isArray,
  isObject,
  
  // 实体
  isProject,
  isMember,
  isMaterial,
  isExpense,
  isDrawing,
  isPartner,
  isContract,
  isInvoice,
  isWorkerTeam,
  isSettlement,
  isInventoryItem,
  
  // 数组
  isProjectArray,
  isMemberArray,
  isExpenseArray,
  isPartnerArray,
  isInvoiceArray,
  
  // Result
  isSuccess,
  isFailure,
} as const

export default Guards
