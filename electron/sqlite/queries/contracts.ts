/**
 * 合同管理 SQLite 查询模块
 *
 * 实现 income_contracts、income_records、expense_contracts、expense_records、
 * agreement_contracts 五张表的 CRUD 操作。
 * 采用工厂模式消除三种合同类型的重复代码。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 合同列映射（三种合同结构相同）
// ═══════════════════════════════════════════════════════════════════════════════

const CONTRACT_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  partnerId: 'partner_id',
  contractNo: 'contract_no',
  name: 'name',
  amount: 'amount',
  signedDate: 'signed_date',
  startDate: 'start_date',
  endDate: 'end_date',
  status: 'status',
  paymentMethod: 'payment_method',
  remarks: 'remarks',
  finalAmount: 'final_amount',
  settlementId: 'settlement_id',
  fileUrl: 'file_url',
  fileType: 'file_type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

// 其他协议多一个 agreement_type 字段
const AGREEMENT_EXTRA: Record<string, string> = {
  agreementType: 'agreement_type',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 收入/支出记录列映射
// ═══════════════════════════════════════════════════════════════════════════════

const INCOME_RECORD_COLUMNS: Record<string, string> = {
  id: 'id',
  contractId: 'contract_id',
  amount: 'amount',
  recordDate: 'record_date',
  payer: 'payer',
  remarks: 'remarks',
  createdAt: 'created_at',
}

const EXPENSE_RECORD_COLUMNS: Record<string, string> = {
  id: 'id',
  contractId: 'contract_id',
  amount: 'amount',
  recordDate: 'record_date',
  payee: 'payee',
  remarks: 'remarks',
  createdAt: 'created_at',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

function toInsertParams(columns: Record<string, string>, obj: Record<string, any>): any[] {
  const insertCols = Object.values(columns).filter(c => c !== 'id')
  return insertCols.map(col => {
    const jsonKey = Object.entries(columns).find(([, c]) => c === col)?.[0]
    if (!jsonKey) return null
    return toSqliteValue(obj[jsonKey])
  })
}

function getInsertSQL(tableName: string, columns: Record<string, string>): string {
  const insertCols = Object.values(columns).filter(c => c !== 'id')
  return `INSERT INTO "${tableName}" (${insertCols.map(c => `"${c}"`).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`
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
// 合同操作（工厂模式）
// ═══════════════════════════════════════════════════════════════════════════════

type ContractType = 'income' | 'expense' | 'agreement'

const TABLE_MAP: Record<ContractType, { contractTable: string; recordTable: string }> = {
  income: { contractTable: 'income_contracts', recordTable: 'income_records' },
  expense: { contractTable: 'expense_contracts', recordTable: 'expense_records' },
  agreement: { contractTable: 'agreement_contracts', recordTable: '' },
}

const COLUMNS_MAP: Record<ContractType, Record<string, string>> = {
  income: CONTRACT_COLUMNS,
  expense: CONTRACT_COLUMNS,
  agreement: { ...CONTRACT_COLUMNS, ...AGREEMENT_EXTRA },
}

const RECORD_COLUMNS_MAP: Record<string, Record<string, string>> = {
  income_records: INCOME_RECORD_COLUMNS,
  expense_records: EXPENSE_RECORD_COLUMNS,
}

/** 列出合同（含项目名、合作方名、收款/付款金额） */
export function listContracts(type: ContractType, projectId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const { contractTable, recordTable } = TABLE_MAP[type]
    const columns = COLUMNS_MAP[type]
    let sql = `SELECT c.*, p.name as project_name, pt.name as partner_name`
    if (recordTable) {
      const amountCol = type === 'income' ? 'received_amount' : 'paid_amount'
      sql += `, COALESCE(r.${amountCol}, 0) as computed_${amountCol}`
    }
    sql += ` FROM "${contractTable}" c`
    sql += ` LEFT JOIN projects p ON c.project_id = p.id`
    sql += ` LEFT JOIN partners pt ON c.partner_id = pt.id`
    if (recordTable) {
      const amountCol = type === 'income' ? 'received_amount' : 'paid_amount'
      sql += ` LEFT JOIN (SELECT contract_id, SUM(amount) as ${amountCol} FROM "${recordTable}" GROUP BY contract_id) r ON c.id = r.contract_id`
    }
    const params: any[] = []
    if (projectId) {
      sql += ' WHERE c.project_id = ?'
      params.push(projectId)
    }
    sql += ' ORDER BY c.created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.projectName = (row as any).project_name || ''
      camel.partnerName = (row as any).partner_name || ''
      if (recordTable) {
        const amountKey = type === 'income' ? 'receivedAmount' : 'paidAmount'
        const computedKey = type === 'income' ? 'computed_received_amount' : 'computed_paid_amount'
        camel[amountKey] = (row as any)[computedKey] || 0
        delete (camel as any)[computedKey.replace(/^computed_/, '')]
      }
      // 清理临时字段
      delete (camel as any).project_name
      delete (camel as any).partner_name
      return camel
    })
  } catch (err) {
    log.error(`[SQLite] contracts.list(${type}) error:`, err)
    return null
  }
}

/** 创建合同 */
export function createContract(type: ContractType, contract: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { contractTable } = TABLE_MAP[type]
    const columns = COLUMNS_MAP[type]
    const params = toInsertParams(columns, contract)
    const sql = getInsertSQL(contractTable, columns)
    sqlite.prepare(sql).run(...params)
    return true
  } catch (err) {
    log.error(`[SQLite] contracts.create(${type}) error:`, err)
    return false
  }
}

/** 更新合同 */
export function updateContract(type: ContractType, contract: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { contractTable } = TABLE_MAP[type]
    const columns = COLUMNS_MAP[type]
    const { sql: setSql, params: setParams } = toUpdateSet(columns, contract, ['id'])
    if (!setSql) return true
    setParams.push(new Date().toISOString())
    setParams.push(contract.id)
    const result = sqlite.prepare(`UPDATE "${contractTable}" SET ${setSql}, "updated_at" = ? WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error(`[SQLite] contracts.update(${type}) error:`, err)
    return false
  }
}

/** 删除合同（含级联删除记录） */
export function deleteContract(type: ContractType, id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { contractTable, recordTable } = TABLE_MAP[type]
    const doDelete = sqlite.transaction(() => {
      if (recordTable) {
        sqlite.prepare(`DELETE FROM "${recordTable}" WHERE contract_id = ?`).run(id)
      }
      sqlite.prepare(`DELETE FROM "${contractTable}" WHERE id = ?`).run(id)
    })
    doDelete()
    return true
  } catch (err) {
    log.error(`[SQLite] contracts.delete(${type}) error:`, err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 收入/支出记录操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出记录 */
export function listRecords(type: 'income' | 'expense', contractId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const { recordTable } = TABLE_MAP[type]
    const rows = sqlite.prepare(`SELECT * FROM "${recordTable}" WHERE contract_id = ?`).all(contractId) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error(`[SQLite] records.list(${type}) error:`, err)
    return null
  }
}

/** 创建记录 */
export function createRecord(type: 'income' | 'expense', record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { recordTable } = TABLE_MAP[type]
    const columns = RECORD_COLUMNS_MAP[recordTable]
    const params = toInsertParams(columns, record)
    const sql = getInsertSQL(recordTable, columns)
    sqlite.prepare(sql).run(...params)
    return true
  } catch (err) {
    log.error(`[SQLite] records.create(${type}) error:`, err)
    return false
  }
}

/** 删除记录 */
export function deleteRecord(type: 'income' | 'expense', id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { recordTable } = TABLE_MAP[type]
    sqlite.prepare(`DELETE FROM "${recordTable}" WHERE id = ?`).run(id)
    return true
  } catch (err) {
    log.error(`[SQLite] records.delete(${type}) error:`, err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 合同统计
// ═══════════════════════════════════════════════════════════════════════════════

export function getContractStats(): any | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    // 收入合同总额
    const incomeRow = sqlite.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(final_amount, amount, 0)), 0) as total FROM income_contracts'
    ).get() as { count: number; total: number }
    // 支出合同总额
    const expenseRow = sqlite.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(final_amount, amount, 0)), 0) as total FROM expense_contracts'
    ).get() as { count: number; total: number }
    // 其他协议数量
    const agreementRow = sqlite.prepare(
      'SELECT COUNT(*) as count FROM agreement_contracts'
    ).get() as { count: number }
    // 收款总额
    const incomeReceivedRow = sqlite.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payment_records WHERE type = 'invoice_out'"
    ).get() as { total: number }
    // 支出总额
    const expensePaidRow = sqlite.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM payment_records WHERE type = 'invoice_in'"
    ).get() as { total: number }

    // 即将到期的合同（30天内）
    const now = new Date().toISOString().split('T')[0]
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const expiringIncome = sqlite.prepare(
      `SELECT id, 'income' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM income_contracts WHERE end_date >= ? AND end_date <= ?`
    ).all(now, thirtyDaysLater) as any[]
    const expiringExpense = sqlite.prepare(
      `SELECT id, 'expense' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM expense_contracts WHERE end_date >= ? AND end_date <= ?`
    ).all(now, thirtyDaysLater) as any[]
    const expiringAgreement = sqlite.prepare(
      `SELECT id, 'agreement' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM agreement_contracts WHERE end_date >= ? AND end_date <= ?`
    ).all(now, thirtyDaysLater) as any[]

    const expiringSoon = [
      ...expiringIncome.map(r => rowToCamel(r)),
      ...expiringExpense.map(r => rowToCamel(r)),
      ...expiringAgreement.map(r => rowToCamel(r)),
    ].sort((a: any, b: any) => a.daysLeft - b.daysLeft)

    return {
      incomeCount: incomeRow.count,
      incomeTotal: incomeRow.total,
      incomeReceived: incomeReceivedRow.total,
      expenseCount: expenseRow.count,
      expenseTotal: expenseRow.total,
      expensePaid: expensePaidRow.total,
      agreementCount: agreementRow.count,
      netIncome: incomeRow.total - expenseRow.total,
      netReceived: incomeReceivedRow.total - expensePaidRow.total,
      expiringSoon,
    }
  } catch (err) {
    log.error('[SQLite] contractStats.get error:', err)
    return null
  }
}
