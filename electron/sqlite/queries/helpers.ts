/**
 * SQLite 查询辅助工具
 *
 * 提供：
 * - camelCase ↔ snake_case 转换
 * - SQLite 就绪状态检查
 * - 读取模式管理（dual / sqlite-primary / json-only）
 * - 行数据标准化
 */

import log from 'electron-log'
import { getSqliteDb, isSqliteReady } from '../db-init'
import { isSqliteMigrated } from '../migrate'

// ═══════════════════════════════════════════════════════════════════════════════
// 读取模式管理
// ═══════════════════════════════════════════════════════════════════════════════

/** SQLite 读取模式 */
export type ReadMode = 'dual' | 'sqlite-primary' | 'json-only'

/** 当前读取模式（默认 dual：SQLite 优先 + JSON 回退） */
let currentReadMode: ReadMode = 'dual'

/** 获取当前读取模式 */
export function getReadMode(): ReadMode {
  return currentReadMode
}

/** 设置读取模式（同时持久化到 app_config 表） */
export function setReadMode(mode: ReadMode): void {
  const validModes: ReadMode[] = ['dual', 'sqlite-primary', 'json-only']
  if (!validModes.includes(mode)) {
    log.warn(`[SQLite] Invalid read mode: ${mode}, keeping ${currentReadMode}`)
    return
  }
  const prev = currentReadMode
  currentReadMode = mode
  log.info(`[SQLite] Read mode changed: ${prev} → ${mode}`)

  // 持久化到 app_config 表
  try {
    const db = tryGetSqlite()
    if (db) {
      db.prepare(`
        INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run('read_mode', mode)
      log.info(`[SQLite] Read mode persisted: ${mode}`)
    }
  } catch (e) {
    log.warn(`[SQLite] Failed to persist read mode: ${e}`)
  }
}

/** 从 app_config 表加载持久化的读取模式（启动时调用） */
export function loadPersistedReadMode(): void {
  try {
    const db = tryGetSqlite()
    if (!db) return

    const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get('read_mode') as { value: string } | undefined
    if (row && ['dual', 'sqlite-primary', 'json-only'].includes(row.value)) {
      const prev = currentReadMode
      currentReadMode = row.value as ReadMode
      if (prev !== currentReadMode) {
        log.info(`[SQLite] Restored persisted read mode: ${prev} → ${currentReadMode}`)
      }
    }
  } catch (e) {
    log.warn(`[SQLite] Failed to load persisted read mode: ${e}`)
  }
}

/**
 * SQLite 读取失败时是否回退到 JSON
 *
 * - 'dual': ✅ 回退（默认，安全）
 * - 'sqlite-primary': ❌ 不回退（严格模式，用于验证 SQLite 数据完整性）
 * - 'json-only': ✅ 始终走 JSON（回退模式）
 */
export function shouldFallbackToJson(): boolean {
  return currentReadMode !== 'sqlite-primary'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 就绪状态检查
// ═══════════════════════════════════════════════════════════════════════════════

/** 是否应从 SQLite 读取（已就绪 + 已迁移 + 非json-only模式） */
export function useSqliteRead(): boolean {
  if (currentReadMode === 'json-only') return false
  return isSqliteReady() && isSqliteMigrated()
}

/** 是否应双写到 SQLite（已就绪即可，不需要迁移完成） */
export function useSqliteWrite(): boolean {
  return isSqliteReady()
}

/** 安全获取 SQLite 实例（已就绪时返回，否则 null） */
export function tryGetSqlite() {
  if (!isSqliteReady()) return null
  return getSqliteDb()
}

// ═══════════════════════════════════════════════════════════════════════════════
// 字段名转换
// ═══════════════════════════════════════════════════════════════════════════════

/** camelCase → snake_case */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/** snake_case → camelCase */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/** 将 SQLite 行（snake_case 键）转为 camelCase 对象 */
export function rowToCamel<T = any>(row: Record<string, any>): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(row)) {
    // 处理 JSON TEXT 字段：尝试解析数组/对象
    if (typeof value === 'string') {
      if (value === '[]' || value === '{}') {
        result[snakeToCamel(key)] = value === '[]' ? [] : {}
      } else if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
        try {
          result[snakeToCamel(key)] = JSON.parse(value)
        } catch {
          result[snakeToCamel(key)] = value
        }
      } else {
        result[snakeToCamel(key)] = value
      }
    } else {
      result[snakeToCamel(key)] = value
    }
  }
  return result as T
}

/** 将 camelCase 对象转为 snake_case 键 */
export function objToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value
  }
  return result
}

/** 将值转为 SQLite 兼容格式 */
export function toSqliteValue(val: any): any {
  if (val === undefined) return null
  if (val === null) return null
  if (typeof val === 'boolean') return val ? 1 : 0
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object') return JSON.stringify(val)
  return val
}
