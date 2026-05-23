/**
 * 快照 IPC 处理器
 * 数据库快照的创建、列表、还原、删除、设置
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import path from 'path'
import fs from 'fs'
import { listSnapshots, createSnapshot, restoreSnapshot, getSnapshotsDir, setMaxSnapshots, getMaxSnapshots, getSnapshotIndex, saveSnapshotIndex } from '../database'
import type { SnapshotInfo } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 快照管理
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:snapshots:list', () => {
  try {
    const snapshots = listSnapshots()
    return { success: true, data: snapshots }
  } catch (error: any) {
    log.error('db:snapshots:list error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:snapshots:create', (_event, label?: string) => {
  try {
    const info = createSnapshot(label)
    if (!info) {
      return { success: false, error: '快照创建失败，数据库文件不存在' }
    }
    return { success: true, data: info }
  } catch (error: any) {
    log.error('db:snapshots:create error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:snapshots:restore', async (_event, timestamp: string) => {
  try {
    const ok = restoreSnapshot(timestamp)
    if (!ok) {
      return { success: false, error: '快照文件不存在' }
    }
    return { success: true }
  } catch (error: any) {
    log.error('db:snapshots:restore error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:snapshots:delete', (_event, timestamp: string) => {
  try {
    const snapshotDir = getSnapshotsDir()
    const filePath = path.join(snapshotDir, `${timestamp}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    // Also remove from index
    const index = getSnapshotIndex()
    saveSnapshotIndex(index.filter((s: SnapshotInfo) => s.timestamp !== timestamp))
    return { success: true }
  } catch (error: any) {
    log.error('db:snapshots:delete error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:snapshots:setMaxCount', (_event, count: number) => {
  try {
    setMaxSnapshots(count)
    return { success: true, data: { maxCount: getMaxSnapshots() } }
  } catch (error: any) {
    log.error('db:snapshots:setMaxCount error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:snapshots:getMaxCount', () => {
  try {
    return { success: true, data: { maxCount: getMaxSnapshots() } }
  } catch (error: any) {
    log.error('db:snapshots:getMaxCount error:', error)
    return { success: false, error: error.message }
  }
})
