import type { DayStatus } from '../types/electron'

export const UNSET_COLOR = 'bg-slate-50 text-slate-400'

export interface StatusMeta {
  key: DayStatus | undefined
  label: string
  color: string
}

export const STATUS_META: StatusMeta[] = [
  { key: undefined, label: '未设', color: UNSET_COLOR },
  { key: 'work', label: '出勤', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'holiday', label: '法定假', color: 'bg-blue-100 text-blue-700' },
  { key: 'sick_leave', label: '病假', color: 'bg-amber-100 text-amber-700' },
  { key: 'personal_leave', label: '事假', color: 'bg-orange-100 text-orange-700' },
  { key: 'absent', label: '缺勤', color: 'bg-red-100 text-red-700' },
]

export const summaryDot: Record<DayStatus, string> = {
  work: 'bg-emerald-500', holiday: 'bg-blue-500', sick_leave: 'bg-amber-500',
  personal_leave: 'bg-orange-500', absent: 'bg-red-500',
}

export const summaryLabel: Record<DayStatus, string> = {
  work: '出勤', holiday: '法定假', sick_leave: '病假', personal_leave: '事假', absent: '缺勤',
}

export function computeAttendanceSummary(
  dailyStatus: Record<number, DayStatus> | undefined,
  daysInMonth: number,
  startDay: number = 1
): { counts: Record<DayStatus, number>; workDays: number; daysOff: number; applicableDays: number } {
  const counts: Record<DayStatus, number> = { work: 0, holiday: 0, sick_leave: 0, personal_leave: 0, absent: 0 }
  if (!dailyStatus) return { counts, workDays: 0, daysOff: 0, applicableDays: 0 }
  for (let d = startDay; d <= daysInMonth; d++) {
    const s = dailyStatus[d] || 'work'
    counts[s]++
  }
  const workDays = counts.work + counts.holiday
  const daysOff = counts.sick_leave + counts.personal_leave + counts.absent
  const applicableDays = daysInMonth - startDay + 1
  return { counts, workDays, daysOff, applicableDays }
}
