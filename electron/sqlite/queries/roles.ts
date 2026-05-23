/**
 * 角色 SQLite 查询模块
 *
 * 实现 roles 表的 CRUD 操作。
 * 特点：roles.id 是 TEXT 主键（admin/manager/accountant/worker），非自增。
 */

import log from 'electron-log'
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers'

// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_COLUMNS: Record<string, string> = {
  id: 'id',
  name: 'name',
  description: 'description',
  isSystem: 'is_system',
  permissions: 'permissions',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 列出所有角色 */
export function listRoles(): any[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const rows = sqlite.prepare('SELECT * FROM roles').all() as Record<string, any>[]
    return rows.map(rowToCamel)
  } catch (err) {
    log.error('[SQLite] roles.list error:', err)
    return null
  }
}

/** 获取单个角色的权限列表 */
export function getRolePermissions(roleId: string): string[] | null {
  const sqlite = tryGetSqlite()
  if (!sqlite) return null

  try {
    const row = sqlite.prepare('SELECT permissions FROM roles WHERE id = ?').get(roleId) as { permissions: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.permissions)
    } catch {
      return []
    }
  } catch (err) {
    log.error('[SQLite] roles.getPermissions error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════

/** 更新角色权限 */
export function updateRolePermissions(roleId: string, permissions: string[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(
      JSON.stringify(permissions),
      roleId
    )
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] roles.updatePermissions error:', err)
    return false
  }
}

/** 重置角色权限到默认值 */
export function resetRolePermissions(roleId: string, defaultPermissions: string[]): boolean {
  const sqlite = tryGetSqlite()
  if (!sqlite) return false

  try {
    const result = sqlite.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(
      JSON.stringify(defaultPermissions),
      roleId
    )
    return result.changes > 0
  } catch (err) {
    log.error('[SQLite] roles.resetPermissions error:', err)
    return false
  }
}
