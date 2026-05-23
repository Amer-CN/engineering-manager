/**
 * 合作/监管单位相关 SQLite 查询模块
 *
 * 实现 partners、regions、supervisors 三张表的 CRUD 操作。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// Partners — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const PART_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  category: 'category',
  contact: 'contact',
  phone: 'phone',
  email: 'email',
  address: 'address',
  bankAccount: 'bank_account',
  bankName: 'bank_name',
  taxNumber: 'tax_number',
  creditCode: 'credit_code',
  registeredAddress: 'registered_address',
  businessScope: 'business_scope',
  taxType: 'tax_type',
  licenseFile: 'license_file',
  licenseFileType: 'license_file_type',
  otherFiles: 'other_files',
  otherFilesType: 'other_files_type',
  projectIds: 'project_ids',
  remarks: 'remarks',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const PART_INSERT_COLS = Object.values(PART_COLUMNS).filter(c => c !== 'id')
const PART_INSERT_SQL = `INSERT INTO partners (${PART_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${PART_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Regions — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const REG_COLUMNS: Record<string, string> = {
  id: 'id',
  province: 'province',
  city: 'city',
  district: 'district',
  createdAt: 'created_at',
}

const REG_INSERT_COLS = Object.values(REG_COLUMNS).filter(c => c !== 'id')
const REG_INSERT_SQL = `INSERT INTO regions (${REG_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${REG_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Supervisors — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const SUP_COLUMNS: Record<string, string> = {
  id: 'id',
  regionId: 'region_id',
  name: 'name',
  category: 'category',
  contact: 'contact',
  phone: 'phone',
  address: 'address',
  projectIds: 'project_ids',
  remarks: 'remarks',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const SUP_INSERT_COLS = Object.values(SUP_COLUMNS).filter(c => c !== 'id')
const SUP_INSERT_SQL = `INSERT INTO supervisors (${SUP_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${SUP_INSERT_COLS.map(() => '?').join(', ')})`

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

/** 从 project_ids JSON 数组解析项目名称 */
function resolveProjectNames(projectIdsJson: string | null, sqlite: any): string {
  if (!projectIdsJson) return ''
  try {
    const ids: number[] = JSON.parse(projectIdsJson)
    if (!ids.length) return ''
    const names = ids.map(id => {
      const row = sqlite.prepare('SELECT name FROM projects WHERE id = ?').get(id) as { name: string } | undefined
      return row?.name || ''
    }).filter(Boolean)
    return names.join(', ')
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Partners — 操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listPartners(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare('SELECT * FROM partners ORDER BY created_at DESC').all() as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.projectNames = resolveProjectNames(row.project_ids, sqlite)
      return camel
    })
  } catch (err) {
    log.error('[SQLite] partners.list error:', err)
    return null
  }
}

export function createPartner(partner: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(PART_COLUMNS, PART_INSERT_COLS, partner)
    sqlite.prepare(PART_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] partners.create error:', err)
    return false
  }
}

export function updatePartner(partner: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(PART_COLUMNS, partner, ['id'])
    if (!setSql) return true
    setParams.push(new Date().toISOString())
    setParams.push(partner.id)
    const result = sqlite.prepare(`UPDATE partners SET ${setSql}, "updated_at" = ? WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] partners.update error:', err)
    return false
  }
}

export function deletePartner(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM partners WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] partners.delete error:', err)
    return false
  }
}

export function listPartnersByProject(projectId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    // project_ids 是 JSON 数组，需要用 LIKE 粗筛 + JS 精筛
    const rows = sqlite.prepare('SELECT * FROM partners').all() as Record<string, any>[]
    const filtered = rows.filter(row => {
      try {
        const ids: number[] = JSON.parse(row.project_ids || '[]')
        return ids.includes(projectId)
      } catch { return false }
    })
    return filtered.map(row => {
      const camel = rowToCamel(row)
      camel.projectNames = resolveProjectNames(row.project_ids, sqlite)
      return camel
    })
  } catch (err) {
    log.error('[SQLite] partners.listByProject error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Regions — 操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listRegions(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare('SELECT * FROM regions ORDER BY created_at DESC').all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] regions.list error:', err)
    return null
  }
}

export function createRegion(region: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(REG_COLUMNS, REG_INSERT_COLS, region)
    sqlite.prepare(REG_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] regions.create error:', err)
    return false
  }
}

/** 检查地区是否被监管单位引用 */
export function countRegionRefs(regionId: number): number | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const row = sqlite.prepare('SELECT COUNT(*) as count FROM supervisors WHERE region_id = ?').get(regionId) as { count: number }
    return row.count
  } catch (err) {
    log.error('[SQLite] regions.countRefs error:', err)
    return null
  }
}

export function deleteRegion(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM regions WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] regions.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Supervisors — 操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listSupervisors(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare(`
      SELECT s.*,
        CASE WHEN r.id IS NOT NULL THEN r.province || '-' || r.city || '-' || r.district ELSE '' END as region_name
      FROM supervisors s
      LEFT JOIN regions r ON s.region_id = r.id
      ORDER BY s.created_at DESC
    `).all() as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.regionName = (row as any).region_name || ''
      camel.projectNames = resolveProjectNames(row.project_ids, sqlite)
      return camel
    })
  } catch (err) {
    log.error('[SQLite] supervisors.list error:', err)
    return null
  }
}

export function createSupervisor(supervisor: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(SUP_COLUMNS, SUP_INSERT_COLS, supervisor)
    sqlite.prepare(SUP_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] supervisors.create error:', err)
    return false
  }
}

export function updateSupervisor(supervisor: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(SUP_COLUMNS, supervisor, ['id'])
    if (!setSql) return true
    setParams.push(new Date().toISOString())
    setParams.push(supervisor.id)
    const result = sqlite.prepare(`UPDATE supervisors SET ${setSql}, "updated_at" = ? WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] supervisors.update error:', err)
    return false
  }
}

export function deleteSupervisor(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM supervisors WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] supervisors.delete error:', err)
    return false
  }
}
