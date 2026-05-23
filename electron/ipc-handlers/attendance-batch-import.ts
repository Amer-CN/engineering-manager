/**
 * 考勤批量导入 IPC 处理器（双写模式）
 * 从 attendance.ts 拆分
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { getDaysInMonth, DayStatus } from './attendance-utils'
import { useSqliteRead, useSqliteWrite, attendanceQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 批量导入考勤（Excel 导入 — 按出勤天数生成 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:attendances:batchImport', (_, projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.attendances) db.attendances = []
    if (!db.projectWorkers) db.projectWorkers = []
    const daysInMonth = getDaysInMonth(yearMonth)
    const now = new Date().toISOString()
    let created = 0
    let updated = 0

    for (const rec of records) {
      const pw = db.projectWorkers.find((p: any) => p.id === rec.projectWorkerId)
      if (!pw || pw.status === 'left') continue

      const workDays = Math.min(Math.max(0, rec.workDays), daysInMonth)

      // Build dailyStatus
      const dailyStatus: Record<number, DayStatus> = {}
      for (let d = 1; d <= workDays; d++) {
        dailyStatus[d] = 'work'
      }

      // Check if existing record for this projectWorker + yearMonth
      const existingIdx = db.attendances.findIndex(
        (a: any) => a.projectWorkerId === rec.projectWorkerId && a.yearMonth === yearMonth
      )

      if (existingIdx !== -1) {
        const existing = db.attendances[existingIdx]
        const merged: Record<number, string> = {}
        for (const [day, status] of Object.entries(existing.dailyStatus || {})) {
          if (status !== 'work') merged[Number(day)] = status as string
        }
        for (let d = 1; d <= workDays; d++) merged[d] = 'work'
        const updatedRecord = {
          ...existing,
          dailyStatus: merged,
          workDays,
          daysOff: 0,
          isFullAttendance: false,
          updatedAt: now,
        }
        db.attendances[existingIdx] = updatedRecord

        // SQLite 双写
        if (useSqliteWrite()) {
          attendanceQueries.updateAttendance(existing.id, {
            dailyStatus: merged,
            workDays,
            daysOff: 0,
            isFullAttendance: false,
          })
        }

        updated++
      } else {
        const id = Date.now() + created
        const newRecord = {
          id,
          memberId: undefined,
          projectWorkerId: rec.projectWorkerId,
          projectId,
          yearMonth,
          workDays,
          daysOff: 0,
          isFullAttendance: false,
          dailyStatus,
          createdAt: now,
          updatedAt: now,
        }
        db.attendances.push(newRecord)

        // SQLite 双写
        if (useSqliteWrite()) {
          attendanceQueries.createAttendance(newRecord)
        }

        created++
      }
    }

    if (created > 0 || updated > 0) saveDatabase()
    return { success: true, data: { created, updated } }
  } catch (error: any) {
    log.error('Failed to batch import attendances:', error)
    return { success: false, error: error.message }
  }
})
