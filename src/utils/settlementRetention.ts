import type { RetentionStatus } from '@/types/electron'
import { formatDate } from './date'

/**
 * JS03 质保金到期派生（业务口径，纯前端）：
 * - released 显式写，最高优先（到期也不改判）
 * - NULL/空 = 无质保 → null（不显示徽标）
 * - retentionDueDate < 今天 → due_to_collect（已到期待收）
 * - 其余 → 存储态原值（缺状态但有到期日时按 in_warranty）
 *
 * 日期按 YYYY-MM-DD 字典序比较（与 normalizeDate/formatDate 同口径）。
 */
export type RetentionDisplayStatus = RetentionStatus

export const retentionStatusLabel: Record<RetentionDisplayStatus, string> = {
  in_warranty: '质保期内',
  due_to_collect: '已到期待收',
  released: '已释放',
}

export function getRetentionDisplayStatus(
  status: RetentionStatus | string | null | undefined,
  dueDate: string | null | undefined,
  todayStr?: string,
): RetentionDisplayStatus | null {
  const s = (status ?? '') as string
  const d = (dueDate ?? '').trim()
  if (!s && !d) return null
  if (s === 'released') return 'released'
  const today = todayStr ?? formatDate(new Date())
  // 仅标准 YYYY-MM-DD 做派生；脏格式不误判，原样回落存储态
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && /^\d{4}-\d{2}-\d{2}$/.test(today) && d < today) {
    return 'due_to_collect'
  }
  if (s === 'in_warranty' || s === 'due_to_collect' || s === 'released') {
    return s as RetentionDisplayStatus
  }
  // 有到期日但无状态 → 视为质保期内（未到期分支已排除过去日期）
  if (d) return 'in_warranty'
  return null
}

export function getRetentionStatusLabel(
  status: RetentionStatus | string | null | undefined,
  dueDate: string | null | undefined,
  todayStr?: string,
): string | null {
  const display = getRetentionDisplayStatus(status, dueDate, todayStr)
  return display ? retentionStatusLabel[display] : null
}
