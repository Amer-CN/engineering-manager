import type { DayStatus } from '../types/electron'

export const UNSET_COLOR = 'bg-[color:var(--panel-2)] text-[color:var(--muted)]'

export interface StatusMeta {
  key: DayStatus | undefined
  label: string
  color: string
}

export const STATUS_META: StatusMeta[] = [
  { key: undefined, label: '未设', color: UNSET_COLOR },
  { key: 'work', label: '出勤', color: 'bg-success-100 text-success-700' },
  { key: 'holiday', label: '法定假', color: 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]' },
  { key: 'sick_leave', label: '病假', color: 'bg-warning-100 text-warning-700' },
  { key: 'personal_leave', label: '事假', color: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' },

]

export const summaryDot: Record<DayStatus, string> = {
  work: 'bg-success-500', holiday: 'bg-[color:var(--muted)]', sick_leave: 'bg-warning-500',
  personal_leave: 'bg-[color:var(--accent)]',
}

export const summaryLabel: Record<DayStatus, string> = {
  work: '出勤', holiday: '法定假', sick_leave: '病假', personal_leave: '事假',
}

export function computeAttendanceSummary(
  dailyStatus: Record<number, DayStatus> | undefined,
  daysInMonth: number,
  startDay: number = 1
): { counts: Record<DayStatus, number>; workDays: number; daysOff: number; applicableDays: number } {
  const counts: Record<DayStatus, number> = { work: 0, holiday: 0, sick_leave: 0, personal_leave: 0 }
  if (!dailyStatus) return { counts, workDays: 0, daysOff: 0, applicableDays: 0 }
  for (let d = startDay; d <= daysInMonth; d++) {
    const s = dailyStatus[d] || 'work'
    counts[s]++
  }
  const workDays = counts.work + counts.holiday
  const daysOff = counts.sick_leave + counts.personal_leave
  const applicableDays = daysInMonth - startDay + 1
  return { counts, workDays, daysOff, applicableDays }
}
