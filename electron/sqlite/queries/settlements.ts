/**
 * 结算 + 合同模板 SQLite 查询模块
 *
 * 实现 settlements + contract_templates 两张表的 CRUD 操作。
 * 特点：
 * - settlements: getAll 富化 projectName/partnerName，process/unarchive 业务逻辑
 * - contractTemplates: 简单 CRUD
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 结算列映射
// ═══════════════════════════════════════════════════════════════════════════════

const SET_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  contractId: 'contract_id',
  partnerId: 'partner_id',
  type: 'type',
  subType: 'sub_type',
  status: 'status',
  settlementNo: 'settlement_no',
  name: 'name',
  amount: 'amount',
  settlementDate: 'settlement_date',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  submittedBy: 'submitted_by',
  submittedAt: 'submitted_at',
  approvedBy: 'approved_by',
  approvedAt: 'approved_at',
  paidAt: 'paid_at',
  remarks: 'remarks',
  items: 'items',
  files: 'files',
  fileUrl: 'file_url',
  fileName: 'file_name',
  fileType: 'file_type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const SET_INSERT_COLS = Object.values(SET_COLUMNS).filter(c => c !== 'id')
const SET_INSERT_SQL = `INSERT INTO settlements (${SET_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${SET_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 结算操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出结算（可按项目过滤，富化名称） */
export function listSettlements(projectId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    let sql = `SELECT s.*,
      p.name AS project_name,
      pt.name AS partner_name
    FROM settlements s
    LEFT JOIN projects p ON p.id = s.project_id
    LEFT JOIN partners pt ON pt.id = s.partner_id`
    const params: any[] = []
    if (projectId) {
      sql += ' WHERE s.project_id = ?'
      params.push(projectId)
    }
    sql += ' ORDER BY s.created_at DESC'

    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      // 旧状态迁移
      let status = camel.status
      if (status === 'draft' || status === 'approved' || status === 'paid' || !status) status = 'pending'
      return {
        ...camel,
        status,
        projectName: row.project_name || '',
        partnerName: row.partner_name || ''
      }
    })
  } catch (err) {
    log.error('[SQLite] settlements.list error:', err)
    return null
  }
}

/** 创建结算 */
export function createSettlement(settlement: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = SET_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(SET_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      if (col === 'status' && !settlement.status) return toSqliteValue('pending')
      return toSqliteValue(settlement[jsonKey])
    })
    sqlite.prepare(SET_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] settlements.create error:', err)
    return false
  }
}

/** 更新结算 */
export function updateSettlement(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = SET_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE settlements SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] settlements.update error:', err)
    return false
  }
}

/** 删除结算 */
export function deleteSettlement(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM settlements WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] settlements.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板列映射
// ═══════════════════════════════════════════════════════════════════════════════

const CT_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  type: 'type',
  description: 'description',
  filePath: 'file_path',
  fileName: 'file_name',
  variables: 'variables',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const CT_INSERT_COLS = Object.values(CT_COLUMNS).filter(c => c !== 'id')
const CT_INSERT_SQL = `INSERT INTO contract_templates (${CT_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${CT_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有合同模板 */
export function listContractTemplates(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare('SELECT * FROM contract_templates ORDER BY created_at DESC').all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] contractTemplates.list error:', err)
    return null
  }
}

/** 创建合同模板 */
export function createContractTemplate(template: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const now = new Date().toISOString()
    const params = CT_INSERT_COLS.map(col => {
      const jsonKey = Object.entries(CT_COLUMNS).find(([, c]) => c === col)?.[0]
      if (!jsonKey) return null
      if (col === 'created_at' || col === 'updated_at') return toSqliteValue(now)
      return toSqliteValue(template[jsonKey])
    })
    sqlite.prepare(CT_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] contractTemplates.create error:', err)
    return false
  }
}

/** 更新合同模板 */
export function updateContractTemplate(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const setClauses: string[] = []
    const params: any[] = []

    for (const [jsonKey, value] of Object.entries(changes)) {
      const col = CT_COLUMNS[jsonKey]
      if (!col || col === 'id') continue
      setClauses.push(`"${col}" = ?`)
      params.push(toSqliteValue(value))
    }

    if (setClauses.length === 0) return true

    setClauses.push('"updated_at" = ?')
    params.push(new Date().toISOString())

    params.push(id)
    const sql = `UPDATE contract_templates SET ${setClauses.join(', ')} WHERE id = ?`
    const result = sqlite.prepare(sql).run(...params)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] contractTemplates.update error:', err)
    return false
  }
}

/** 删除合同模板 */
export function deleteContractTemplate(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('DELETE FROM contract_templates WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] contractTemplates.delete error:', err)
    return false
  }
}
