/**
 * 成本台账分类匹配规则 IPC 处理器
 * 通道：matchRules:list / save
 * 数据集合：db.costLedgerMatchRules
 * 双写：SQLite（cost_ledger_match_rules 表）
 */

import { ipcMain } from 'electron'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, matchRulesQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerMatchRules:list — 列出所有匹配规则
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerMatchRules:list', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // SQLite 优先
    if (useSqliteRead()) {
      const data = matchRulesQueries.listRules()
      if (data !== null) return { success: true, data }
    }
    if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
    // JSON 回退
    if (!db.costLedgerMatchRules) db.costLedgerMatchRules = []
    return { success: true, data: db.costLedgerMatchRules }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerMatchRules:save — 保存匹配规则（全量覆盖）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:costLedgerMatchRules:save', (_, rules: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.costLedgerMatchRules = rules
    saveDatabase()
    // SQLite 双写
    matchRulesQueries.saveRules(rules)
    return { success: true, count: rules.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
