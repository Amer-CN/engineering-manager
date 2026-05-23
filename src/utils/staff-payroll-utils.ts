/**
 * 员工薪酬辅助函数
 */
import { computeAttendanceSummary } from '../constants/attendance'

/** 获取入职日期（优先 entryDate，回退到 createdAt） */
export function getEntryDate(s: any): string | null {
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
  staff: any[],
  filterDept: number | '',
  ym: string
): any[] {
  const me = monthEnd(ym)
  const ms = `${ym}-01`
  return staff.filter((s: any) => {
    if (filterDept && s.departmentId !== filterDept) return false
    const ed = getEntryDate(s)
    if (ed && ed > me) return false             // 尚未入职
    if (s.leaveDate && !s.reentryDate && s.leaveDate < ms) return false
    if (s.leaveDate && s.reentryDate && s.leaveDate < ms && s.reentryDate > me) return false
    return true
  })
}

/** 获取指定员工某月份的考勤记录 */
export function getAttendanceForMember(
  attendances: any[],
  memberId: number,
  ym: string
): any | undefined {
  return attendances.find((a: any) => a.memberId === memberId && a.yearMonth === ym)
}

/** 考勤是否已填写（至少有 dailyStatus） */
export function isAttendanceReady(memberId: number, ym: string, attendances: any[]): boolean {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return false
  if (!att.dailyStatus || Object.keys(att.dailyStatus).length === 0) return false
  return true
}

/** 计算某员工某月份考勤天数 */
export function computeWorkDays(
  attendances: any[],
  memberId: number,
  ym: string,
  entryDay: number
): { workDays: number; daysOff: number } {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return { workDays: 0, daysOff: 0 }
  const wd = new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate()
  return computeAttendanceSummary(att?.dailyStatus, wd, entryDay)
}
