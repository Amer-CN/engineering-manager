/**
 * 考勤工具函数
 * 从 attendance.ts 拆分，供多个 handler 共用
 */

export type DayStatus = 'work' | 'holiday' | 'sick_leave' | 'personal_leave' | 'unset'

export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/**
 * 生成默认每日考勤状态
 * 管理人员：前4天默认"法定节假日"（近似周末），其余"出勤"
 * 工人：全部默认"出勤"
 */
export function generateDailyStatus(yearMonth: string, _isStaff: boolean): Record<number, DayStatus> {
  const daysInMonth = getDaysInMonth(yearMonth)
  const status: Record<number, DayStatus> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    status[d] = 'work'
  }
  return status
}

/**
 * 从每日状态计算汇总数据
 * 法定节假日不算缺勤（法定带薪），只计病假/事假/缺勤为"休假"
 * workDays 包含出勤+法定节假日（均为带薪日）
 */
export function computeFromDailyStatus(
  dailyStatus: Record<number, DayStatus>,
  daysInMonth: number,
  startDay: number = 1
): { workDays: number; daysOff: number; isFullAttendance: boolean; applicableDays: number } {
  let workDays = 0
  let daysOff = 0
  for (let d = startDay; d <= daysInMonth; d++) {
    const s = dailyStatus[d]
    if (!s) continue // 未定义的天不计入出勤/休假
    if (s === 'work' || s === 'holiday') workDays++
    if (s === 'sick_leave' || s === 'personal_leave') daysOff++
  }
  const applicableDays = daysInMonth - startDay + 1
  return { workDays, daysOff, isFullAttendance: daysOff <= 4, applicableDays }
}

export function getEntryDay(memberId: number, yearMonth: string, members: any[]): number {
  if (!members) return 1
  const member = members.find((m: any) => m.id === memberId)
  if (!member?.entryDate) return 1
  const [ey, em, ed2] = member.entryDate.split('-').map(Number)
  const [cy, cm] = yearMonth.split('-').map(Number)
  return (ey === cy && em === cm) ? ed2 : 1
}

/**
 * 富化考勤记录（添加 memberName/memberType/teamName/teamId）
 * db 由调用方传入，避免工具模块直接依赖全局 db
 */
export function enrichAttendance(a: any, db: any): any {
  let memberName = ''; let memberType = 'worker'; let teamName = ''; let teamId: number | null = null
  if (a.memberId) {
    const member = db.members.find((m: any) => m.id === a.memberId)
    memberName = member?.name || ''
    memberType = member?.memberType || 'worker'
    teamId = member?.teamId ?? null
    const team = db.workerTeams.find((t: any) => t.id === teamId)
    teamName = team?.name || ''
  } else if (a.projectWorkerId && db.projectWorkers) {
    const pw = db.projectWorkers.find((p: any) => p.id === a.projectWorkerId)
    if (pw && db.workers) {
      const worker = db.workers.find((w: any) => w.id === pw.workerId)
      memberName = worker?.name || ''
      teamId = pw.teamId ?? null
      const team = db.workerTeams?.find((t: any) => t.id === teamId)
      teamName = team?.name || ''
    }
  }
  return { ...a, memberName, memberType, teamName, teamId }
}
