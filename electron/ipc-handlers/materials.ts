/**
 * 材料与费用 IPC 处理器（双写模式）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, materialQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 材料 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:materials:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  if (useSqliteRead()) {
    const data = materialQueries.listMaterials(projectId)
    if (data) return { success: true, data }
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

  let materials = db.materials
  if (projectId) {
    materials = materials.filter((m: any) => m.projectId === projectId)
  }
  return { success: true, data: materials.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:materials:create', (_, material) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newMaterial = { ...material, id, createdAt: new Date().toISOString() }
    db.materials.push(newMaterial)
    saveDatabase()

    if (useSqliteWrite()) {
      materialQueries.createMaterial(newMaterial)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create material:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:materials:update', (_, material) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.materials.findIndex((m: any) => m.id === material.id)
    if (index !== -1) {
      db.materials[index] = { ...db.materials[index], ...material }
      saveDatabase()

      if (useSqliteWrite()) {
        materialQueries.updateMaterial(material.id, material)
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update material:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:materials:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.materials = db.materials.filter((m: any) => m.id !== id)
    saveDatabase()

    if (useSqliteWrite()) {
      materialQueries.deleteMaterial(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete material:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 费用 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:expenses:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  if (useSqliteRead()) {
    const data = materialQueries.listExpenses(projectId)
    if (data) return { success: true, data }
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }

  let expenses = db.expenses
  if (projectId) {
    expenses = expenses.filter((e: any) => e.projectId === projectId)
  }
  return { success: true, data: expenses.sort((a: any, b: any) =>
    new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  )}
})

ipcMain.handle('db:expenses:create', (_, expense) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newExpense = { ...expense, id, createdAt: new Date().toISOString() }
    db.expenses.push(newExpense)
    saveDatabase()

    if (useSqliteWrite()) {
      materialQueries.createExpense(newExpense)
    }

    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create expense:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:expenses:update', (_, expense) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.expenses.findIndex((e: any) => e.id === expense.id)
    if (index !== -1) {
      db.expenses[index] = { ...db.expenses[index], ...expense }
      saveDatabase()

      if (useSqliteWrite()) {
        materialQueries.updateExpense(expense.id, expense)
      }
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update expense:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:expenses:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.expenses = db.expenses.filter((e: any) => e.id !== id)
    saveDatabase()

    if (useSqliteWrite()) {
      materialQueries.deleteExpense(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete expense:', error)
    return { success: false, error: error.message }
  }
})
