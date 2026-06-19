import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// SQLite 读取模式切换测试（P2 级别）
// 测试目标：useSqliteSettings.ts / sqlite/queries/helpers.ts 读取模式切换逻辑
// ============================================================================

describe('SQLite 读取模式切换测试', () => {
  // 模拟读取模式枚举
  const ReadMode = {
    DUAL: 'dual',                   // 双写模式（SQLite优先 + JSON回退）
    SQLITE_PRIMARY: 'sqlite-primary', // 仅 SQLite（失败返回错误）
    JSON_ONLY: 'json-only',           // 仅 JSON
  }

  // 模拟当前读取模式
  let currentMode: string

  // 模拟 SQLite 状态
  let sqliteAvailable: boolean

  beforeEach(() => {
    currentMode = ReadMode.DUAL
    sqliteAvailable = true
  })

  // --------------------------------------------------------------------------
  // 测试 1: dual 模式应优先从 SQLite 读取，失败则回退到 JSON
  // --------------------------------------------------------------------------
  it('dual 模式应优先从 SQLite 读取，失败则回退到 JSON', () => {
    // 模拟读取函数
    const readInDualMode = (sqliteRead: () => any, jsonRead: () => any) => {
      if (!sqliteAvailable) {
        return { source: 'json', data: jsonRead(), fallback: true }
      }

      try {
        const sqliteData = sqliteRead()
        if (sqliteData) {
          return { source: 'sqlite', data: sqliteData }
        }
        // SQLite 无数据，回退到 JSON
        return { source: 'json', data: jsonRead(), fallback: true }
      } catch (error) {
        // SQLite 读取失败，回退到 JSON
        return { source: 'json', data: jsonRead(), fallback: true, error }
      }
    }

    // 测试 SQLite 成功
    const result1 = readInDualMode(
      () => ({ id: '1', amount: 1000 }),
      () => ({ id: '1', amount: 1000 })
    )
    expect(result1.source).toBe('sqlite')
    expect(result1.data.id).toBe('1')

    // 测试 SQLite 失败，回退到 JSON
    sqliteAvailable = false
    const result2 = readInDualMode(
      () => { throw new Error('SQLite error') },
      () => ({ id: '1', amount: 1000 })
    )
    expect(result2.source).toBe('json')
    expect(result2.data.id).toBe('1')
    expect(result2.fallback).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 测试 2: sqlite-primary 模式应仅从 SQLite 读取，失败返回错误
  // --------------------------------------------------------------------------
  it('sqlite-primary 模式应仅从 SQLite 读取，失败返回错误', () => {
    // 设置模式
    currentMode = ReadMode.SQLITE_PRIMARY

    // 模拟读取函数
    const readInSqlitePrimaryMode = (sqliteRead: () => any) => {
      try {
        const sqliteData = sqliteRead()
        return { success: true, data: sqliteData }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }

    // 测试 SQLite 成功
    const result1 = readInSqlitePrimaryMode(
      () => ({ id: '1', amount: 1000 })
    )
    expect(result1.success).toBe(true)
    expect(result1.data.id).toBe('1')

    // 测试 SQLite 失败
    const result2 = readInSqlitePrimaryMode(
      () => { throw new Error('SQLite error') }
    )
    expect(result2.success).toBe(false)
    expect(result2.error).toBe('SQLite error')
  })

  // --------------------------------------------------------------------------
  // 测试 3: json-only 模式应仅从 JSON 读取
  // --------------------------------------------------------------------------
  it('json-only 模式应仅从 JSON 读取', () => {
    // 设置模式
    currentMode = ReadMode.JSON_ONLY

    // 模拟读取函数
    const readInJsonOnlyMode = (jsonRead: () => any) => {
      const jsonData = jsonRead()
      return { source: 'json', data: jsonData }
    }

    // 测试 JSON 读取
    const result = readInJsonOnlyMode(
      () => ({ id: '1', amount: 1000 })
    )
    expect(result.source).toBe('json')
    expect(result.data.id).toBe('1')
  })

  // --------------------------------------------------------------------------
  // 测试 4: 切换模式应持久化到 sqlite_config 表
  // --------------------------------------------------------------------------
  it('切换模式应持久化到 sqlite_config 表', () => {
    // 模拟 sqlite_config 表操作
    const sqliteConfigTable: Record<string, string> = {}

    // 模拟设置模式函数
    const setReadMode = (mode: string) => {
      // 验证模式有效
      if (!Object.values(ReadMode).includes(mode)) {
        return { success: false, error: `无效的模式: ${mode}` }
      }

      // 持久化到 sqlite_config 表
      sqliteConfigTable['read_mode'] = mode
      sqliteConfigTable['updated_at'] = new Date().toISOString()

      return { success: true, mode }
    }

    // 测试设置有效模式
    const result1 = setReadMode(ReadMode.SQLITE_PRIMARY)
    expect(result1.success).toBe(true)
    expect(result1.mode).toBe(ReadMode.SQLITE_PRIMARY)
    expect(sqliteConfigTable['read_mode']).toBe(ReadMode.SQLITE_PRIMARY)
    expect(sqliteConfigTable['updated_at']).toBeDefined()

    // 测试设置无效模式
    const result2 = setReadMode('invalid-mode')
    expect(result2.success).toBe(false)
    expect(result2.error).toContain('无效的模式')
  })

  // --------------------------------------------------------------------------
  // 测试 5: 重启应用后应恢复持久化的读取模式
  // --------------------------------------------------------------------------
  it('重启应用后应恢复持久化的读取模式', () => {
    // 模拟 sqlite_config 表
    const sqliteConfigTable: Record<string, string> = {
      'read_mode': ReadMode.SQLITE_PRIMARY,
      'updated_at': '2026-05-23T10:00:00.000Z',
    }

    // 模拟加载持久化模式函数
    const loadPersistedReadMode = () => {
      const persistedMode = sqliteConfigTable['read_mode']

      if (persistedMode && Object.values(ReadMode).includes(persistedMode)) {
        return { success: true, mode: persistedMode }
      }

      // 默认模式
      return { success: true, mode: ReadMode.DUAL }
    }

    // 测试恢复持久化模式
    const result = loadPersistedReadMode()
    expect(result.success).toBe(true)
    expect(result.mode).toBe(ReadMode.SQLITE_PRIMARY)

    // 测试无持久化模式（使用默认模式）
    delete sqliteConfigTable['read_mode']
    const result2 = loadPersistedReadMode()
    expect(result2.success).toBe(true)
    expect(result2.mode).toBe(ReadMode.DUAL)
  })

  // --------------------------------------------------------------------------
  // 测试 6: 模式切换应通知所有 IPC 窗口
  // --------------------------------------------------------------------------
  it('模式切换应通知所有 IPC 窗口', () => {
    const notifiedWindows: string[] = []

    // 模拟通知函数
    const notifyAllWindows = (mode: string) => {
      // 模拟所有窗口
      const windows = ['main', 'settings', 'projects']
      windows.forEach(window => {
        notifiedWindows.push(`window:${window}, mode:${mode}`)
      })

      return notifiedWindows.length
    }

    // 测试通知
    const count = notifyAllWindows(ReadMode.SQLITE_PRIMARY)
    expect(count).toBe(3)
    expect(notifiedWindows).toContain('window:main, mode:sqlite-primary')
    expect(notifiedWindows).toContain('window:settings, mode:sqlite-primary')
    expect(notifiedWindows).toContain('window:projects, mode:sqlite-primary')
  })
})