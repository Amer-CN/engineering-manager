/**
 * 成员相关工具函数
 * 常量已移至 src/constants/member.ts
 */

import {
  workerTypes,
  staffRoles,
  genders,
  politicalStatuses,
  maritalStatuses,
  memberStatuses,
  educationLevels,
  ethnicities
} from '../constants/member'
import type {
  WorkerType,
  StaffRole
} from '../constants/member'

/**
 * 获取工人类型标签
 */
export function getWorkerTypeLabel(type: string | undefined | null): string {
  if (!type) return '未知'
  const found = workerTypes.find(t => t.value === type)
  return found?.label || type
}

/**
 * 获取角色标签
 */
export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return '未知'
  const found = staffRoles.find(r => r.value === role)
  return found?.label || role
}

// 重新导出常量，保持向后兼容
export {
  workerTypes,
  staffRoles,
  genders,
  politicalStatuses,
  maritalStatuses,
  memberStatuses,
  educationLevels,
  ethnicities
}
