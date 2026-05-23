/**
 * 项目用工关系 IPC 处理器（从 workers.ts 拆分）
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, workerQueries, salaryWageHistoryQueries } from '../sqlite/queries'
import { getAttendanceFirstDay, enrichProjectWorker } from './worker-utils'

// ═══════════════════════════════════════════════════════════════
// 项目用工关系 CRUD (db.projectWorkers)
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('db:projectWorkers:getAll', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先（但 attendance firstDay 推断在 JSON 侧更方便）
  if (useSqliteRead()) {
    const data = workerQueries.listProjectWorkers(projectId)
    if (data) {
      // 补充 attendance firstDay 推断（需要读取 dailyStatus）
      const attendanceFirstDay = new Map<number, string>()
      if (db.attendances) {
        for (const att of db.attendances) {
          if (!att.projectWorkerId) continue
          const pwid = att.projectWorkerId
          if (attendanceFirstDay.has(pwid)) continue
          const ds = att.dailyStatus || {}
          const days = Object.keys(ds).map(Number).filter(d => d > 0 && ds[d])
          if (days.length === 0) continue
          const firstDay = Math.min(...days)
          const firstDate = `${att.yearMonth}-${String(firstDay).padStart(2, '0')}`
          attendanceFirstDay.set(pwid, firstDate)
        }
      }
      for (const pw of data) {
        const actualEntryDate = attendanceFirstDay.get(pw.id) || pw.entryDate || ''
        pw.entryDate = actualEntryDate
      }
      return { success: true, data }
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.projectWorkers) db.projectWorkers = []
  const pws = db.projectWorkers.filter((pw: any) => pw.projectId === projectId)
  const attendanceFirstDay = new Map<number, string>()
  if (db.attendances) {
    for (const att of db.attendances) {
      if (!att.projectWorkerId) continue
      const pwid = att.projectWorkerId
      if (attendanceFirstDay.has(pwid)) continue
      const ds = att.dailyStatus || {}
      const days = Object.keys(ds).map(Number).filter(d => d > 0 && ds[d])
      if (days.length === 0) continue
      const firstDay = Math.min(...days)
      const firstDate = `${att.yearMonth}-${String(firstDay).padStart(2, '0')}`
      attendanceFirstDay.set(pwid, firstDate)
    }
  }
  const enriched = pws.map((pw: any) => {
    const enriched = enrichProjectWorker(pw, db)
    const actualEntryDate = attendanceFirstDay.get(pw.id) || pw.entryDate || ''
    enriched.entryDate = actualEntryDate
    return enriched
  })
  return { success: true, data: enriched.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:projectWorkers:create', (_, pw) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    if (pw.workerId && pw.projectId) {
      // 检查重复
      if (useSqliteRead()) {
        const exists = workerQueries.existsProjectWorker(pw.workerId, pw.projectId)
        if (exists === true) return { success: false, error: '该工人已在此项目中' }
      } else {
        const exists = db.projectWorkers.find((p: any) =>
          p.workerId === pw.workerId && p.projectId === pw.projectId
        )
        if (exists) return { success: false, error: '该工人已在此项目中' }
      }
    }
    const id = Date.now()
    const now = new Date().toISOString()
    const newPW = { ...pw, id, createdAt: now }
    db.projectWorkers.push(newPW)
    // 自动创建初始日工资历史
    let wageHistoryEntry: any = null
    if (pw.dailyWage && Number(pw.dailyWage) > 0 && pw.entryDate) {
      const entryMonth = pw.entryDate.length >= 7 ? pw.entryDate.slice(0, 7) : now.slice(0, 7)
      if (!db.wageHistory) db.wageHistory = []
      wageHistoryEntry = {
        id: Date.now() + 1,
        projectWorkerId: id,
        yearMonth: entryMonth,
        dailyWage: Number(pw.dailyWage),
        note: '初始工资',
        createdAt: now,
        updatedAt: now,
      }
      db.wageHistory.push(wageHistoryEntry)
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      workerQueries.createProjectWorker(newPW)
      if (wageHistoryEntry) {
        salaryWageHistoryQueries.saveWageHistory({
          projectWorkerId: id,
          yearMonth: wageHistoryEntry.yearMonth,
          dailyWage: wageHistoryEntry.dailyWage,
          note: '初始工资'
        })
      }
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:update', (_, pw) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    const index = db.projectWorkers.findIndex((p: any) => p.id === pw.id)
    if (index !== -1) {
      db.projectWorkers[index] = { ...db.projectWorkers[index], ...pw }
      saveDatabase()

      // SQLite 双写
      if (useSqliteWrite()) {
        workerQueries.updateProjectWorker(pw.id, pw)
      }

      return { success: true, data: db.projectWorkers[index] }
    }
    return { success: false, error: '用工记录不存在' }
  } catch (error: any) {
    log.error('Failed to update projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    db.projectWorkers = db.projectWorkers.filter((pw: any) => pw.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      workerQueries.deleteProjectWorker(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete projectWorker:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectWorkers:batchCreate', (_, entries: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectWorkers) db.projectWorkers = []
  try {
    const ids: number[] = []
    const now = new Date().toISOString()

    // All-or-nothing validation pass
    for (const entry of entries) {
      if (entry.workerId && entry.projectId) {
        if (useSqliteRead()) {
          const exists = workerQueries.existsProjectWorker(entry.workerId, entry.projectId)
          if (exists === true) {
            return { success: false, error: `工人已在项目中 (workerId=${entry.workerId})` }
          }
        } else {
          const exists = db.projectWorkers.find((p: any) =>
            p.workerId === entry.workerId && p.projectId === entry.projectId
          )
          if (exists) {
            return { success: false, error: `工人已在项目中 (workerId=${entry.workerId})` }
          }
        }
      }
    }

    const wageHistoryEntries: any[] = []
    for (const entry of entries) {
      const id = Date.now() + ids.length
      db.projectWorkers.push({ ...entry, id, createdAt: now })
      ids.push(id)
      // 自动创建初始日工资历史
      if (entry.dailyWage && Number(entry.dailyWage) > 0) {
        const entryMonth = entry.entryDate && entry.entryDate.length >= 7
          ? entry.entryDate.slice(0, 7) : now.slice(0, 7)
        if (!db.wageHistory) db.wageHistory = []
        const whEntry = {
          id: Date.now() + ids.length + 1000,
          projectWorkerId: id,
          yearMonth: entryMonth,
          dailyWage: Number(entry.dailyWage),
          note: '初始工资',
          createdAt: now,
          updatedAt: now,
        }
        db.wageHistory.push(whEntry)
        wageHistoryEntries.push({ projectWorkerId: id, yearMonth: entryMonth, dailyWage: Number(entry.dailyWage), note: '初始工资' })
      }
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      const sqliteEntries = entries.map((entry, i) => ({
        ...entry,
        id: Date.now() + i,
        createdAt: now
      }))
      workerQueries.batchCreateProjectWorkers(sqliteEntries)
      for (const wh of wageHistoryEntries) {
        salaryWageHistoryQueries.saveWageHistory(wh)
      }
    }

    return { success: true, data: { ids } }
  } catch (error: any) {
    log.error('Failed to batch create projectWorkers:', error)
    return { success: false, error: error.message }
  }
})
