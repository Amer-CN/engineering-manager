/**
 * 角色 SQLite 查询模块
 *
 * 实现 roles 表的 CRUD 操作。
 * 特点：roles.id 是 TEXT 主键（admin/manager/accountant/worker），非自增。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var ROLE_COLUMNS = {
    id: 'id',
    name: 'name',
    description: 'description',
    isSystem: 'is_system',
    permissions: 'permissions',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有角色 */
export function listRoles() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM roles').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] roles.list error:', err);
        return null;
    }
}
/** 获取单个角色的权限列表 */
export function getRolePermissions(roleId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT permissions FROM roles WHERE id = ?').get(roleId);
        if (!row)
            return null;
        try {
            return JSON.parse(row.permissions);
        }
        catch (_a) {
            return [];
        }
    }
    catch (err) {
        log.error('[SQLite] roles.getPermissions error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 更新角色权限 */
export function updateRolePermissions(roleId, permissions) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(permissions), roleId);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] roles.updatePermissions error:', err);
        return false;
    }
}
/** 重置角色权限到默认值 */
export function resetRolePermissions(roleId, defaultPermissions) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('UPDATE roles SET permissions = ? WHERE id = ?').run(JSON.stringify(defaultPermissions), roleId);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] roles.resetPermissions error:', err);
        return false;
    }
}
