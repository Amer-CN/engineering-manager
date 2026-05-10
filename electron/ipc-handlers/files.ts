/**
 * 统一文件服务 IPC 处理器
 *
 * 提供统一的 save/read/delete 接口，所有模块的文件操作统一走这里
 */

import { ipcMain, shell } from 'electron'
import log from 'electron-log'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { dbReady } from '../database'
import { saveFile, readFile, deleteFile } from '../file-service'

// ═══════════════════════════════════════════════════════════════════════════════
// file:save — 保存文件
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('file:save', async (_, options: {
  category: string
  subCategory: string
  fileData: string
  fileName: string
  projectName?: string | null
}) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return saveFile(options.category, options.subCategory, {
    fileData: options.fileData,
    fileName: options.fileName,
  }, options.projectName)
})

// ═══════════════════════════════════════════════════════════════════════════════
// file:read — 读取文件
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('file:read', async (_, options: {
  category: string
  subCategory: string
  fileName: string
  projectName?: string | null
}) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return readFile(options.category, options.subCategory, options.fileName, options.projectName)
})

// ═══════════════════════════════════════════════════════════════════════════════
// file:delete — 删除文件
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('file:delete', async (_, options: {
  category: string
  subCategory: string
  fileName: string
  projectName?: string | null
}) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return deleteFile(options.category, options.subCategory, options.fileName, options.projectName)
})

// ═══════════════════════════════════════════════════════════════════════════════
// file:openExternal — 用系统默认程序打开文件
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('file:openExternal', async (_, options: {
  category: string
  subCategory: string
  fileName: string
  projectName?: string | null
}) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const result = readFile(options.category, options.subCategory, options.fileName, options.projectName)
    if (!result.success || !result.data) return { success: false, error: '文件不存在' }

    const dataUrl = result.data.dataUrl
    const base64 = dataUrl.split(',')[1]
    const mimeType = result.data.mimeType
    const ext = options.fileName.includes('.') ? options.fileName.split('.').pop()! : (mimeType === 'application/pdf' ? 'pdf' : mimeType.includes('image') ? 'png' : 'xlsx')

    // 写临时文件并用系统默认程序打开
    const tmpDir = path.join(app.getPath('temp'), 'gcguanjia-preview')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const tmpPath = path.join(tmpDir, `preview_${Date.now()}.${ext}`)
    fs.writeFileSync(tmpPath, Buffer.from(base64, 'base64'))

    const error = await shell.openPath(tmpPath)
    if (error) return { success: false, error }
    return { success: true }
  } catch (e: any) {
    log.error('file:openExternal failed', e)
    return { success: false, error: e.message }
  }
})
