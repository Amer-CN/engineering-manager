/**
 * 结算 + 合同模板 SQLite 查询模块
 *
 * 实现 settlements + contract_templates 两张表的 CRUD 操作。
 * 特点：
 * - settlements: getAll 富化 projectName/partnerName，process/unarchive 业务逻辑
 * - contractTemplates: 简单 CRUD
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 结算列映射
// ═══════════════════════════════════════════════════════════════════════════════
var SET_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    contractId: 'contract_id',
    partnerId: 'partner_id',
    type: 'type',
    subType: 'sub_type',
    status: 'status',
    settlementNo: 'settlement_no',
    name: 'name',
    amount: 'amount',
    settlementDate: 'settlement_date',
    periodStart: 'period_start',
    periodEnd: 'period_end',
    submittedBy: 'submitted_by',
    submittedAt: 'submitted_at',
    approvedBy: 'approved_by',
    approvedAt: 'approved_at',
    paidAt: 'paid_at',
    remarks: 'remarks',
    items: 'items',
    files: 'files',
    fileUrl: 'file_url',
    fileName: 'file_name',
    fileType: 'file_type',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var SET_INSERT_COLS = Object.values(SET_COLUMNS).filter(function (c) { return c !== 'id'; });
var SET_INSERT_SQL = "INSERT INTO settlements (".concat(SET_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(SET_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 结算操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出结算（可按项目过滤，富化名称） */
export function listSettlements(projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "SELECT s.*,\n      p.name AS project_name,\n      pt.name AS partner_name\n    FROM settlements s\n    LEFT JOIN projects p ON p.id = s.project_id\n    LEFT JOIN partners pt ON pt.id = s.partner_id";
        var params = [];
        if (projectId) {
            sql += ' WHERE s.project_id = ?';
            params.push(projectId);
        }
        sql += ' ORDER BY s.created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            // 旧状态迁移
            var status = camel.status;
            if (status === 'draft' || status === 'approved' || status === 'paid' || !status)
                status = 'pending';
            return __assign(__assign({}, camel), { status: status, projectName: row.project_name || '', partnerName: row.partner_name || '' });
        });
    }
    catch (err) {
        log.error('[SQLite] settlements.list error:', err);
        return null;
    }
}
/** 创建结算 */
export function createSettlement(settlement) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var params = SET_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(SET_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_1);
            if (col === 'status' && !settlement.status)
                return toSqliteValue('pending');
            return toSqliteValue(settlement[jsonKey]);
        });
        (_a = sqlite.prepare(SET_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] settlements.create error:', err);
        return false;
    }
}
/** 更新结算 */
export function updateSettlement(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = SET_COLUMNS[jsonKey];
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
        var sql = "UPDATE settlements SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] settlements.update error:', err);
        return false;
    }
}
/** 删除结算 */
export function deleteSettlement(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM settlements WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] settlements.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板列映射
// ═══════════════════════════════════════════════════════════════════════════════
var CT_COLUMNS = {
    id: 'id',
    name: 'name',
    type: 'type',
    description: 'description',
    filePath: 'file_path',
    fileName: 'file_name',
    variables: 'variables',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var CT_INSERT_COLS = Object.values(CT_COLUMNS).filter(function (c) { return c !== 'id'; });
var CT_INSERT_SQL = "INSERT INTO contract_templates (".concat(CT_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(CT_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 合同模板操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有合同模板 */
export function listContractTemplates() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM contract_templates ORDER BY created_at DESC').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] contractTemplates.list error:', err);
        return null;
    }
}
/** 创建合同模板 */
export function createContractTemplate(template) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_2 = new Date().toISOString();
        var params = CT_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(CT_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_2);
            return toSqliteValue(template[jsonKey]);
        });
        (_a = sqlite.prepare(CT_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] contractTemplates.create error:', err);
        return false;
    }
}
/** 更新合同模板 */
export function updateContractTemplate(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = CT_COLUMNS[jsonKey];
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
        var sql = "UPDATE contract_templates SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] contractTemplates.update error:', err);
        return false;
    }
}
/** 删除合同模板 */
export function deleteContractTemplate(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM contract_templates WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] contractTemplates.delete error:', err);
        return false;
    }
}
