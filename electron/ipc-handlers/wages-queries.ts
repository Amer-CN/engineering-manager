/**
 * 工资 IPC Handler — 查询类
 * getAll / getStats / getPaymentRecords / getOverdueStats / getOverdueList
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { generateProjectWages, parseBankReceipt } from './wage-calc'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson } from '../sqlite'
import { wageQueries } from '../sqlite/queries'
import { enrichWage, dedupWages, computeWageStats } from './wage-utils'

// ════════════════════════════════════════════════════
// 1. 获取工资列表（SQLite 优先读取 + JSON 回退）
// ════════════════════════════════════════════════════

ipcMain.handle('db:wages:getAll', (_, projectId?: number, yearMonth?: string, memberId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const sqliteRecords = wageQueries.listWages({ projectId, yearMonth, memberId })
      if (sqliteRecords.length > 0 || (projectId || yearMonth || memberId)) {
        const deduped = dedupWages(sqliteRecords)
        const enriched = deduped.map((w: any) => enrichWage(w, db))
        return {
          success: true,
          data: enriched.sort((a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        }
      }
    } catch (err) {
      log.warn('[wages:getAll] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wages) db.wages = []
  let records = db.wages
  if (projectId) records = records.filter((w: any) => w.projectId === projectId)
  if (yearMonth) records = records.filter((w: any) => w.yearMonth === yearMonth)
  if (memberId) records = records.filter((w: any) => w.memberId === memberId)

  const deduped = dedupWages(records)
  const result = deduped.map((w: any) => enrichWage(w, db))
  return {
    success: true,
    data: result.sort((a: any, b: any) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }
})

// ════════════════════════════════════════════════════
// 9. 工资统计（SQLite 优先聚合，JSON 回退）
// ════════════════════════════════════════════════════

ipcMain.handle('db:wages:getStats', (_, yearMonth?: string, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const stats = wageQueries.getWageStats({ yearMonth, projectId })
      if (stats) {
        return { success: true, data: stats }
      }
    } catch (err) {
      log.warn('[wages:getStats] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wages) db.wages = []
  try {
    let records = db.wages
    if (yearMonth) {
      records = records.filter((w: any) => w.yearMonth === yearMonth)
    }
    if (projectId) {
      records = records.filter((w: any) => w.projectId === projectId)
    }

    // 过滤无效记录：projectWorkerId 必须对应存在的 projectWorker
    if (db.projectWorkers) {
      const validPWIds = new Set(db.projectWorkers.map((pw: any) => pw.id))
      records = records.filter((w: any) => {
        if (w.projectWorkerId) return validPWIds.has(w.projectWorkerId)
        if (w.memberId) return db.members?.some((m: any) => m.id === w.memberId)
        return false
      })
    }

    const stats = computeWageStats(records, db)
    return { success: true, data: stats }
  } catch (error: any) {
    log.error('Failed to get wage stats:', error)
    return { success: false, error: error.message }
  }
})

// ════════════════════════════════════════════════════
// 11. 获取工资发放记录（统一视图，SQLite 优先 + JSON 回退）
// ════════════════════════════════════════════════════

ipcMain.handle('db:wages:getWagePaymentRecords', (_, filters?: { projectId?: number; yearMonth?: string; status?: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const sqliteRecords = wageQueries.getPaymentRecords(filters)
      if (sqliteRecords.length > 0 || filters?.projectId || filters?.yearMonth || (filters?.status && filters.status !== '全部')) {
        return { success: true, data: sqliteRecords }
      }
    } catch (err) {
      log.warn('[wages:getPaymentRecords] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wages) db.wages = []
  try {
    let records = db.wages
    if (filters?.projectId) records = records.filter((w: any) => w.projectId === filters.projectId)
    if (filters?.yearMonth) records = records.filter((w: any) => w.yearMonth === filters.yearMonth)

    // 计算发放状态
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const enriched = records.map((w: any) => {
      const [year, month] = w.yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15)
      const overdueDays = today > dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      const paidAmount = w.paidAmount || 0
      const actualWage = w.actualWage || 0

      let paymentStatus = ''
      if (paidAmount === 0) {
        paymentStatus = overdueDays > 0 ? '逾期' : '未发放'
      } else if (paidAmount >= actualWage) {
        paymentStatus = '已发清'
      } else {
        paymentStatus = '部分发放'
      }

      return {
        ...w,
        overdueDays,
        paymentStatus,
        workerName: w.memberName || '',
        projectName: db.projects?.find((p: any) => p.id === w.projectId)?.name || '',
      }
    })

    // 按状态筛选
    let filtered = enriched
    if (filters?.status && filters.status !== '全部') {
      filtered = enriched.filter((r: any) => r.paymentStatus === filters.status)
    }

    return { success: true, data: filtered }
  } catch (error: any) {
    log.error('Failed to get payment records:', error)
    return { success: false, error: error.message }
  }
})

// ════════════════════════════════════════════════════
// 12. 获取欠薪统计
// ════════════════════════════════════════════════════

ipcMain.handle('db:wages:getWageOverdueStats', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const stats = wageQueries.getOverdueStats()
      if (stats) {
        return { success: true, data: stats }
      }
    } catch (err) {
      log.warn('[wages:getOverdueStats] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wages) db.wages = []
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalOverdueAmount = 0
    let overdueWorkerCount = 0
    let overdueProjectCount = 0
    let maxOverdueDays = 0
    const overdueProjectIds = new Set<number>()

    for (const w of db.wages) {
      const [year, month] = w.yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15)
      const overdueDays = today > dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      const paidAmount = w.paidAmount || 0
      const actualWage = w.actualWage || 0

      if (paidAmount < actualWage && overdueDays > 0) {
        totalOverdueAmount += (actualWage - paidAmount)
        overdueWorkerCount++
        overdueProjectIds.add(w.projectId)
        if (overdueDays > maxOverdueDays) maxOverdueDays = overdueDays
      }
    }

    return {
      success: true,
      data: {
        totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
        overdueWorkerCount,
        overdueProjectCount: overdueProjectIds.size,
        maxOverdueDays,
      },
    }
  } catch (error: any) {
    log.error('Failed to get overdue stats:', error)
    return { success: false, error: error.message }
  }
})

// ════════════════════════════════════════════════════
// 13. 获取欠薪列表（按逾期天数降序）
// ════════════════════════════════════════════════════

ipcMain.handle('db:wages:getWageOverdueList', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    try {
      const overdueList = wageQueries.getOverdueList()
      if (overdueList.length > 0) {
        return { success: true, data: overdueList }
      }
    } catch (err) {
      log.warn('[wages:getOverdueList] SQLite read failed, falling back to JSON:', err)
    }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.wages) db.wages = []
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueList: any[] = []

    for (const w of db.wages) {
      const [year, month] = w.yearMonth.split('-').map(Number)
      const dueDate = new Date(year, month - 1, 15)
      const overdueDays = today > dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      const paidAmount = w.paidAmount || 0
      const actualWage = w.actualWage || 0

      if (paidAmount < actualWage && overdueDays > 0) {
        overdueList.push({
          ...w,
          workerName: w.memberName || '',
          projectName: db.projects?.find((p: any) => p.id === w.projectId)?.name || '',
          overdueDays,
          overdueAmount: actualWage - paidAmount,
          paymentStatus: paidAmount === 0 ? '逾期' : '部分发放',
        })
      }
    }

    // 按逾期天数降序排序
    overdueList.sort((a, b) => b.overdueDays - a.overdueDays)

    return { success: true, data: overdueList }
  } catch (error: any) {
    log.error('Failed to get overdue list:', error)
    return { success: false, error: error.message }
  }
})
