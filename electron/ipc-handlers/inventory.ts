/**
 * 进销存 IPC 处理器（双写模式）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, inventoryQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 物料
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:inventoryItems:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  if (useSqliteRead()) {
    const data = inventoryQueries.listInventoryItems()
    if (data) return { success: true, data }
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

  return { success: true, data: db.inventoryItems.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:inventoryItems:create', (_, item) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newItem = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.inventoryItems.push(newItem)
    saveDatabase()

    if (useSqliteWrite()) {
      inventoryQueries.createInventoryItem(newItem)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create inventory item:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:inventoryItems:update', (_, item) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.inventoryItems.findIndex((i: any) => i.id === item.id)
    if (index !== -1) {
      db.inventoryItems[index] = { ...db.inventoryItems[index], ...item, updatedAt: new Date().toISOString() }
      saveDatabase()

      if (useSqliteWrite()) {
        inventoryQueries.updateInventoryItem(item.id, item)
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update inventory item:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:inventoryItems:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.inventoryItems = db.inventoryItems.filter((i: any) => i.id !== id)
    saveDatabase()

    if (useSqliteWrite()) {
      inventoryQueries.deleteInventoryItem(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete inventory item:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 出入库记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:inventoryTransactions:getAll', (_, itemId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  if (useSqliteRead()) {
    const data = inventoryQueries.listTransactions(itemId)
    if (data) return { success: true, data }
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

  let transactions = db.inventoryTransactions
  if (itemId) {
    transactions = transactions.filter((t: any) => t.itemId === itemId)
  }
  const result = transactions.map((t: any) => {
    const item = db.inventoryItems.find((i: any) => i.id === t.itemId)
    const project = db.projects.find((p: any) => p.id === t.projectId)
    const partner = db.partners.find((p: any) => p.id === t.counterpartyId)
    return {
      ...t,
      itemName: item?.name || '',
      projectName: project?.name || '',
      counterpartyName: partner?.name || ''
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  )}
})

ipcMain.handle('db:inventoryTransactions:create', (_, transaction) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newTransaction = {
      ...transaction,
      id,
      createdAt: new Date().toISOString()
    }
    db.inventoryTransactions.push(newTransaction)
    saveDatabase()

    if (useSqliteWrite()) {
      inventoryQueries.createTransaction(newTransaction)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create transaction:', error)
    return { success: false, error: error.message }
  }
})
