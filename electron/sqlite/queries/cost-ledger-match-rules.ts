/**
 * 成本台账匹配规则 SQLite 查询模块
 *
 * 实现 cost_ledger_match_rules 表的 CRUD 操作。
 * 特点：save 为全量覆盖模式。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const MR_COLUMNS: Record<string, string> = {
  id: 'id',
  keyword: 'keyword',
  category: 'category',
  direction: 'direction',
  hitCount: 'hit_count',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const MR_INSERT_COLS = Object.values(MR_COLUMNS).filter(c => c !== 'id')
const MR_INSERT_PLACEHOLDERS = MR_INSERT_COLS.map(() => '?').join(', ')
const MR_INSERT_SQL = `INSERT INTO cost_ledger_match_rules (${MR_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${MR_INSERT_PLACEHOLDERS})`

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有匹配规则 */
export function listRules(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(
      'SELECT * FROM cost_ledger_match_rules ORDER BY id ASC'
    ).all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] matchRules.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 全量覆盖保存匹配规则（事务：DELETE ALL + INSERT） */
export function saveRules(rules: any[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const doSave = sqlite.transaction(() => {
      sqlite.prepare('DELETE FROM cost_ledger_match_rules').run()
      const stmt = sqlite.prepare(MR_INSERT_SQL)
      for (const rule of rules) {
        const params = MR_INSERT_COLS.map(col => {
          const jsonKey = Object.entries(MR_COLUMNS).find(([, c]) => c === col)?.[0]
          if (!jsonKey) return null
          return toSqliteValue(rule[jsonKey])
        })
        stmt.run(...params)
      }
    })
    doSave()
    return true
  } catch (err) {
    log.error('[SQLite] matchRules.save error:', err)
    return false
  }
}
