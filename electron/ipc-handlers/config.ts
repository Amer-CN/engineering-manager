/**
 * 配置 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import log from 'electron-log'
import { 
  config, 
  defaultUserDataPath, 
  migrateData, 
  saveDatabase, 
  getUploadsPath 
} from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 配置管理
// ═══════════════════════════════════════════════════════════════════════════════

// app:openDevTools 已移至 main.ts（与窗口控制 IPC 一起，绕过守卫）

ipcMain.handle('config:get', () => {
  return {
    success: true,
    data: {
      dataPath: config.dataPath,
      defaultPath: defaultUserDataPath
    }
  }
})

ipcMain.handle('config:setDataPath', async (_, newPath: string) => {
  if (!newPath || newPath === config.dataPath) {
    return { success: false, message: '路径无效或未更改' }
  }
  
  if (newPath === '__select_folder__') {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, message: '已取消选择' }
    }
    newPath = result.filePaths[0]
  }
  
  return await migrateData(newPath)
})

ipcMain.handle('app:getDataPath', () => {
  return config.dataPath
})

ipcMain.handle('app:getUploadsPath', () => {
  return getUploadsPath()
})
