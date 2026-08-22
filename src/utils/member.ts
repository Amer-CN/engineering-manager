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

/**
 * 按出生日期精确计算周岁年龄（年月日比较，与日历一致）
 */
export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
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
