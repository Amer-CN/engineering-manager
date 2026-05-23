/**
 * 模板 + 图纸 SQLite 查询模块
 *
 * 实现 templates + drawings 两张表的 CRUD 操作。
 * 特点：
 * - templates: 含 variables JSON 数组字段
 * - drawings: 含文件路径，文件操作在 handler 层处理，SQLite 只管元数据
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 模板列映射
// ═══════════════════════════════════════════════════════════════════════════════
var TPL_COLUMNS = {
    id: 'id',
    name: 'name',
    category: 'category',
    description: 'description',
    fileName: 'file_name',
    storedFileName: 'stored_file_name',
    fileType: 'file_type',
    variables: 'variables',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var TPL_INSERT_COLS = Object.values(TPL_COLUMNS).filter(function (c) { return c !== 'id'; });
var TPL_INSERT_SQL = "INSERT INTO templates (".concat(TPL_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(TPL_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 模板操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出模板（可按分类过滤） */
export function listTemplates(category) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM templates';
        var params = [];
        if (category) {
            sql += ' WHERE category = ?';
            params.push(category);
        }
        sql += ' ORDER BY created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] templates.list error:', err);
        return null;
    }
}
/** 创建模板 */
export function createTemplate(template) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var params = TPL_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(TPL_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_1);
            return toSqliteValue(template[jsonKey]);
        });
        (_a = sqlite.prepare(TPL_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] templates.create error:', err);
        return false;
    }
}
/** 更新模板 */
export function updateTemplate(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = TPL_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        setClauses.push('"updated_at" = ?');
        params.push(new Date().toISOString());
        params.push(id);
        var sql = "UPDATE templates SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] templates.update error:', err);
        return false;
    }
}
/** 删除模板 */
export function deleteTemplate(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM templates WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] templates.delete error:', err);
        return false;
    }
}
/** 按分类统计 */
export function getTemplateStats() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("SELECT category, COUNT(*) as count FROM templates GROUP BY category").all();
        var stats = { total: 0 };
        for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
            var row = rows_1[_i];
            stats[row.category] = row.count;
            stats.total += row.count;
        }
        return stats;
    }
    catch (err) {
        log.error('[SQLite] templates.stats error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 图纸列映射
// ═══════════════════════════════════════════════════════════════════════════════
var DWG_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    name: 'name',
    category: 'category',
    filePath: 'file_path',
    remarks: 'remarks',
    position: 'position',
    createdAt: 'created_at',
};
var DWG_INSERT_COLS = Object.values(DWG_COLUMNS).filter(function (c) { return c !== 'id'; });
var DWG_INSERT_SQL = "INSERT INTO drawings (".concat(DWG_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(DWG_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 图纸操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出图纸（可按项目过滤） */
export function listDrawings(projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM drawings';
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
        log.error('[SQLite] drawings.list error:', err);
        return null;
    }
}
/** 创建图纸（元数据） */
export function createDrawing(drawing) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = DWG_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(DWG_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at')
                return toSqliteValue(drawing.createdAt || new Date().toISOString());
            return toSqliteValue(drawing[jsonKey]);
        });
        (_a = sqlite.prepare(DWG_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] drawings.create error:', err);
        return false;
    }
}
/** 更新图纸（元数据） */
export function updateDrawing(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = DWG_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE drawings SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] drawings.update error:', err);
        return false;
    }
}
/** 删除图纸（元数据） */
export function deleteDrawing(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM drawings WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] drawings.delete error:', err);
        return false;
    }
}
