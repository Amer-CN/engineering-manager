/**
 * 材料与费用 SQLite 查询模块
 *
 * 实现 materials + expenses 两张表的 CRUD 操作。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 材料列映射
// ═══════════════════════════════════════════════════════════════════════════════
var MAT_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    name: 'name',
    category: 'category',
    unit: 'unit',
    quantity: 'quantity',
    price: 'price',
    createdAt: 'created_at',
};
var MAT_INSERT_COLS = ['project_id', 'name', 'category', 'unit', 'quantity', 'price', 'created_at'];
var MAT_INSERT_SQL = "INSERT INTO materials (".concat(MAT_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(MAT_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 材料读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出材料（可按项目过滤） */
export function listMaterials(projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM materials';
        var params = [];
        if (projectId) {
            sql += ' WHERE project_id = ?';
            params.push(projectId);
        }
        sql += ' ORDER BY created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] materials.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 材料写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建材料 */
export function createMaterial(mat) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare(MAT_INSERT_SQL).run(toSqliteValue(mat.projectId), mat.name, toSqliteValue(mat.category || ''), toSqliteValue(mat.unit || ''), toSqliteValue(mat.quantity || 0), toSqliteValue(mat.price || 0), toSqliteValue(mat.createdAt || new Date().toISOString()));
        return true;
    }
    catch (err) {
        log.error('[SQLite] materials.create error:', err);
        return false;
    }
}
/** 更新材料 */
export function updateMaterial(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = MAT_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE materials SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] materials.update error:', err);
        return false;
    }
}
/** 删除材料 */
export function deleteMaterial(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM materials WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] materials.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 费用列映射
// ═══════════════════════════════════════════════════════════════════════════════
var EXP_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    amount: 'amount',
    category: 'category',
    description: 'description',
    date: 'date',
    createdAt: 'created_at',
};
var EXP_INSERT_COLS = ['project_id', 'amount', 'category', 'description', 'date', 'created_at'];
var EXP_INSERT_SQL = "INSERT INTO expenses (".concat(EXP_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(EXP_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 费用读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出费用（可按项目过滤） */
export function listExpenses(projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM expenses';
        var params = [];
        if (projectId) {
            sql += ' WHERE project_id = ?';
            params.push(projectId);
        }
        sql += ' ORDER BY date DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] expenses.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 费用写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建费用 */
export function createExpense(exp) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare(EXP_INSERT_SQL).run(toSqliteValue(exp.projectId), toSqliteValue(exp.amount || 0), toSqliteValue(exp.category || ''), toSqliteValue(exp.description || ''), toSqliteValue(exp.date || ''), toSqliteValue(exp.createdAt || new Date().toISOString()));
        return true;
    }
    catch (err) {
        log.error('[SQLite] expenses.create error:', err);
        return false;
    }
}
/** 更新费用 */
export function updateExpense(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = EXP_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE expenses SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] expenses.update error:', err);
        return false;
    }
}
/** 删除费用 */
export function deleteExpense(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] expenses.delete error:', err);
        return false;
    }
}
