/**
 * 工资 IPC Handler — Batch 操作
 * batchSave / batchDelete / batchClearPayments / batchArchivePayments
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteWrite } from '../sqlite'
import { wageQueries } from '../sqlite/queries'

// ══════════════════════════════════════════════════════
// batchSave
// ══════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchSave', (_, records: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    if (records.length === 0) return { success: true }

    const { projectId, yearMonth } = records[0]
    // 删除旧的
    db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))
    // 插入新的
    const now = new Date().toISOString()
    for (const record of records) {
      db.wages.push({ ...record, updatedAt: now })
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.batchSaveWages(records)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to batch save wages:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════════════════════
// batchDelete
// ══════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchDelete', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    db.wages = db.wages.filter((w: any) => !idSet.has(w.id))
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.batchDeleteWages(ids)
    }

    return { success: true, data: { deleted: ids.length } }
  } catch (error: any) {
    log.error('Failed to batch delete wages:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════════════════════
// batchClearPayments
// ══════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchClearPayments', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    let cleared = 0
    for (const w of db.wages) {
      if (idSet.has(w.id)) {
        w.paidAmount = 0
        w.paidDate = ''
        w.bankReceiptPath = undefined
        w.paymentLocked = false
        w.updatedAt = new Date().toISOString()
        cleared++
      }
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.batchClearPayments(ids)
    }

    return { success: true, data: { cleared } }
  } catch (error: any) {
    log.error('Failed to batch clear payments:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════════════════════
// batchArchivePayments
// ══════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchArchivePayments', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    let archived = 0
    for (const w of db.wages) {
      if (idSet.has(w.id)) {
        w.paymentLocked = true
        w.updatedAt = new Date().toISOString()
        archived++
      }
    }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.batchArchivePayments(ids)
    }

    return { success: true, data: { archived } }
  } catch (error: any) {
    log.error('Failed to batch archive payments:', error)
    return { success: false, error: error.message }
  }
})
