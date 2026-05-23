/**
 * 进销存 SQLite 查询模块
 *
 * 实现 inventory_items + inventory_transactions 两张表的 CRUD 操作。
 * 特点：transactions 读取时 JOIN inventory_items/projects/partners 做名称富化。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 物料列映射
// ═══════════════════════════════════════════════════════════════════════════════

const ITEM_COLUMNS: Record<string, string> = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  specifications: 'specifications',
  purchasePrice: 'purchase_price',
  salePrice: 'sale_price',
  currentStock: 'current_stock',
  minStock: 'min_stock',
  maxStock: 'max_stock',
  supplierId: 'supplier_id',
  remarks: 'remarks',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const ITEM_INSERT_COLS = Object.values(ITEM_COLUMNS).filter(c => c !== 'id')
const ITEM_INSERT_SQL = `INSERT INTO inventory_items (${ITEM_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${ITEM_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 物料读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有物料（按创建时间降序） */
export function listInventoryItems(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare('SELECT * FROM inventory_items ORDER BY created_at DESC').all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] inventoryItems.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 物料写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建物料 */
export function createInventoryItem(item: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = ITEM_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(ITEM_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      return toSqliteValue(item[jsonKey])
    })
    sqlite.prepare(ITEM_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] inventoryItems.create error:', err)
    return false
  }
}

/** 更新物料 */
export function updateInventoryItem(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = ITEM_COLUMNS[jsonKey]
      if (!col || col === 'id' || col === 'created_at') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length > 0) {
      setClauses.push('"updated_at" = ?')
      params.push(new Date().toISOString())
    }

    if (setClauses.length === 0) return true

    params.push(id)
    const sql = `UPDATE inventory_items SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] inventoryItems.update error:', err)
    return false
  }
}

/** 删除物料 */
export function deleteInventoryItem(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM inventory_items WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] inventoryItems.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 出入库列映射
// ═══════════════════════════════════════════════════════════════════════════════

const TXN_COLUMNS: Record<string, string> = {
  id: 'id',
  itemId: 'item_id',
  type: 'type',
  quantity: 'quantity',
  unitPrice: 'unit_price',
  totalAmount: 'total_amount',
  projectId: 'project_id',
  contractId: 'contract_id',
  counterpartyId: 'counterparty_id',
  transactionDate: 'transaction_date',
  documentNo: 'document_no',
  remarks: 'remarks',
  createdAt: 'created_at',
}

const TXN_INSERT_COLS = Object.values(TXN_COLUMNS).filter(c => c !== 'id')
const TXN_INSERT_SQL = `INSERT INTO inventory_transactions (${TXN_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${TXN_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 出入库读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出出入库记录（可按物料过滤，富化名称） */
export function listTransactions(itemId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = `SELECT t.*,
      i.name AS item_name,
      p.name AS project_name,
      pt.name AS counterparty_name
    FROM inventory_transactions t
    LEFT JOIN inventory_items i ON i.id = t.item_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN partners pt ON pt.id = t.counterparty_id`
    const params: any[] = []
    if (itemId) {
      sql += ' WHERE t.item_id = ?'
      params.push(itemId)
    }
    sql += ' ORDER BY t.transaction_date DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.itemName = row.item_name || ''
      camel.projectName = row.project_name || ''
      camel.counterpartyName = row.counterparty_name || ''
      return camel
    })
  } catch (err) {
    log.error('[SQLite] inventoryTransactions.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 出入库写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 创建出入库记录 */
export function createTransaction(txn: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = TXN_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(TXN_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at') return toSqliteValue(now)
      return toSqliteValue(txn[jsonKey])
    })
    sqlite.prepare(TXN_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] inventoryTransactions.create error:', err)
    return false
  }
}
