/**
 * 考勤 IPC 处理器
 * 支持每日考勤状态（出勤/法定节假日/病假/事假/缺勤）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

type DayStatus = 'work' | 'holiday' | 'sick_leave' | 'personal_leave' | 'absent'

/**
 * 生成默认每日考勤状态
 * 管理人员：前4天默认"法定节假日"（近似周末），其余"出勤"
 * 工人：全部默认"出勤"
 */
function generateDailyStatus(yearMonth: string, _isStaff: boolean): Record<number, DayStatus> {
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
function computeFromDailyStatus(
  dailyStatus: Record<number, DayStatus>,
  daysInMonth: number,
  startDay: number = 1
): { workDays: number; daysOff: number; isFullAttendance: boolean; applicableDays: number } {
  let workDays = 0
  let daysOff = 0
  for (let d = startDay; d <= daysInMonth; d++) {
    const s = dailyStatus[d] || 'work'
    if (s === 'work' || s === 'holiday') workDays++
    if (s === 'sick_leave' || s === 'personal_leave' || s === 'absent') daysOff++
  }
  const applicableDays = daysInMonth - startDay + 1
  return { workDays, daysOff, isFullAttendance: daysOff <= 4, applicableDays }
}

function getEntryDay(memberId: number, yearMonth: string): number {
  if (!db.members) return 1
  const member = db.members.find((m: any) => m.id === memberId)
  if (!member?.entryDate) return 1
  const [ey, em, ed2] = member.entryDate.split('-').map(Number)
  const [cy, cm] = yearMonth.split('-').map(Number)
  return (ey === cy && em === cm) ? ed2 : 1
}

// ═══════════════════════════════════════════════════════════════════════════════
// 获取考勤列表
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:getAll', (_, projectId?: number, yearMonth?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  let records = db.attendances
  if (projectId) {
    records = records.filter((a: any) => a.projectId === projectId)
  }
  if (yearMonth) {
    records = records.filter((a: any) => a.yearMonth === yearMonth)
  }
  const result = records.map((a: any) => {
    const member = db.members.find((m: any) => m.id === a.memberId)
    return {
      ...a,
      memberName: member?.name || '',
      memberType: member?.memberType || 'worker'
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )}
})

// ═══════════════════════════════════════════════════════════════════════════════
// 按成员查询考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:getByMember', (_, memberId: number, yearMonth?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  let records = db.attendances.filter((a: any) => a.memberId === memberId)
  if (yearMonth) {
    records = records.filter((a: any) => a.yearMonth === yearMonth)
  }
  return { success: true, data: records }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 创建单条考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  try {
    const id = Date.now()
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.attendances.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create attendance:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 删除考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  try {
    db.attendances = db.attendances.filter((a: any) => a.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete attendance:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 批量删除考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:batchDelete', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  try {
    const idSet = new Set(ids)
    db.attendances = db.attendances.filter((a: any) => !idSet.has(a.id))
    saveDatabase()
    return { success: true, data: { deleted: ids.length } }
  } catch (error: any) {
    log.error('Failed to batch delete attendances:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 更新考勤（支持 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:update', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.attendances) db.attendances = []
  try {
    const index = db.attendances.findIndex((a: any) => a.id === record.id)
    if (index !== -1) {
      const existing = db.attendances[index]
      const daysInMonth = getDaysInMonth(record.yearMonth || existing.yearMonth)

      // 如果传入了 dailyStatus，从它计算 workDays/daysOff/isFullAttendance
      let workDays = record.workDays ?? existing.workDays
      let daysOff = record.daysOff ?? existing.daysOff
      let isFullAttendance = record.isFullAttendance ?? existing.isFullAttendance

      if (record.dailyStatus) {
        const startDay = getEntryDay(existing.memberId, record.yearMonth || existing.yearMonth)
        const computed = computeFromDailyStatus(record.dailyStatus, daysInMonth, startDay)
        workDays = computed.workDays
        daysOff = computed.daysOff
        isFullAttendance = computed.isFullAttendance
      }

      const updated = {
        ...existing,
        ...record,
        workDays,
        daysOff,
        isFullAttendance,
        updatedAt: new Date().toISOString()
      }

      // 确保 dailyStatus 合并（而非全量替换丢失旧数据）
      if (record.dailyStatus) {
        updated.dailyStatus = { ...(existing.dailyStatus || {}), ...record.dailyStatus }
      }

      db.attendances[index] = updated
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update attendance:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 批量创建考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:batchCreate', (_, records: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.attendances) db.attendances = []
    const now = new Date().toISOString()
    let created = 0
    for (const record of records) {
      const exists = db.attendances.some(
        (a: any) => a.memberId === record.memberId && a.projectId === record.projectId && a.yearMonth === record.yearMonth
      )
      if (exists) continue
      const id = Date.now() + created
      db.attendances.push({
        ...record,
        id,
        createdAt: now,
        updatedAt: now
      })
      created++
    }
    if (created > 0) saveDatabase()
    return { success: true, data: { count: created } }
  } catch (error: any) {
    log.error('Failed to batch create attendances:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 生成默认考勤（含 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:generateDefaults', (_, projectId: number, yearMonth: string, memberIds: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.attendances) db.attendances = []
    const daysInMonth = getDaysInMonth(yearMonth)
    const now = new Date().toISOString()
    let created = 0

    for (const memberId of memberIds) {
      const exists = db.attendances.some(
        (a: any) => a.memberId === memberId && a.projectId === projectId && a.yearMonth === yearMonth
      )
      if (exists) continue

      const member = db.members.find((m: any) => m.id === memberId)
      const isStaff = member?.memberType === 'staff'
      const dailyStatus = generateDailyStatus(yearMonth, isStaff)
      const startDay = getEntryDay(memberId, yearMonth)
      const computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay)

      db.attendances.push({
        id: Date.now() + created,
        memberId,
        projectId,
        yearMonth,
        workDays: computed.workDays,
        daysOff: computed.daysOff,
        isFullAttendance: computed.isFullAttendance,
        dailyStatus,
        createdAt: now,
        updatedAt: now
      })
      created++
    }

    if (created > 0) saveDatabase()
    return { success: true, data: { count: created } }
  } catch (error: any) {
    log.error('Failed to generate default attendances:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 生成默认考勤 V2（支持 projectWorkerId — worker 专用）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:generateDefaultsV2', (_, projectId: number, yearMonth: string, projectWorkerIds: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.attendances) db.attendances = []; if (!db.projectWorkers) db.projectWorkers = []
    const daysInMonth = getDaysInMonth(yearMonth)
    const now = new Date().toISOString()
    let created = 0

    for (const pwId of projectWorkerIds) {
      const pw = db.projectWorkers.find((p: any) => p.id === pwId)
      if (!pw || pw.status === 'left') continue

      const exists = db.attendances.some(
        (a: any) => a.projectWorkerId === pwId && a.yearMonth === yearMonth
      )
      if (exists) continue

      const dailyStatus = generateDailyStatus(yearMonth, false)
      const startDay = pw.workerId ? getEntryDay(pw.workerId, yearMonth) : 1
      const computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay)

      db.attendances.push({
        id: Date.now() + created,
        memberId: undefined,
        projectWorkerId: pwId,
        projectId,
        yearMonth,
        workDays: computed.workDays,
        daysOff: computed.daysOff,
        isFullAttendance: computed.isFullAttendance,
        dailyStatus,
        createdAt: now,
        updatedAt: now
      })
      created++
    }

    if (created > 0) saveDatabase()
    return { success: true, data: { count: created } }
  } catch (error: any) {
    log.error('Failed to generate default attendances V2:', error)
    return { success: false, error: error.message }
  }
})
