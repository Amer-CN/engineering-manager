/**
 * 工资 SQLite 查询模块
 *
 * 实现 wages 表的 CRUD 操作。
 * 特点：
 * - getAll: 去重（同 projectWorkerId/memberId + yearMonth 只保留最新）
 * - batchSave: 全量替换该项目+月份的工资记录
 * - batchClearPayments: 批量清空发放字段
 * - batchArchivePayments: 批量归档
 * - getStats: 聚合统计
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var W_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    memberId: 'member_id',
    projectWorkerId: 'project_worker_id',
    yearMonth: 'year_month',
    dailyWage: 'daily_wage',
    workDays: 'work_days',
    bonus: 'bonus',
    deduction: 'deduction',
    actualWage: 'actual_wage',
    paidAmount: 'paid_amount',
    paidDate: 'paid_date',
    bankReceiptPath: 'bank_receipt_path',
    paymentLocked: 'payment_locked',
    memberName: 'member_name',
    memberType: 'member_type',
    bankAccount: 'bank_account',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var W_INSERT_COLS = Object.values(W_COLUMNS).filter(function (c) { return c !== 'id'; });
var W_INSERT_SQL = "INSERT INTO wages (".concat(W_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(W_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 查询工资列表（支持可选过滤） */
export function listWages(filters) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return [];
    try {
        var sql = 'SELECT * FROM wages WHERE 1=1';
        var params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.projectId) {
            sql += ' AND project_id = ?';
            params.push(filters.projectId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.yearMonth) {
            sql += ' AND year_month = ?';
            params.push(filters.yearMonth);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.memberId) {
            sql += ' AND member_id = ?';
            params.push(filters.memberId);
        }
        sql += ' ORDER BY updated_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (r) { return rowToCamel(r, W_COLUMNS); });
    }
    catch (err) {
        log.error('[SQLite] wages.list error:', err);
        return [];
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建工资记录 */
export function createWage(record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var params = W_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(W_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_1);
            return toSqliteValue(record[jsonKey]);
        });
        (_a = sqlite.prepare(W_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] wages.create error:', err);
        return false;
    }
}
/** 更新工资记录 */
export function updateWage(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = W_COLUMNS[jsonKey];
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
        var sql = "UPDATE wages SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] wages.update error:', err);
        return false;
    }
}
/** 删除工资记录 */
export function deleteWage(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM wages WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] wages.delete error:', err);
        return false;
    }
}
/** 批量删除工资记录 */
export function batchDeleteWages(ids) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var placeholders = ids.map(function () { return '?'; }).join(',');
        (_a = sqlite.prepare("DELETE FROM wages WHERE id IN (".concat(placeholders, ")"))).run.apply(_a, ids);
        return true;
    }
    catch (err) {
        log.error('[SQLite] wages.batchDelete error:', err);
        return false;
    }
}
/** 批量保存工资（替换该项目+月份的所有工资记录，事务） */
export function batchSaveWages(records) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        if (records.length === 0)
            return true;
        var _a = records[0], projectId_1 = _a.projectId, yearMonth_1 = _a.yearMonth;
        var now_2 = new Date().toISOString();
        var doSave = sqlite.transaction(function () {
            // 删除旧的
            sqlite.prepare('DELETE FROM wages WHERE project_id = ? AND year_month = ?').run(projectId_1, yearMonth_1);
            // 插入新的
            var stmt = sqlite.prepare(W_INSERT_SQL);
            var _loop_1 = function (record) {
                var params = W_INSERT_COLS.map(function (col) {
                    var _a;
                    var jsonKey = (_a = Object.entries(W_COLUMNS).find(function (_a) {
                        var c = _a[1];
                        return c === col;
                    })) === null || _a === void 0 ? void 0 : _a[0];
                    if (!jsonKey)
                        return null;
                    if (col === 'created_at')
                        return toSqliteValue(record.createdAt || now_2);
                    if (col === 'updated_at')
                        return toSqliteValue(now_2);
                    return toSqliteValue(record[jsonKey]);
                });
                stmt.run.apply(stmt, params);
            };
            for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
                var record = records_1[_i];
                _loop_1(record);
            }
        });
        doSave();
        return true;
    }
    catch (err) {
        log.error('[SQLite] wages.batchSave error:', err);
        return false;
    }
}
/** 批量清空发放字段 */
export function batchClearPayments(ids) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now = new Date().toISOString();
        var placeholders = ids.map(function () { return '?'; }).join(',');
        (_a = sqlite.prepare("UPDATE wages SET paid_amount = 0, paid_date = '', bank_receipt_path = NULL, payment_locked = 0, updated_at = ? WHERE id IN (".concat(placeholders, ")"))).run.apply(_a, __spreadArray([now], ids, false));
        return true;
    }
    catch (err) {
        log.error('[SQLite] wages.batchClearPayments error:', err);
        return false;
    }
}
/** 批量归档工资发放记录 */
export function batchArchivePayments(ids) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now = new Date().toISOString();
        var placeholders = ids.map(function () { return '?'; }).join(',');
        (_a = sqlite.prepare("UPDATE wages SET payment_locked = 1, updated_at = ? WHERE id IN (".concat(placeholders, ")"))).run.apply(_a, __spreadArray([now], ids, false));
        return true;
    }
    catch (err) {
        log.error('[SQLite] wages.batchArchivePayments error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 统计操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 工资统计（SQLite 聚合版） */
export function getWageStats(filters) {
    var _a, _b;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // 构建过滤条件：只统计有效的工资记录（关联存在的 project_worker 或 member）
        var filterSql = "WHERE (\n      (w.project_worker_id IS NOT NULL AND w.project_worker_id IN (SELECT id FROM project_workers))\n      OR (w.member_id IS NOT NULL AND w.member_id IN (SELECT id FROM members))\n    )";
        var params = [];
        if (filters === null || filters === void 0 ? void 0 : filters.yearMonth) {
            filterSql += ' AND w.year_month = ?';
            params.push(filters.yearMonth);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.projectId) {
            filterSql += ' AND w.project_id = ?';
            params.push(filters.projectId);
        }
        // 总额 + 总数
        var summary = (_a = sqlite.prepare("SELECT COALESCE(SUM(w.actual_wage), 0) AS total_wage, COUNT(*) AS cnt FROM wages w ".concat(filterSql))).get.apply(_a, params);
        var totalWage_1 = Math.round((summary.total_wage || 0) * 100) / 100;
        // 按项目分组
        var breakdownRows = (_b = sqlite.prepare("\n      SELECT w.project_id, p.name AS project_name, COALESCE(SUM(w.actual_wage), 0) AS total\n      FROM wages w\n      LEFT JOIN projects p ON p.id = w.project_id\n      ".concat(filterSql, "\n      GROUP BY w.project_id\n      ORDER BY total DESC\n    "))).all.apply(_b, params);
        var projectBreakdown = breakdownRows.map(function (r) { return ({
            projectId: r.project_id,
            projectName: r.project_name || '未知项目',
            total: Math.round(r.total * 100) / 100,
            percentage: totalWage_1 > 0 ? Math.round((r.total / totalWage_1) * 10000) / 100 : 0,
        }); });
        return {
            totalWage: totalWage_1,
            count: summary.cnt || 0,
            projectBreakdown: projectBreakdown,
        };
    }
    catch (err) {
        log.error('[SQLite] wages.getStats error:', err);
        return null;
    }
}
