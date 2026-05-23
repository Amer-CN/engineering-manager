/**
 * 图纸 IPC 处理器（双写模式）
 */

import { ipcMain } from 'electron'
import path from 'path'
import log from 'electron-log'
import fs from 'fs'
import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
import { saveFile, deleteFile, getFileAbsolutePath, getCategoryDir } from '../file-service'
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, templateDrawingQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 图纸 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:drawings:getAll', (_, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = templateDrawingQueries.listDrawings(projectId)
    if (data) return { success: true, data }
  }

  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  let drawings = db.drawings
  if (projectId) {
    drawings = drawings.filter((d: any) => d.projectId === projectId)
  }
  return { success: true, data: [...drawings].sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:drawings:upload', async (_, options: { projectId: number; name: string; category: string; remarks: string; position?: string; fileName: string; fileData: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const project = db.projects.find((p: any) => p.id === options.projectId)
    const category = options.category || '其他'
    const position = options.position || '未分类'
    const subDir = `${position}/${category}`
    const result = saveFile('drawings', 'files', {
      fileData: options.fileData,
      fileName: options.fileName,
      subDir,
    }, project?.name)
    if (!result.success) {
      return result
    }
    const storedName = result.data!.fileName

    const id = Date.now()
    const filePath = `${position}/${category}/${storedName}`
    const newDrawing = {
      projectId: options.projectId,
      name: options.name,
      category: options.category,
      filePath,
      remarks: options.remarks,
      position: options.position || '',
      id,
      createdAt: new Date().toISOString()
    }
    db.drawings.push(newDrawing)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      templateDrawingQueries.createDrawing(newDrawing)
    }

    return { success: true, data: { id, filePath } }
  } catch (error: any) {
    log.error('上传图纸失败:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:drawings:update', async (_, drawing) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.drawings.findIndex((d: any) => d.id === drawing.id)
    if (index === -1) return { success: true }

    const oldDrawing = db.drawings[index]
    const newCategory = drawing.category || '其他'
    const oldCategory = oldDrawing.category || '其他'
    const newPosition = drawing.position || '未分类'
    const oldPosition = oldDrawing.position || '未分类'

    // If category or position changed, move the file and update filePath
    if ((newCategory !== oldCategory || newPosition !== oldPosition) && oldDrawing.filePath) {
      const project = db.projects.find((p: any) => p.id === oldDrawing.projectId)
      const projectName = project?.name

      const baseDir = getCategoryDir('drawings', 'files', projectName)
      const oldFilePath = path.join(baseDir, oldDrawing.filePath)

      const storedName = path.basename(oldDrawing.filePath)
      const newSubDir = `${newPosition}/${newCategory}`
      const newRelativePath = `${newSubDir}/${storedName}`
      const newFilePath = path.join(baseDir, newRelativePath)

      if (fs.existsSync(oldFilePath)) {
        const newDir = path.dirname(newFilePath)
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true })
        }
        fs.renameSync(oldFilePath, newFilePath)
        log.info(`Drawing file moved: ${oldFilePath} → ${newFilePath}`)
      }

      drawing.filePath = newRelativePath
    }

    db.drawings[index] = { ...oldDrawing, ...drawing }
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      templateDrawingQueries.updateDrawing(drawing.id, { ...drawing })
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
      const result = deleteFile('drawings', 'files', drawing.filePath, project?.name)
      if (!result.success && project?.name) {
        const oldFullPath = path.join(getUploadsPath(), project.name, '图纸/文件', drawing.filePath)
        if (fs.existsSync(oldFullPath)) {
          fs.unlinkSync(oldFullPath)
          log.info(`Drawing file deleted (old path): ${oldFullPath}`)
        }
      }
    }
    db.drawings = db.drawings.filter((d: any) => d.id !== id)
    saveDatabase()

    // SQLite 双写
    if (useSqliteWrite()) {
      templateDrawingQueries.deleteDrawing(id)
    }

    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete drawing:', error)
    return { success: false, error: error.message }
  }
})
