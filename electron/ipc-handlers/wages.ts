/**
 * 工资 IPC Handler — SQLite 双写版（精简后 < 350 行）
 *
 * 保留通道：generateForProject / create / update / delete / parseBankReceipt
 * 已拆分至 wager-batch.ts：batchSave / batchDelete / batchClearPayments / batchArchivePayments
 * 已拆分至 wager-queries.ts：getAll / getStats / getPaymentRecords / getOverdueStats / getOverdueList
 */
import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { generateProjectWages, parseBankReceipt } from './wage-calc'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson } from '../sqlite'
import { wageQueries } from '../sqlite/queries'
import { enrichWage, deduWages } from './wage-utils'

// ══════════════════════════════════════
// generateForProject（JSON-only，复杂计算）
// ══════════════════════════════════════

ipcMain.handle('db:wages:generateForProject', (_, projectId: number, yearMonth: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const result = generateProjectWages(projectId, yearMonth)
    return result
  } catch (error: any) {
    log.error('Failed to generate wages:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════
// create
// ══════════════════════════════════════

ipcMain.handle('db:wages:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const now = new Date().toISOString()
    const newRecord = { ...record, id: Date.now(), createdAt: now, updatedAt: now }
    db.wages.push(newRecord)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.createWage(newRecord)
    }

    return { success: true, data: newRecord }
  } catch (error: any) {
    log.error('Failed to create wage:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════
// update
// ══════════════════════════════════════

ipcMain.handle('db:wages:update', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const index = db.wages.findIndex((w: any) => w.id === record.id)
    if (index === -1) return { success: false, error: 'Record not found' }

    const updated = { ...db.wages[index], ...record, updatedAt: new Date().toISOString() }
    db.wages[index] = updated
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.updateWage(record)
    }

    return { success: true, data: updated }
  } catch (error: any) {
    log.error('Failed to update wage:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════
// delete
// ══════════════════════════════════════

ipcMain.handle('db:wages:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    db.wages = db.wages.filter((w: any) => w.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      wageQueries.deleteWage(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete wage:', error)
    return { success: false, error: error.message }
  }
})

// ══════════════════════════════════════
// parseBankReceipt（JSON-only，文件操作）
// ══════════════════════════════════════

ipcMain.handle('db:wages:parseBankReceipt', async (_, sourcePath: string, projectName?: string, yearMonth?: string) => {
  try {
    return await parseBankReceipt(sourcePath, projectName, yearMonth)
  } catch (error: any) {
    log.error('Failed to parse bank receipt:', error)
    return { success: false, error: error.message }
  }
})
