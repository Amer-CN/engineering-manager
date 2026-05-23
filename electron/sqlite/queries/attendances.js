/**
 * 考勤 SQLite 查询模块
 *
 * 实现 attendances 表的 CRUD 操作。
 * 特点：
 * - getAll: 复杂富化（memberName/memberType/teamName/teamId + JOIN）
 * - update: 需要从 dailyStatus 重新计算 workDays/daysOff/isFullAttendance
 * - batchCreate/generateDefaults/generateDefaultsV2: 带去重逻辑的批量创建
 * - batchImport: upsert 逻辑（存在则更新，否则插入）
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var ATT_COLUMNS = {
    id: 'id',
    memberId: 'member_id',
    projectWorkerId: 'project_worker_id',
    projectId: 'project_id',
    memberName: 'member_name',
    yearMonth: 'year_month',
    workDays: 'work_days',
    daysOff: 'days_off',
    isFullAttendance: 'is_full_attendance',
    dailyStatus: 'daily_status',
    fileUrl: 'file_url',
    fileName: 'file_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var ATT_INSERT_COLS = Object.values(ATT_COLUMNS).filter(function (c) { return c !== 'id'; });
var ATT_INSERT_SQL = "INSERT INTO attendances (".concat(ATT_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(ATT_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出考勤（可选项目/月份过滤） */
export function listAttendances(projectId, yearMonth) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM attendances';
        var params = [];
        var conditions = [];
        if (projectId) {
            conditions.push('project_id = ?');
            params.push(projectId);
        }
        if (yearMonth) {
            conditions.push('year_month = ?');
            params.push(yearMonth);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' ORDER BY updated_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] attendances.list error:', err);
        return null;
    }
}
/** 按成员查询考勤 */
export function listAttendancesByMember(memberId, yearMonth) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM attendances WHERE member_id = ?';
        var params = [memberId];
        if (yearMonth) {
            sql += ' AND year_month = ?';
            params.push(yearMonth);
        }
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] attendances.listByMember error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建考勤记录 */
export function createAttendance(record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var params = ATT_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(ATT_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_1);
            return toSqliteValue(record[jsonKey]);
        });
        (_a = sqlite.prepare(ATT_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] attendances.create error:', err);
        return false;
    }
}
/** 更新考勤记录 */
export function updateAttendance(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = ATT_COLUMNS[jsonKey];
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
        var sql = "UPDATE attendances SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] attendances.update error:', err);
        return false;
    }
}
/** 删除考勤记录 */
export function deleteAttendance(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM attendances WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] attendances.delete error:', err);
        return false;
    }
}
/** 批量删除考勤记录 */
export function batchDeleteAttendances(ids) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var placeholders = ids.map(function () { return '?'; }).join(',');
        var result = (_a = sqlite.prepare("DELETE FROM attendances WHERE id IN (".concat(placeholders, ")"))).run.apply(_a, ids);
        return true;
    }
    catch (err) {
        log.error('[SQLite] attendances.batchDelete error:', err);
        return false;
    }
}
/** 检查考勤是否已存在（memberId+projectId+yearMonth 或 projectWorkerId+yearMonth） */
export function existsAttendance(memberId, projectWorkerId, projectId, yearMonth) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        if (projectWorkerId) {
            var row = sqlite.prepare('SELECT COUNT(*) as count FROM attendances WHERE project_worker_id = ? AND year_month = ?').get(projectWorkerId, yearMonth);
            return row.count > 0;
        }
        if (memberId) {
            var row = sqlite.prepare('SELECT COUNT(*) as count FROM attendances WHERE member_id = ? AND project_id = ? AND year_month = ?').get(memberId, projectId, yearMonth);
            return row.count > 0;
        }
        return false;
    }
    catch (err) {
        log.error('[SQLite] attendances.exists error:', err);
        return null;
    }
}
/** 查找考勤记录（projectWorkerId+yearMonth）用于 batchImport 的 upsert */
export function findAttendanceByPWAndMonth(projectWorkerId, yearMonth) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT * FROM attendances WHERE project_worker_id = ? AND year_month = ?').get(projectWorkerId, yearMonth);
        return row ? rowToCamel(row) : null;
    }
    catch (err) {
        log.error('[SQLite] attendances.findByPWAndMonth error:', err);
        return null;
    }
}
