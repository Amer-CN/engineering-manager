/**
 * 成本台账分类 SQLite 查询模块
 *
 * 实现 cost_ledger_categories 表的 CRUD 操作。
 * 特点：reset 为全量覆盖；内置/自定义分类区分。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var CAT_COLUMNS = {
    id: 'id',
    code: 'code',
    label: 'label',
    direction: 'direction',
    color: 'color',
    isBuiltin: 'is_builtin',
    isEnabled: 'is_enabled',
    sortOrder: 'sort_order',
    level1: 'level1',
};
var CAT_INSERT_COLS = Object.values(CAT_COLUMNS).filter(function (c) { return c !== 'id'; });
var CAT_INSERT_PLACEHOLDERS = CAT_INSERT_COLS.map(function () { return '?'; }).join(', ');
var CAT_INSERT_SQL = "INSERT INTO cost_ledger_categories (".concat(CAT_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(CAT_INSERT_PLACEHOLDERS, ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出分类（可按方向过滤，排除已禁用） */
export function listCategories(direction) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM cost_ledger_categories WHERE is_enabled = 1';
        var params = [];
        if (direction && (direction === 'expense' || direction === 'income')) {
            sql += ' AND direction = ?';
            params.push(direction);
        }
        sql += ' ORDER BY sort_order ASC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] categories.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建分类 */
export function createCategory(cat) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = CAT_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(CAT_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            return toSqliteValue(cat[jsonKey]);
        });
        (_a = sqlite.prepare(CAT_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] categories.create error:', err);
        return false;
    }
}
/** 更新分类 */
export function updateCategory(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = CAT_COLUMNS[jsonKey];
            if (!col)
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE cost_ledger_categories SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] categories.update error:', err);
        return false;
    }
}
/** 删除分类 */
export function deleteCategory(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM cost_ledger_categories WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] categories.delete error:', err);
        return false;
    }
}
/** 检查分类 code 是否被 cost_ledger 引用 */
export function countCategoryRefs(code) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM cost_ledger WHERE category = ?').get(code);
        return row.count;
    }
    catch (err) {
        log.error('[SQLite] categories.countRefs error:', err);
        return null;
    }
}
/** 恢复默认分类（事务：DELETE ALL + INSERT 默认值） */
export function resetCategories(defaultCats) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var doReset = sqlite.transaction(function () {
            sqlite.prepare('DELETE FROM cost_ledger_categories').run();
            var stmt = sqlite.prepare(CAT_INSERT_SQL);
            var _loop_1 = function (cat) {
                var params = CAT_INSERT_COLS.map(function (col) {
                    var _a;
                    var jsonKey = (_a = Object.entries(CAT_COLUMNS).find(function (_a) {
                        var c = _a[1];
                        return c === col;
                    })) === null || _a === void 0 ? void 0 : _a[0];
                    if (!jsonKey)
                        return null;
                    return toSqliteValue(cat[jsonKey]);
                });
                stmt.run.apply(stmt, params);
            };
            for (var _i = 0, defaultCats_1 = defaultCats; _i < defaultCats_1.length; _i++) {
                var cat = defaultCats_1[_i];
                _loop_1(cat);
            }
        });
        doReset();
        return true;
    }
    catch (err) {
        log.error('[SQLite] categories.reset error:', err);
        return false;
    }
}
