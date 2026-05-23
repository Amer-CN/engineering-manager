/**
 * 成本台账 SQLite 查询模块
 *
 * 实现 cost_ledger 表的 CRUD 操作，供 IPC Handler 双写使用。
 * 读操作：从 SQLite 查询并返回 camelCase 格式
 * 写操作：INSERT/UPDATE/DELETE SQLite，由调用方负责同步 JSON
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 成本台账条目 — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

/** JSON 字段 → SQLite 列名（与 migrate.ts 保持一致） */
const CL_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  batchId: 'batch_id',
  voucherNo: 'voucher_no',
  date: 'date',
  direction: 'direction',
  amount: 'amount',
  category: 'category',
  summary: 'summary',
  counterparty: 'counterparty',
  channel: 'channel',
  linkedInvoiceId: 'linked_invoice_id',
  linkedInvoiceStatus: 'linked_invoice_status',
  notes: 'notes',
  attachments: 'attachments',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

/** SQLite 列名列表（含 id，确保 JSON 和 SQLite 主键一致） */
const CL_INSERT_COLS = Object.values(CL_COLUMNS)

/** INSERT 占位符 */
const CL_INSERT_PLACEHOLDERS = CL_INSERT_COLS.map(() => '?').join(', ')

/** INSERT 语句 */
const CL_INSERT_SQL = `INSERT INTO cost_ledger (${CL_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${CL_INSERT_PLACEHOLDERS})`

/** UPDATE SET 子句（不含 id/created_at） */
const CL_UPDATE_COLS = Object.entries(CL_COLUMNS)
  .filter(([jsonKey]) => jsonKey !== 'id' && jsonKey !== 'createdAt')
  .map(([, col]) => `"${col}"`)

// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  name: 'name',
  createdAt: 'created_at',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 从 entry 对象提取 INSERT 参数（按 CL_INSERT_COLS 顺序） */
function entryToInsertParams(entry: Record<string, any>): any[] {
  return CL_INSERT_COLS.map(col => {
    // 反查 JSON key
    const jsonKey = Object.entries(CL_COLUMNS).find(([, c]) => c === col)?.[0]
    if (!jsonKey) return null
    const val = entry[jsonKey]
    // attachments 和 notes 存为 JSON TEXT
    if (col === 'attachments') return toSqliteValue(val || [])
    return toSqliteValue(val)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 列出台账记录（SQLite 版）
 * 含发票状态解析（LEFT JOIN invoices）
 */
export function listEntries(projectId: number, batchId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = `
      SELECT cl.*,
        CASE WHEN i.id IS NOT NULL THEN 'active'
             WHEN cl.linked_invoice_id IS NOT NULL THEN 'deleted'
             ELSE NULL
        END as computed_invoice_status
      FROM cost_ledger cl
      LEFT JOIN invoices i ON cl.linked_invoice_id = i.id
      WHERE cl.project_id = ?
    `
    const params: any[] = [projectId]

    if (batchId !== undefined) {
      sql += ` AND cl.batch_id = ?`
      params.push(batchId)
    }

    sql += ` ORDER BY cl.date DESC`

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camelRow = rowToCamel(row)
      // 用计算值覆盖存储的 linkedInvoiceStatus
      if (camelRow.computedInvoiceStatus !== undefined) {
        camelRow.linkedInvoiceStatus = camelRow.computedInvoiceStatus
        delete camelRow.computedInvoiceStatus
      }
      return camelRow
    })
  } catch (err) {
    log.error('[SQLite] costLedger.list error:', err)
    return null
  }
}

/**
 * 获取台账汇总（SQLite 版）
 */
export function summary(projectId: number, batchId?: number): { totalExpense: number; totalIncome: number; byCategory: Record<string, number> } | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = `
      SELECT direction, category, SUM(amount) as total
      FROM cost_ledger
      WHERE project_id = ? AND amount > 0
    `
    const params: any[] = [projectId]
    if (batchId !== undefined) {
      sql += ` AND batch_id = ?`
      params.push(batchId)
    }
    sql += ` GROUP BY direction, category`

    const rows = sqlite.prepare(sql).all(...params) as { direction: string; category: string; total: number }[]

    let totalExpense = 0
    let totalIncome = 0
    const byCategory: Record<string, number> = {}

    for (const row of rows) {
      byCategory[row.category] = (byCategory[row.category] || 0) + row.total
      if (row.direction === 'expense') totalExpense += row.total
      else if (row.direction === 'income') totalIncome += row.total
    }

    return { totalExpense, totalIncome, byCategory }
  } catch (err) {
    log.error('[SQLite] costLedger.summary error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 写操作（仅 SQLite，JSON 由 IPC Handler 维护）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建台账记录（SQLite 版）
 * @returns SQLite 自增 ID，失败返回 null
 */
export function createEntry(entry: Record<string, any>): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const params = entryToInsertParams(entry)
    const result = sqlite.prepare(CL_INSERT_SQL).run(...params)
    return Number(result.lastInsertRowid)
  } catch (err) {
    log.error('[SQLite] costLedger.create error:', err)
    return null
  }
}

/**
 * 批量创建台账记录（SQLite 版，使用事务）
 * @returns 成功插入的条目数
 */
export function batchCreateEntries(entries: Record<string, any>[]): number {
  const sqlite = tryGetSqlite()
  if (!sqlite) return 0

  try {
    const stmt = sqlite.prepare(CL_INSERT_SQL)
    const insertAll = sqlite.transaction(() => {
      let count = 0
      for (const entry of entries) {
        const params = entryToInsertParams(entry)
        stmt.run(...params)
        count++
      }
      return count
    })
    return insertAll()
  } catch (err) {
    log.error('[SQLite] costLedger.batchCreate error:', err)
    return 0
  }
}

/**
 * 更新台账记录（SQLite 版）
 */
export function updateEntry(id: number, changes: Record<string, any>): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = CL_COLUMNS[jsonKey]
      if (!col) continue // 忽略未知字段
      setClauses.push(`"${col}" = ?`)
      if (col === 'attachments') {
        params.push(toSqliteValue(value || []))
      } else {
        params.push(toSqliteValue(value))
      }
    }

    if (setClauses.length === 0) return true // 无有效更新

    // 始终更新 updatedAt
    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE cost_ledger SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] costLedger.update error:', err)
    return false
  }
}

/**
 * 删除台账记录（SQLite 版）
 */
export function deleteEntry(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM cost_ledger WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] costLedger.delete error:', err)
    return false
  }
}

/**
 * 按项目级联删除（SQLite 版）
 */
export function deleteByProject(projectId: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare('DELETE FROM cost_ledger WHERE project_id = ?').run(projectId)
    return true
  } catch (err) {
    log.error('[SQLite] costLedger.deleteByProject error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 列出项目批次（SQLite 版）
 */
export function listBatches(projectId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare(
      'SELECT * FROM cost_ledger_batches WHERE project_id = ? ORDER BY id ASC'
    ).all(projectId) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.list error:', err)
    return null
  }
}

/**
 * 获取项目最新有数据的批次 ID（SQLite 版）
 */
export function getLatestBatch(projectId: number): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare(`
      SELECT b.id
      FROM cost_ledger_batches b
      INNER JOIN cost_ledger cl ON cl.batch_id = b.id AND cl.project_id = ?
      WHERE b.project_id = ?
      ORDER BY b.id DESC
      LIMIT 1
    `).get(projectId, projectId) as { id: number } | undefined
    return row?.id ?? 0
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.getLatestBatch error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 创建批次（SQLite 版）
 */
export function createBatch(projectId: number, name: string, id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(
      'INSERT INTO cost_ledger_batches (id, project_id, name, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, projectId, name, new Date().toISOString())
    return true
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.create error:', err)
    return false
  }
}

/**
 * 重命名批次（SQLite 版）
 */
export function renameBatch(projectId: number, batchId: number, name: string): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    sqlite.prepare(
      'UPDATE cost_ledger_batches SET name = ? WHERE project_id = ? AND id = ?'
    ).run(name, projectId, batchId)
    return true
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.rename error:', err)
    return false
  }
}

/**
 * 删除批次及数据（SQLite 版，使用事务）
 */
export function deleteBatch(projectId: number, batchId: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const deleteAll = sqlite.transaction(() => {
      sqlite.prepare('DELETE FROM cost_ledger WHERE project_id = ? AND batch_id = ?')
        .run(projectId, batchId)
      sqlite.prepare('DELETE FROM cost_ledger_batches WHERE project_id = ? AND id = ?')
        .run(projectId, batchId)
    })
    deleteAll()
    return true
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.delete error:', err)
    return false
  }
}

/**
 * 复制版本（SQLite 版，事务中复制所有条目）
 */
export function copyBatch(projectId: number, sourceBatchId: number, newBatchId: number): number {
  const sqlite = tryGetSqlite()
  if (!sqlite) return 0

  try {
    let count = 0
    const copyAll = sqlite.transaction(() => {
      // 复制条目
      const rows = sqlite.prepare(
        'SELECT * FROM cost_ledger WHERE project_id = ? AND batch_id = ?'
      ).all(projectId, sourceBatchId) as Record<string, any>[]

      const now = new Date().toISOString()
      const stmt = sqlite.prepare(`
        INSERT INTO cost_ledger (project_id, batch_id, voucher_no, date, direction, amount, category, summary, counterparty, channel, linked_invoice_id, linked_invoice_status, notes, attachments, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const row of rows) {
        stmt.run(
          row.project_id, newBatchId, row.voucher_no, row.date,
          row.direction, row.amount, row.category, row.summary,
          row.counterparty, row.channel, row.linked_invoice_id,
          row.linked_invoice_status, row.notes, row.attachments,
          now, now,
        )
        count++
      }
    })
    copyAll()
    return count
  } catch (err) {
    log.error('[SQLite] costLedgerBatches.copy error:', err)
    return 0
  }
}
