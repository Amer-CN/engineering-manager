/**
 * 工人日工资历史 IPC 处理器（双写模式）
 * 追踪工人的日工资变动，按年月记录
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, salaryWageHistoryQueries } from '../sqlite/queries'

// 获取某工人的工资历史（按年月降序）
ipcMain.handle('db:wageHistory:list', (_, projectWorkerId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = salaryWageHistoryQueries.listWageHistory(projectWorkerId)
    if (data && data.length > 0) return { success: true, data }
    // 空数组时也走 JSON 的懒创建逻辑
  }

  // JSON 回退（含懒创建）
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wageHistory) db.wageHistory = []
  let records = db.wageHistory
    .filter((h: any) => h.projectWorkerId === projectWorkerId)
    .sort((a: any, b: any) => b.yearMonth.localeCompare(a.yearMonth))

  // 懒创建：无历史时自动补初始工资
  if (records.length === 0 && db.projectWorkers) {
    const pw = db.projectWorkers.find((p: any) => p.id === projectWorkerId)
    if (pw && db.workers) {
      const worker = db.workers.find((w: any) => w.id === pw.workerId)
      const originalWage = worker?.dailyWage || pw.dailyWage
      if (originalWage && Number(originalWage) > 0) {
        let firstMonth = pw.entryDate && pw.entryDate.length >= 7
          ? pw.entryDate.slice(0, 7) : new Date().toISOString().slice(0, 7)
        if (db.attendances) {
          const atts = db.attendances
            .filter((a: any) => a.projectWorkerId === projectWorkerId)
            .sort((a: any, b: any) => a.yearMonth.localeCompare(b.yearMonth))
          if (atts.length > 0) firstMonth = atts[0].yearMonth
        }
        const entry = {
          id: Date.now(),
          projectWorkerId,
          yearMonth: firstMonth,
          dailyWage: Number(originalWage),
          note: '初始工资',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        db.wageHistory.push(entry)
        saveDatabase()

        // SQLite 双写
        if (useSqliteWrite()) {
          salaryWageHistoryQueries.saveWageHistory({
            projectWorkerId,
            yearMonth: firstMonth,
            dailyWage: Number(originalWage),
            note: '初始工资'
          })
        }

        records = [entry]
      }
    }
  }

  return { success: true, data: records }
})

// 创建/更新工资历史记录（同时同步 projectWorker.dailyWage）
ipcMain.handle('db:wageHistory:save', (_, record: { projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wageHistory) db.wageHistory = []
  try {
    const existingIndex = db.wageHistory.findIndex(
      (h: any) => h.projectWorkerId === record.projectWorkerId && h.yearMonth === record.yearMonth
    )
    if (existingIndex !== -1) {
      db.wageHistory[existingIndex] = { ...db.wageHistory[existingIndex], ...record, updatedAt: new Date().toISOString() }
    } else {
      db.wageHistory.push({ ...record, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    // 同步更新 projectWorker 的 dailyWage
    if (db.projectWorkers) {
      const pwIndex = db.projectWorkers.findIndex((pw: any) => pw.id === record.projectWorkerId)
      if (pwIndex !== -1) {
        db.projectWorkers[pwIndex] = { ...db.projectWorkers[pwIndex], dailyWage: record.dailyWage, updatedAt: new Date().toISOString() }
      }
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      salaryWageHistoryQueries.saveWageHistory(record)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to save wage history:', error)
    return { success: false, error: error.message }
  }
})

// 获取指定月份的有效日工资标准
ipcMain.handle('db:wageHistory:getEffective', (_, projectWorkerId: number, yearMonth: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = salaryWageHistoryQueries.getEffectiveWage(projectWorkerId, yearMonth)
    if (data) return { success: true, data }
    // 无历史时回退到 project_worker 上的 daily_wage
    if (db.projectWorkers) {
      const pw = db.projectWorkers.find((p: any) => p.id === projectWorkerId)
      return { success: true, data: { dailyWage: pw?.dailyWage || 0, yearMonth: '' } }
    }
    return { success: true, data: { dailyWage: 0, yearMonth: '' } }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wageHistory) db.wageHistory = []
  const records = db.wageHistory
    .filter((h: any) => h.projectWorkerId === projectWorkerId && h.yearMonth <= yearMonth)
    .sort((a: any, b: any) => b.yearMonth.localeCompare(a.yearMonth))
  if (records.length > 0) return { success: true, data: records[0] }
  if (db.projectWorkers) {
    const pw = db.projectWorkers.find((p: any) => p.id === projectWorkerId)
    return { success: true, data: { dailyWage: pw?.dailyWage || 0, yearMonth: '' } }
  }
  return { success: true, data: { dailyWage: 0, yearMonth: '' } }
})

// 删除工资历史记录
ipcMain.handle('db:wageHistory:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wageHistory) db.wageHistory = []
  try {
    db.wageHistory = db.wageHistory.filter((h: any) => h.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      salaryWageHistoryQueries.deleteWageHistory(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete wage history:', error)
    return { success: false, error: error.message }
  }
})
