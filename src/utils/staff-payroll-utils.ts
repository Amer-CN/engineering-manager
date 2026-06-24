/**
 * 员工薪酬辅助函数
 */
import { computeAttendanceSummary } from '../constants/attendance'
import type { Member, AttendanceRecord } from '@/types'

/** 获取入职日期（优先 entryDate，回退到 createdAt） */
export function getEntryDate(s: Member): string | null {
  return s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null)
}

/** 某月份最后一天 YYYY-MM-DD */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${ym}-${String(d).padStart(2, '0')}`
}

/** 筛选符合条件的在职员工（用于生成薪酬） */
export function filteredStaffForGenerate(
  staff: Member[],
  filterDept: number | '',
  ym: string
): Member[] {
  const me = monthEnd(ym)
  const ms = `${ym}-01`
  return staff.filter((s) => {
    if (filterDept && (s.departmentId ?? -1) !== filterDept) return false
    const ed = getEntryDate(s)
    if (ed && ed > me) return false             // 尚未入职
    if (s.leaveDate && !s.reentryDate && s.leaveDate < ms) return false
    if (s.leaveDate && s.reentryDate && s.leaveDate < ms && s.reentryDate > me) return false
    return true
  })
}

/** 获取指定员工某月份的考勤记录 */
export function getAttendanceForMember(
  attendances: AttendanceRecord[],
  memberId: number,
  ym: string
): AttendanceRecord | undefined {
  return attendances.find((a) => a.memberId === memberId && a.yearMonth === ym)
}

/** 考勤是否已填写（至少有 dailyStatus） */
export function isAttendanceReady(memberId: number, ym: string, attendances: AttendanceRecord[]): boolean {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return false
  if (!att.dailyStatus || Object.keys(att.dailyStatus).length === 0) return false
  return true
}

/** 计算某员工某月份考勤天数 */
export function computeWorkDays(
  attendances: AttendanceRecord[],
  memberId: number,
  ym: string,
  entryDay: number
): { workDays: number; daysOff: number } {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return { workDays: 0, daysOff: 0 }
  const wd = new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate()
  return computeAttendanceSummary(att?.dailyStatus, wd, entryDay)
}
