/**
 * 考勤 IPC 处理器（双写模式）
 * 支持每日考勤状态（出勤/法定节假日/病假/事假/缺勤）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { getDaysInMonth, generateDailyStatus, computeFromDailyStatus, getEntryDay, enrichAttendance, DayStatus } from './attendance-utils'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, attendanceQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 获取考勤列表
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:getAll', (_, projectId?: number, yearMonth?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = attendanceQueries.listAttendances(projectId, yearMonth)
    if (data) {
      // 富化名称信息（SQLite 读取的行不含这些字段）
      const enriched = data.map(a => enrichAttendance(a, db))
      return { success: true, data: enriched.sort((a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )}
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.attendances) db.attendances = []
  let records = db.attendances
  if (projectId) records = records.filter((a: any) => a.projectId === projectId)
  if (yearMonth) records = records.filter((a: any) => a.yearMonth === yearMonth)
  const result = records.map((a: any) => enrichAttendance(a, db))
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )}
})

// ═══════════════════════════════════════════════════════════════════════════════
// 按成员查询考勤
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:getByMember', (_, memberId: number, yearMonth?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  if (useSqliteRead()) {
    const data = attendanceQueries.listAttendancesByMember(memberId, yearMonth)
    if (data) return { success: true, data }
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.attendances) db.attendances = []
  let records = db.attendances.filter((a: any) => a.memberId === memberId)
  if (yearMonth) records = records.filter((a: any) => a.yearMonth === yearMonth)
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
    const now = new Date().toISOString()
    const newRecord = { ...record, id, createdAt: now, updatedAt: now }
    db.attendances.push(newRecord)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      attendanceQueries.createAttendance(newRecord)
    }

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

    if (useSqliteWrite()) attendanceQueries.deleteAttendance(id)

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

    if (useSqliteWrite()) attendanceQueries.batchDeleteAttendances(ids)

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

      let workDays = record.workDays ?? existing.workDays
      let daysOff = record.daysOff ?? existing.daysOff
      let isFullAttendance = record.isFullAttendance ?? existing.isFullAttendance

      if (record.dailyStatus) {
        const startDay = getEntryDay(existing.memberId, record.yearMonth || existing.yearMonth, db.members)
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

      if (record.dailyStatus) {
        updated.dailyStatus = record.dailyStatus
      }

      db.attendances[index] = updated
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        const changes: any = { ...record, workDays, daysOff, isFullAttendance }
        if (record.dailyStatus) changes.dailyStatus = record.dailyStatus
        attendanceQueries.updateAttendance(record.id, changes)
      }
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
      // 检查去重
      if (useSqliteRead()) {
        const exists = attendanceQueries.existsAttendance(record.memberId, record.projectWorkerId, record.projectId, record.yearMonth)
        if (exists === true) continue
      } else {
        const exists = db.attendances.some(
          (a: any) => a.memberId === record.memberId && a.projectId === record.projectId && a.yearMonth === record.yearMonth
        )
        if (exists) continue
      }

      const id = Date.now() + created
      const newRecord = { ...record, id, createdAt: now, updatedAt: now }
      db.attendances.push(newRecord)

      // SQLite 双写
      if (useSqliteWrite()) {
        attendanceQueries.createAttendance(newRecord)
      }

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
      // 去重检查
      if (useSqliteRead()) {
        const exists = attendanceQueries.existsAttendance(memberId, null, projectId, yearMonth)
        if (exists === true) continue
      } else {
        const exists = db.attendances.some(
          (a: any) => a.memberId === memberId && a.projectId === projectId && a.yearMonth === yearMonth
        )
        if (exists) continue
      }

      const member = db.members.find((m: any) => m.id === memberId)
      const isStaff = member?.memberType === 'staff'
      const dailyStatus = generateDailyStatus(yearMonth, isStaff)
      const startDay = getEntryDay(memberId, yearMonth, db.members)
      const computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay)

      const newRecord = {
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
      }
      db.attendances.push(newRecord)

      // SQLite 双写
      if (useSqliteWrite()) {
        attendanceQueries.createAttendance(newRecord)
      }

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

      // 去重检查
      if (useSqliteRead()) {
        const exists = attendanceQueries.existsAttendance(null, pwId, projectId, yearMonth)
        if (exists === true) continue
      } else {
        const exists = db.attendances.some(
          (a: any) => a.projectWorkerId === pwId && a.yearMonth === yearMonth
        )
        if (exists) continue
      }

      const dailyStatus = generateDailyStatus(yearMonth, false)
      const startDay = pw.workerId ? getEntryDay(pw.workerId, yearMonth, db.members) : 1
      const computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay)

      const newRecord = {
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
      }
      db.attendances.push(newRecord)

      // SQLite 双写
      if (useSqliteWrite()) {
        attendanceQueries.createAttendance(newRecord)
      }

      created++
    }

    if (created > 0) saveDatabase()
    return { success: true, data: { count: created } }
  } catch (error: any) {
    log.error('Failed to generate default attendances V2:', error)
    return { success: false, error: error.message }
  }
})
