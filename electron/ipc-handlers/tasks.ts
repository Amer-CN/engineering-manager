/**
 * 任务 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 任务 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:tasks:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  let tasks = db.tasks
  if (projectId) {
    tasks = tasks.filter((t: any) => t.projectId === projectId)
  }
  return { success: true, data: tasks.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:tasks:create', (_, task) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newTask = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.tasks.push(newTask)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create task:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:tasks:update', (_, task) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.tasks.findIndex((t: any) => t.id === task.id)
    if (index !== -1) {
      db.tasks[index] = { ...db.tasks[index], ...task, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update task:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:tasks:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.tasks = db.tasks.filter((t: any) => t.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete task:', error)
    return { success: false, error: error.message }
  }
})
