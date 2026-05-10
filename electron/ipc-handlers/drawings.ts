/**
 * 图纸 IPC 处理器
 */

import { ipcMain } from 'electron'
import path from 'path'
import log from 'electron-log'
import fs from 'fs'
import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
import { saveFile, deleteFile, getFileAbsolutePath } from '../file-service'

// ═══════════════════════════════════════════════════════════════════════════════
// 图纸 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:drawings:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  let drawings = db.drawings
  if (projectId) {
    drawings = drawings.filter((d: any) => d.projectId === projectId)
  }
  return { success: true, data: drawings.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:drawings:upload', async (_, options: { projectId: number; name: string; category: string; remarks: string; fileName: string; fileData: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 使用统一文件服务保存到 drawings/files/
    const project = db.projects.find((p: any) => p.id === options.projectId)
    const result = saveFile('drawings', 'files', {
      fileData: options.fileData,
      fileName: options.fileName,
    }, project?.name)
    if (!result.success) {
      return result
    }
    const fileName = result.data!.fileName

    const id = Date.now()
    const newDrawing = {
      projectId: options.projectId,
      name: options.name,
      category: options.category,
      filePath: fileName,
      remarks: options.remarks,
      id,
      createdAt: new Date().toISOString()
    }
    db.drawings.push(newDrawing)
    saveDatabase()
    return { success: true, data: { id, filePath: fileName } }
  } catch (error: any) {
    log.error('上传图纸失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:drawings:update', (_, drawing) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.drawings.findIndex((d: any) => d.id === drawing.id)
    if (index !== -1) {
      db.drawings[index] = { ...db.drawings[index], ...drawing }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update drawing:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:drawings:delete', async (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const drawing = db.drawings.find((d: any) => d.id === id)
    if (drawing && drawing.filePath) {
      const project = db.projects.find((p: any) => p.id === drawing.projectId)
      deleteFile('drawings', 'files', drawing.filePath, project?.name)
    }
    db.drawings = db.drawings.filter((d: any) => d.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete drawing:', error)
    return { success: false, error: error.message }
  }
})
