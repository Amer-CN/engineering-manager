/**
 * 部门 SQLite 查询模块
 *
 * 实现 departments 表的 CRUD 操作。
 * 特点：getAll 需要 LEFT JOIN members 计算 memberCount。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var DEPT_COLUMNS = {
    id: 'id',
    name: 'name',
    managerId: 'manager_id',
    positions: 'positions',
    createdAt: 'created_at',
};
var DEPT_INSERT_COLS = ['name', 'manager_id', 'positions', 'created_at'];
var DEPT_INSERT_PLACEHOLDERS = DEPT_INSERT_COLS.map(function () { return '?'; }).join(', ');
var DEPT_INSERT_SQL = "INSERT INTO departments (".concat(DEPT_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(DEPT_INSERT_PLACEHOLDERS, ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有部门（按创建时间升序，附带 memberCount） */
export function listDepartments() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT d.*, COUNT(m.id) AS member_count\n      FROM departments d\n      LEFT JOIN members m ON m.department_id = d.id AND m.member_type = 'staff'\n      GROUP BY d.id\n      ORDER BY d.created_at ASC\n    ").all();
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.memberCount = row.member_count;
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] departments.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建部门 */
export function createDepartment(dept) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare(DEPT_INSERT_SQL).run(dept.name, toSqliteValue(dept.managerId), toSqliteValue(dept.positions || []), toSqliteValue(dept.createdAt || new Date().toISOString()));
        return true;
    }
    catch (err) {
        log.error('[SQLite] departments.create error:', err);
        return false;
    }
}
/** 更新部门 */
export function updateDepartment(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = DEPT_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE departments SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] departments.update error:', err);
        return false;
    }
}
/** 删除部门 */
export function deleteDepartment(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM departments WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] departments.delete error:', err);
        return false;
    }
}
/** 检查部门下是否有 staff 成员 */
export function countStaffMembers(deptId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare("SELECT COUNT(*) as count FROM members WHERE department_id = ? AND member_type = 'staff'").get(deptId);
        return row.count;
    }
    catch (err) {
        log.error('[SQLite] departments.countStaff error:', err);
        return null;
    }
}
/** 检查部门名是否已存在 */
export function existsByName(name, excludeId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        if (excludeId) {
            var row_1 = sqlite.prepare('SELECT COUNT(*) as count FROM departments WHERE name = ? AND id != ?').get(name, excludeId);
            return row_1.count > 0;
        }
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM departments WHERE name = ?').get(name);
        return row.count > 0;
    }
    catch (err) {
        log.error('[SQLite] departments.existsByName error:', err);
        return null;
    }
}
