/**
 * SQLite 状态管理 IPC Handler
 *
 * 提供：
 * - sqlite:status — 查询 SQLite 是否已就绪、迁移状态
 * - sqlite:enable — 启用 SQLite（初始化数据库）
 * - sqlite:migrate — 从 JSON 迁移数据到 SQLite
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import * as fs from 'fs'
import * as path from 'path'
import {
  initSqliteDb,
  isSqliteReady,
  getSqliteDbPath,
  getSqliteSummary,
  migrateFromJson,
  isSqliteMigrated,
  markMigrationComplete,
  getReadMode,
  setReadMode,
  loadPersistedReadMode,
} from '../sqlite'
import type { ReadMode } from '../sqlite'
import { db as jsonDb, config, getDbPath } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:status — 获取 SQLite 状态
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('sqlite:status', async () => {
  try {
    const ready = isSqliteReady()
    const migrated = ready ? isSqliteMigrated() : false
    const dbPath = getSqliteDbPath()
    const summary = ready ? getSqliteSummary() : null

    // 获取数据库文件大小
    let dbSize: number | null = null
    if (dbPath && fs.existsSync(dbPath)) {
      try {
        const stat = fs.statSync(dbPath)
        dbSize = stat.size
      } catch { /* ignore */ }
    }

    return {
      success: true,
      ready,
      migrated,
      dbPath,
      dbSize,
      summary,
      readMode: getReadMode(),
    }
  } catch (err) {
    log.error('sqlite:status error:', err)
    return {
      success: false,
      ready: false,
      migrated: false,
      dbPath: null,
      dbSize: null,
      summary: null,
      error: String(err),
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:enable — 初始化 SQLite 数据库
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('sqlite:enable', async () => {
  try {
    if (isSqliteReady()) {
      return { success: true, message: 'SQLite 已经初始化' }
    }
    const dataPath = config?.dataPath
    if (!dataPath) {
      return { success: false, message: '数据路径未配置，请先完成应用初始化' }
    }

    // 【数据保护】启用 SQLite 前，先备份 engineering.json
    const jsonDbPath = getDbPath()
    if (fs.existsSync(jsonDbPath)) {
      const backupSuffix = '.before-sqlite-enable-' + Date.now() + '.bak'
      const backupPath = jsonDbPath + backupSuffix
      try {
        fs.copyFileSync(jsonDbPath, backupPath)
        log.info('sqlite:enable — 已备份 engineering.json 到:', backupPath)
      } catch (backupErr) {
        log.error('sqlite:enable — 备份失败，中止启用:', backupErr)
        return { success: false, message: '备份数据失败，为避免数据丢失已中止操作：' + String(backupErr) }
      }
    }

    initSqliteDb(dataPath)
    loadPersistedReadMode() // 从配置表恢复上次的读取模式
    log.info('sqlite:enable — SQLite 初始化成功')
    return { success: true, message: 'SQLite 初始化成功' }
  } catch (err) {
    log.error('sqlite:enable error:', err)
    return { success: false, message: String(err) }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:migrate — 将 JSON 数据迁移到 SQLite
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('sqlite:migrate', async (_event, force = false) => {
  try {
    if (!isSqliteReady()) {
      return {
        success: false,
        message: 'SQLite 未初始化，请先启用 SQLite',
        migratedTables: 0,
        totalRows: 0,
        verificationPassed: false,
        errors: ['SQLite not initialized'],
        warnings: [],
        duration: 0,
      }
    }

    // 非强制模式下，若已迁移则跳过
    if (!force && isSqliteMigrated()) {
      return {
        success: true,
        message: '数据已迁移过（跳过重复迁移）',
        migratedTables: 0,
        totalRows: 0,
        verificationPassed: true,
        errors: [],
        warnings: [],
        duration: 0,
      }
    }

    // 【数据保护】迁移前，先备份 SQLite 数据库文件
    const sqliteDbPath = getSqliteDbPath()
    if (sqliteDbPath && fs.existsSync(sqliteDbPath)) {
      const backupSuffix = '.before-migrate-' + Date.now() + '.bak'
      const backupPath = sqliteDbPath + backupSuffix
      try {
        fs.copyFileSync(sqliteDbPath, backupPath)
        log.info('sqlite:migrate — 已备份 SQLite 数据库到:', backupPath)
      } catch (backupErr) {
        log.error('sqlite:migrate — 备份失败，中止迁移:', backupErr)
        return {
          success: false,
          message: '备份 SQLite 数据库失败，为避免数据丢失已中止迁移：' + String(backupErr),
          migratedTables: 0,
          totalRows: 0,
          verificationPassed: false,
          errors: [String(backupErr)],
          warnings: [],
          duration: 0,
        }
      }
    }

    log.info('sqlite:migrate — 开始迁移...')
    const jsonDbPath = getDbPath()
    const result = migrateFromJson(jsonDb, jsonDbPath)
    if (result.success) {
      markMigrationComplete() // 标记迁移已完成
      log.info('sqlite:migrate — 已标记迁移完成')
    }
    loadPersistedReadMode() // 迁移完成后加载持久化配置
    log.info(`sqlite:migrate — 完成：${result.migratedTables} 表，${result.totalRows} 行，${result.errors.length} 错误，verificationPassed=${result.verificationPassed}`)
    return result
  } catch (err) {
    log.error('sqlite:migrate error:', err)
    return {
      success: false,
      message: String(err),
      migratedTables: 0,
      totalRows: 0,
      verificationPassed: false,
      errors: [String(err)],
      warnings: [],
      duration: 0,
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:getReadMode — 获取当前读取模式
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('sqlite:getReadMode', () => {
  return { success: true, readMode: getReadMode() }
})

// ═══════════════════════════════════════════════════════════════════════════════
// sqlite:setReadMode — 设置读取模式
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('sqlite:setReadMode', (_, mode: ReadMode) => {
  const validModes: ReadMode[] = ['dual', 'sqlite-primary', 'json-only']
  if (!validModes.includes(mode)) {
    return { success: false, error: `无效的读取模式: ${mode}，可选值: ${validModes.join(', ')}` }
  }
  setReadMode(mode)
  return { success: true, readMode: getReadMode() }
})
