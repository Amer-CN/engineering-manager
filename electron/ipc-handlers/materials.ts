/**
 * 材料 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 材料 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:materials:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
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
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete expense:', error)
    return { success: false, error: error.message }
  }
})
