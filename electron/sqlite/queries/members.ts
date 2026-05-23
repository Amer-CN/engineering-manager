/**
 * 成员相关 SQLite 查询模块
 *
 * 实现 members、worker_teams、worker_transfer_records、project_members 四张表的 CRUD 操作。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// Members — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const MEM_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  email: 'email',
  memberType: 'member_type',
  role: 'role',
  workerType: 'worker_type',
  idCard: 'id_card',
  idCardFront: 'id_card_front',
  idCardBack: 'id_card_back',
  gender: 'gender',
  ethnicity: 'ethnicity',
  birthDate: 'birth_date',
  idCardAddress: 'id_card_address',
  contractFile: 'contract_file',
  contractFileType: 'contract_file_type',
  baseSalary: 'base_salary',
  socialSecurityPersonal: 'social_security_personal',
  socialSecurityCompany: 'social_security_company',
  housingFund: 'housing_fund',
  housingFundPersonal: 'housing_fund_personal',
  otherAllowances: 'other_allowances',
  companyCoversSocial: 'company_covers_social',
  teamId: 'team_id',
  dailyWage: 'daily_wage',
  entryDate: 'entry_date',
  expectedLeaveDate: 'expected_leave_date',
  actualLeaveDate: 'actual_leave_date',
  wageBankAccount: 'wage_bank_account',
  wageBankName: 'wage_bank_name',
  threeLevelEducation: 'three_level_education',
  safetyTrainingFile: 'safety_training_file',
  healthReportFile: 'health_report_file',
  specialCertificateFile: 'special_certificate_file',
  status: 'status',
  leaveDate: 'leave_date',
  reentryDate: 'reentry_date',
  remarks: 'remarks',
  departmentId: 'department_id',
  position: 'position',
  projectId: 'project_id',
  isTeamLeader: 'is_team_leader',
  createdAt: 'created_at',
}

const MEM_INSERT_COLS = Object.values(MEM_COLUMNS).filter(c => c !== 'id')
const MEM_INSERT_SQL = `INSERT INTO members (${MEM_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${MEM_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const TEAM_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  projectId: 'project_id',
  leaderId: 'leader_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const TEAM_INSERT_COLS = Object.values(TEAM_COLUMNS).filter(c => c !== 'id')
const TEAM_INSERT_SQL = `INSERT INTO worker_teams (${TEAM_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${TEAM_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Transfer Records — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const TRANSFER_COLUMNS: Record<string, string> = {
  id: 'id',
  workerId: 'worker_id',
  fromTeamId: 'from_team_id',
  toTeamId: 'to_team_id',
  fromProjectId: 'from_project_id',
  toProjectId: 'to_project_id',
  transferDate: 'transfer_date',
  reason: 'reason',
  createdAt: 'created_at',
}

const TRANSFER_INSERT_COLS = Object.values(TRANSFER_COLUMNS).filter(c => c !== 'id')
const TRANSFER_INSERT_SQL = `INSERT INTO worker_transfer_records (${TRANSFER_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${TRANSFER_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// Project Members — 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const PM_COLUMNS: Record<string, string> = {
  id: 'id',
  projectId: 'project_id',
  memberId: 'member_id',
  joinedAt: 'joined_at',
}

const PM_INSERT_COLS = Object.values(PM_COLUMNS).filter(c => c !== 'id')
const PM_INSERT_SQL = `INSERT INTO project_members (${PM_INSERT_COLS.map(c => `"${c}"`).join(', ')}) VALUES (${PM_INSERT_COLS.map(() => '?').join(', ')})`

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助：通用 INSERT 参数生成
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
// Members — 读操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listMembers(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare('SELECT * FROM members ORDER BY created_at DESC').all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] members.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Members — 写操作
// ═══════════════════════════════════════════════════════════════════════════════

export function createMember(member: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(MEM_COLUMNS, MEM_INSERT_COLS, member)
    sqlite.prepare(MEM_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] members.create error:', err)
    return false
  }
}

export function updateMember(member: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(MEM_COLUMNS, member, ['id'])
    if (!setSql) return true
    setParams.push(member.id)
    const result = sqlite.prepare(`UPDATE members SET ${setSql} WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] members.update error:', err)
    return false
  }
}

export function deleteMember(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM members WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] members.delete error:', err)
    return false
  }
}

/** 创建薪资历史记录（member create 时的副作用） */
export function createSalaryHistory(entry: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare(`
      INSERT INTO salary_history (member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.memberId,
      entry.effectiveDate,
      toSqliteValue(entry.baseSalary),
      toSqliteValue(entry.subsidy ?? 0),
      entry.subsidyNote || '',
      entry.note || '',
      entry.createdAt || new Date().toISOString(),
    )
    return true
  } catch (err) {
    log.error('[SQLite] salaryHistory.create error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 读操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listTeams(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare(`
      SELECT t.*,
        p.name as project_name,
        m.name as leader_name
      FROM worker_teams t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.leader_id = m.id
      ORDER BY t.created_at DESC
    `).all() as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      camel.projectName = (row as any).project_name || ''
      camel.leaderName = (row as any).leader_name || ''
      return camel
    })
  } catch (err) {
    log.error('[SQLite] workerTeams.list error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 写操作
// ═══════════════════════════════════════════════════════════════════════════════

export function createTeam(team: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(TEAM_COLUMNS, TEAM_INSERT_COLS, team)
    sqlite.prepare(TEAM_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] workerTeams.create error:', err)
    return false
  }
}

export function updateTeam(team: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(TEAM_COLUMNS, team, ['id'])
    // 始终更新 updated_at
    setParams.push(new Date().toISOString())
    setParams.push(team.id)
    const result = sqlite.prepare(`UPDATE worker_teams SET ${setSql}, "updated_at" = ? WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] workerTeams.update error:', err)
    return false
  }
}

export function deleteTeam(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM worker_teams WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] workerTeams.delete error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Worker Transfer Records — 操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listTransferRecords(workerId?: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    let sql = 'SELECT * FROM worker_transfer_records'
    const params: any[] = []
    if (workerId) {
      sql += ' WHERE worker_id = ?'
      params.push(workerId)
    }
    sql += ' ORDER BY transfer_date DESC'
    const rows = sqlite.prepare(sql).all(...params) as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] transferRecords.list error:', err)
    return null
  }
}

export function createTransferRecord(record: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(TRANSFER_COLUMNS, TRANSFER_INSERT_COLS, record)
    sqlite.prepare(TRANSFER_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] transferRecords.create error:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Project Members — 操作
// ═══════════════════════════════════════════════════════════════════════════════

export function listProjectMembers(projectId: number): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null
  try {
    const rows = sqlite.prepare(`
      SELECT pm.*, m.name as member_name, m.phone as member_phone, m.role as member_role,
        m.member_type, m.id_card as member_id_card
      FROM project_members pm
      LEFT JOIN members m ON pm.member_id = m.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at DESC
    `).all(projectId) as Record<string, any>[]
    return rows.map(row => {
      const camel = rowToCamel(row)
      // 构建 member 子对象，供前端使用
      camel.member = {
        id: camel.memberId,
        name: (row as any).member_name || '',
        phone: (row as any).member_phone || '',
        role: (row as any).member_role || '',
        memberType: camel.memberType,
        idCard: (row as any).member_id_card || '',
      }
      // 清理冗余字段
      delete (camel as any).member_name
      delete (camel as any).member_phone
      delete (camel as any).member_role
      delete (camel as any).member_id_card
      return camel
    })
  } catch (err) {
    log.error('[SQLite] projectMembers.list error:', err)
    return null
  }
}

export function addProjectMember(entry: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const params = toInsertParams(PM_COLUMNS, PM_INSERT_COLS, entry)
    sqlite.prepare(PM_INSERT_SQL).run(...params)
    return true
  } catch (err) {
    log.error('[SQLite] projectMembers.add error:', err)
    return false
  }
}

export function updateProjectMember(id: number, changes: any): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    const { sql: setSql, params: setParams } = toUpdateSet(PM_COLUMNS, changes, ['id', 'projectId', 'memberId'])
    if (!setSql) return true
    setParams.push(id)
    const result = sqlite.prepare(`UPDATE project_members SET ${setSql} WHERE id = ?`).run(...setParams)
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] projectMembers.update error:', err)
    return false
  }
}

export function removeProjectMember(id: number): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false
  try {
    sqlite.prepare('DELETE FROM project_members WHERE id = ?').run(id)
    return true
  } catch (err) {
    log.error('[SQLite] projectMembers.remove error:', err)
    return false
  }
}
