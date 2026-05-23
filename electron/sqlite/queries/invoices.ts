/**
 * 发票 & 收款记录 SQLite 查询模块
 *
 * 实现 invoices、payment_records 两张表的 CRUD 操作。
 * 包含发票状态同步逻辑。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// Invoices — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const INV_COLUMNS: Record<string, string> = {
  id: 'id',
  type: 'type',
  status: 'status',
  invoiceKind: 'invoice_kind',
  invoiceNo: 'invoice_no',
  invoiceCode: 'invoice_code',
  name: 'name',
  amount: 'amount',
  taxAmount: 'tax_amount',
  priceAmount: 'price_amount',
  taxRate: 'tax_rate',
  issueDate: 'issue_date',
  sellerId: 'seller_id',
  buyerId: 'buyer_id',
  settlementId: 'settlement_id',
  projectId: 'project_id',
  contractId: 'contract_id',
  receivedAmount: 'received_amount',
  fileUrl: 'file_url',
  fileType: 'file_type',
  remarks: 'remarks',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const INV_INSERT_COLS = Object.values(INV_COLUMNS).filter(c => c !== 'id')
const INV_INSERT_SQL = `INSERT INTO invoices (${INV_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${INV_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Records — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const PAY_COLUMNS: Record<string, string> = {
  id: 'id',
  type: 'type',
  amount: 'amount',
  recordDate: 'record_date',
  projectId: 'project_id',
  partnerId: 'partner_id',
  contractId: 'contract_id',
  invoiceDetails: 'invoice_details',
  remarks: 'remarks',
  createdAt: 'created_at',
  fileUrl: 'file_url',
  fileType: 'file_type',
}

const PAY_INSERT_COLS = Object.values(PAY_COLUMNS).filter(c => c !== 'id')
const PAY_INSERT_SQL = `INSERT INTO payment_records (${PAY_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${PAY_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════════════════════════════

function toInsertParams(columns: Record<string, string>, insertCols: string[], obj: Record<string, any>): any[] {
  return insertCols.map(col => {
    const jsonKey = Object.entries(columns).find(([, c]) => c === col)?.[0]
    if (!jsonKey) return null
    return toSqliteValue(obj[jsonKey])
  })
}

function toUpdateSet(columns: Record<string, string>, changes: Record<string, any>, excludeKeys: string[] = []): { sql: string; params: any[] } {
  const setClauses: string[] = []
  const params: any[] = []
  for (const [jsonKey, value] of Object.entries(changes)) {
    if (excludeKeys.includes(jsonKey)) continue
    const col = columns[jsonKey]
    if (!col) continue
    setClauses.push(`"${col}" = ?`)
    params.push(toSqliteValue(value))
  }
  return { sql: setClauses.join(', '), params }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Invoices — 操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出发票（含 sellerName、buyerName、projectName、contractName、computed receivedAmount/status） */
export function listInvoices(type?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    let sql = `
      SELECT i.*,
        s.name as seller_name,
        b.name as buyer_name,
        p.name as project_name,
        COALESCE(ic.name, ec.name, ac.name, '') as contract_name
      FROM invoices i
      LEFT JOIN partners s ON i.seller_id = s.id
      LEFT JOIN partners b ON i.buyer_id = b.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN income_contracts ic ON i.contract_id = ic.id
      LEFT JOIN expense_contracts ec ON i.contract_id = ec.id
      LEFT JOIN agreement_contracts ac ON i.contract_id = ac.id
    `
    const params: any[] = []
    if (type) {
      sql += ' WHERE i.type = ?'
      params.push(type)
    }
    sql += ' ORDER BY i.created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.sellerName = (row as any).seller_name || ''
      camel.buyerName = (row as any).buyer_name || ''
      camel.projectName = (row as any).project_name || ''
      camel.contractName = (row as any).contract_name || ''
      delete (camel as any).seller_name
      delete (camel as any).buyer_name
      delete (camel as any).project_name
      delete (camel as any).contract_name
      return camel
    })
  } catch (err) {
    log.error('[SQLite] invoices.list error:', err)
    return null
  }
}

/** 创建发票 */
export function createInvoice(invoice: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(INV_COLUMNS, INV_INSERT_COLS, invoice)
    sqlite.prepare(INV_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] invoices.create error:', err)
    return false
  }
}

/** 更新发票 */
export function updateInvoice(invoice: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(INV_COLUMNS, invoice, ['id'])
    if (!setSql) return true
    setParams.push(new Date().toISOString())
    setParams.push(invoice.id)
    const result = sqlite.prepare(`UPDATE invoices SET ${setSql}, "updated_at" = ? WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] invoices.update error:', err)
    return false
  }
}

/** 更新发票状态 */
export function updateInvoiceStatus(id: number, status: string): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), id)
    return true
  } catch (err) {
    log.error('[SQLite] invoices.updateStatus error:', err)
    return false
  }
}

/** 更新发票的 receivedAmount 和 status */
export function updateInvoiceReceived(id: number, receivedAmount: number, status: string): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('UPDATE invoices SET received_amount = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(receivedAmount, status, new Date().toISOString(), id)
    return true
  } catch (err) {
    log.error('[SQLite] invoices.updateReceived error:', err)
    return false
  }
}

/** 删除发票 */
export function deleteInvoice(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM invoices WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] invoices.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Payment Records — 操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出收款记录（含 projectName、partnerName、contractName、invoiceInfos） */
export function listPaymentRecords(type?: string): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    let sql = `
      SELECT pr.*,
        p.name as project_name,
        pt.name as partner_name,
        COALESCE(ic.name, ec.name, ac.name, '') as contract_name
      FROM payment_records pr
      LEFT JOIN projects p ON pr.project_id = p.id
      LEFT JOIN partners pt ON pr.partner_id = pt.id
      LEFT JOIN income_contracts ic ON pr.contract_id = ic.id
      LEFT JOIN expense_contracts ec ON pr.contract_id = ec.id
      LEFT JOIN agreement_contracts ac ON pr.contract_id = ac.id
    `
    const params: any[] = []
    if (type) {
      sql += ' WHERE pr.type = ?'
      params.push(type)
    }
    sql += ' ORDER BY pr.record_date DESC, pr.created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.projectName = (row as any).project_name || ''
      camel.partnerName = (row as any).partner_name || ''
      camel.contractName = (row as any).contract_name || ''
      delete (camel as any).project_name
      delete (camel as any).partner_name
      delete (camel as any).contract_name

      // 解析 invoiceDetails 并补充发票信息
      const invoiceDetails = camel.invoiceDetails || []
      const invoiceInfos = invoiceDetails.map((d: any) => {
        const invRow = sqlite.prepare('SELECT invoice_no, name, amount FROM invoices WHERE id = ?').get(d.invoiceId) as any
        return {
          invoiceId: d.invoiceId,
          invoiceNo: invRow?.invoice_no || '',
          invoiceName: invRow?.name || '',
          invoiceAmount: invRow?.amount || 0,
          paymentAmount: d.paymentAmount,
        }
      })
      camel.invoiceInfos = invoiceInfos
      return camel
    })
  } catch (err) {
    log.error('[SQLite] paymentRecords.list error:', err)
    return null
  }
}

/** 创建收款记录 */
export function createPaymentRecord(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(PAY_COLUMNS, PAY_INSERT_COLS, record)
    sqlite.prepare(PAY_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] paymentRecords.create error:', err)
    return false
  }
}

/** 更新收款记录 */
export function updatePaymentRecord(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(PAY_COLUMNS, record, ['id'])
    if (!setSql) return true
    setParams.push(record.id)
    const result = sqlite.prepare(`UPDATE payment_records SET ${setSql} WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] paymentRecords.update error:', err)
    return false
  }
}

/** 删除收款记录 */
export function deletePaymentRecord(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM payment_records WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] paymentRecords.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 发票状态重算（SQLite 版，供 paymentRecords 的 update/delete 后调用）
// ═══════════════════════════════════════════════════════════════════════════════

/** 重新计算所有发票的 receivedAmount 和 status */
export function recalculateInvoiceStatusSqlite(): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const invoices = sqlite.prepare('SELECT id, amount, received_amount FROM invoices').all() as { id: number; amount: number; received_amount: number }[]
    for (const inv of invoices) {
      // 从 payment_records 的 invoice_details JSON 中计算每张发票的累计收款
      const paymentRows = sqlite.prepare('SELECT invoice_details FROM payment_records').all() as { invoice_details: string }[]
      let totalReceived = 0
      for (const pr of paymentRows) {
        try {
          const details = JSON.parse(pr.invoice_details || '[]')
          for (const d of details) {
            if (d.invoiceId === inv.id) {
              totalReceived += (d.paymentAmount || 0)
            }
          }
        } catch { /* skip malformed JSON */ }
      }
      let status = 'issued'
      if (totalReceived >= (inv.amount || 0)) {
        status = 'received'
      } else if (totalReceived > 0) {
        status = 'partially_paid'
      }
      sqlite.prepare('UPDATE invoices SET received_amount = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(totalReceived, status, new Date().toISOString(), inv.id)
    }
    return true
  } catch (err) {
    log.error('[SQLite] recalculateInvoiceStatus error:', err)
    return false
  }
}
