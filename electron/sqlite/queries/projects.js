/**
 * 项目 SQLite 查询模块
 *
 * 实现 projects 表的 CRUD 操作。
 * 特点：删除时级联删除 9 张关联表的数据。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var PROJ_COLUMNS = {
    id: 'id',
    name: 'name',
    description: 'description',
    address: 'address',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    budget: 'budget',
    projectManagerId: 'project_manager_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var PROJ_INSERT_COLS = Object.values(PROJ_COLUMNS).filter(function (c) { return c !== 'id'; });
var PROJ_INSERT_PLACEHOLDERS = PROJ_INSERT_COLS.map(function () { return '?'; }).join(', ');
var PROJ_INSERT_SQL = "INSERT INTO projects (".concat(PROJ_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(PROJ_INSERT_PLACEHOLDERS, ")");
/** 级联删除涉及的表名+项目ID列名 */
var CASCADE_DELETE_TABLES = [
    { table: 'cost_ledger', column: 'project_id' },
    { table: 'settlements', column: 'project_id' },
    { table: 'invoices', column: 'project_id' },
    { table: 'income_contracts', column: 'project_id' },
    { table: 'expense_contracts', column: 'project_id' },
    { table: 'agreement_contracts', column: 'project_id' },
    { table: 'wages', column: 'project_id' },
    { table: 'attendances', column: 'project_id' },
    { table: 'project_members', column: 'project_id' },
];
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有项目（含项目经理姓名 JOIN members） */
export function listProjects() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT p.*, m.name as project_manager_name\n      FROM projects p\n      LEFT JOIN members m ON p.project_manager_id = m.id\n      ORDER BY p.created_at DESC\n    ").all();
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            // project_manager_name 来自 JOIN，直接挂上
            camel.projectManagerName = row.project_manager_name || '';
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] projects.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建项目 */
export function createProject(project) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = PROJ_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(PROJ_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            return toSqliteValue(project[jsonKey]);
        });
        (_a = sqlite.prepare(PROJ_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] projects.create error:', err);
        return false;
    }
}
/** 更新项目 */
export function updateProject(project) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(project); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            if (jsonKey === 'id')
                continue;
            var col = PROJ_COLUMNS[jsonKey];
            if (!col)
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        // 始终更新 updatedAt
        setClauses.push('"updated_at" = ?');
        params.push(new Date().toISOString());
        if (setClauses.length === 1)
            return true; // 仅 updatedAt
        params.push(project.id);
        var sql = "UPDATE projects SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] projects.update error:', err);
        return false;
    }
}
/** 删除项目（含级联删除 9 张关联表，事务） */
export function deleteProject(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var doDelete = sqlite.transaction(function () {
            // 级联删除关联表数据
            for (var _i = 0, CASCADE_DELETE_TABLES_1 = CASCADE_DELETE_TABLES; _i < CASCADE_DELETE_TABLES_1.length; _i++) {
                var _a = CASCADE_DELETE_TABLES_1[_i], table = _a.table, column = _a.column;
                sqlite.prepare("DELETE FROM \"".concat(table, "\" WHERE \"").concat(column, "\" = ?")).run(projectId);
            }
            // 删除项目本身
            sqlite.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
        });
        doDelete();
        return true;
    }
    catch (err) {
        log.error('[SQLite] projects.delete error:', err);
        return false;
    }
}
