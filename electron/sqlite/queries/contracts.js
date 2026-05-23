/**
 * 合同管理 SQLite 查询模块
 *
 * 实现 income_contracts、income_records、expense_contracts、expense_records、
 * agreement_contracts 五张表的 CRUD 操作。
 * 采用工厂模式消除三种合同类型的重复代码。
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
// 合同列映射（三种合同结构相同）
// ═══════════════════════════════════════════════════════════════════════════════
var CONTRACT_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    partnerId: 'partner_id',
    contractNo: 'contract_no',
    name: 'name',
    amount: 'amount',
    signedDate: 'signed_date',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    paymentMethod: 'payment_method',
    remarks: 'remarks',
    finalAmount: 'final_amount',
    settlementId: 'settlement_id',
    fileUrl: 'file_url',
    fileType: 'file_type',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
// 其他协议多一个 agreement_type 字段
var AGREEMENT_EXTRA = {
    agreementType: 'agreement_type',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 收入/支出记录列映射
// ═══════════════════════════════════════════════════════════════════════════════
var INCOME_RECORD_COLUMNS = {
    id: 'id',
    contractId: 'contract_id',
    amount: 'amount',
    recordDate: 'record_date',
    payer: 'payer',
    remarks: 'remarks',
    createdAt: 'created_at',
};
var EXPENSE_RECORD_COLUMNS = {
    id: 'id',
    contractId: 'contract_id',
    amount: 'amount',
    recordDate: 'record_date',
    payee: 'payee',
    remarks: 'remarks',
    createdAt: 'created_at',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════
function toInsertParams(columns, obj) {
    var insertCols = Object.values(columns).filter(function (c) { return c !== 'id'; });
    return insertCols.map(function (col) {
        var _a;
        var jsonKey = (_a = Object.entries(columns).find(function (_a) {
            var c = _a[1];
            return c === col;
        })) === null || _a === void 0 ? void 0 : _a[0];
        if (!jsonKey)
            return null;
        return toSqliteValue(obj[jsonKey]);
    });
}
function getInsertSQL(tableName, columns) {
    var insertCols = Object.values(columns).filter(function (c) { return c !== 'id'; });
    return "INSERT INTO \"".concat(tableName, "\" (").concat(insertCols.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(insertCols.map(function () { return '?'; }).join(', '), ")");
}
function toUpdateSet(columns, changes, excludeKeys) {
    if (excludeKeys === void 0) { excludeKeys = []; }
    var setClauses = [];
    var params = [];
    for (var _i = 0, _a = Object.entries(changes); _i < _a.length; _i++) {
        var _b = _a[_i], jsonKey = _b[0], value = _b[1];
        if (excludeKeys.includes(jsonKey))
            continue;
        var col = columns[jsonKey];
        if (!col)
            continue;
        setClauses.push("\"".concat(col, "\" = ?"));
        params.push(toSqliteValue(value));
    }
    return { sql: setClauses.join(', '), params: params };
}
var TABLE_MAP = {
    income: { contractTable: 'income_contracts', recordTable: 'income_records' },
    expense: { contractTable: 'expense_contracts', recordTable: 'expense_records' },
    agreement: { contractTable: 'agreement_contracts', recordTable: '' },
};
var COLUMNS_MAP = {
    income: CONTRACT_COLUMNS,
    expense: CONTRACT_COLUMNS,
    agreement: __assign(__assign({}, CONTRACT_COLUMNS), AGREEMENT_EXTRA),
};
var RECORD_COLUMNS_MAP = {
    income_records: INCOME_RECORD_COLUMNS,
    expense_records: EXPENSE_RECORD_COLUMNS,
};
/** 列出合同（含项目名、合作方名、收款/付款金额） */
export function listContracts(type, projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var _b = TABLE_MAP[type], contractTable = _b.contractTable, recordTable_1 = _b.recordTable;
        var columns = COLUMNS_MAP[type];
        var sql = "SELECT c.*, p.name as project_name, pt.name as partner_name";
        if (recordTable_1) {
            var amountCol = type === 'income' ? 'received_amount' : 'paid_amount';
            sql += ", COALESCE(r.".concat(amountCol, ", 0) as computed_").concat(amountCol);
        }
        sql += " FROM \"".concat(contractTable, "\" c");
        sql += " LEFT JOIN projects p ON c.project_id = p.id";
        sql += " LEFT JOIN partners pt ON c.partner_id = pt.id";
        if (recordTable_1) {
            var amountCol = type === 'income' ? 'received_amount' : 'paid_amount';
            sql += " LEFT JOIN (SELECT contract_id, SUM(amount) as ".concat(amountCol, " FROM \"").concat(recordTable_1, "\" GROUP BY contract_id) r ON c.id = r.contract_id");
        }
        var params = [];
        if (projectId) {
            sql += ' WHERE c.project_id = ?';
            params.push(projectId);
        }
        sql += ' ORDER BY c.created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectName = row.project_name || '';
            camel.partnerName = row.partner_name || '';
            if (recordTable_1) {
                var amountKey = type === 'income' ? 'receivedAmount' : 'paidAmount';
                var computedKey = type === 'income' ? 'computed_received_amount' : 'computed_paid_amount';
                camel[amountKey] = row[computedKey] || 0;
                delete camel[computedKey.replace(/^computed_/, '')];
            }
            // 清理临时字段
            delete camel.project_name;
            delete camel.partner_name;
            return camel;
        });
    }
    catch (err) {
        log.error("[SQLite] contracts.list(".concat(type, ") error:"), err);
        return null;
    }
}
/** 创建合同 */
export function createContract(type, contract) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var contractTable = TABLE_MAP[type].contractTable;
        var columns = COLUMNS_MAP[type];
        var params = toInsertParams(columns, contract);
        var sql = getInsertSQL(contractTable, columns);
        (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error("[SQLite] contracts.create(".concat(type, ") error:"), err);
        return false;
    }
}
/** 更新合同 */
export function updateContract(type, contract) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var contractTable = TABLE_MAP[type].contractTable;
        var columns = COLUMNS_MAP[type];
        var _b = toUpdateSet(columns, contract, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(new Date().toISOString());
        setParams.push(contract.id);
        var result = (_a = sqlite.prepare("UPDATE \"".concat(contractTable, "\" SET ").concat(setSql, ", \"updated_at\" = ? WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error("[SQLite] contracts.update(".concat(type, ") error:"), err);
        return false;
    }
}
/** 删除合同（含级联删除记录） */
export function deleteContract(type, id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _a = TABLE_MAP[type], contractTable_1 = _a.contractTable, recordTable_2 = _a.recordTable;
        var doDelete = sqlite.transaction(function () {
            if (recordTable_2) {
                sqlite.prepare("DELETE FROM \"".concat(recordTable_2, "\" WHERE contract_id = ?")).run(id);
            }
            sqlite.prepare("DELETE FROM \"".concat(contractTable_1, "\" WHERE id = ?")).run(id);
        });
        doDelete();
        return true;
    }
    catch (err) {
        log.error("[SQLite] contracts.delete(".concat(type, ") error:"), err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 收入/支出记录操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出记录 */
export function listRecords(type, contractId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var recordTable = TABLE_MAP[type].recordTable;
        var rows = sqlite.prepare("SELECT * FROM \"".concat(recordTable, "\" WHERE contract_id = ?")).all(contractId);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error("[SQLite] records.list(".concat(type, ") error:"), err);
        return null;
    }
}
/** 创建记录 */
export function createRecord(type, record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var recordTable = TABLE_MAP[type].recordTable;
        var columns = RECORD_COLUMNS_MAP[recordTable];
        var params = toInsertParams(columns, record);
        var sql = getInsertSQL(recordTable, columns);
        (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error("[SQLite] records.create(".concat(type, ") error:"), err);
        return false;
    }
}
/** 删除记录 */
export function deleteRecord(type, id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var recordTable = TABLE_MAP[type].recordTable;
        sqlite.prepare("DELETE FROM \"".concat(recordTable, "\" WHERE id = ?")).run(id);
        return true;
    }
    catch (err) {
        log.error("[SQLite] records.delete(".concat(type, ") error:"), err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 合同统计
// ═══════════════════════════════════════════════════════════════════════════════
export function getContractStats() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // 收入合同总额
        var incomeRow = sqlite.prepare('SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(final_amount, amount, 0)), 0) as total FROM income_contracts').get();
        // 支出合同总额
        var expenseRow = sqlite.prepare('SELECT COUNT(*) as count, COALESCE(SUM(COALESCE(final_amount, amount, 0)), 0) as total FROM expense_contracts').get();
        // 其他协议数量
        var agreementRow = sqlite.prepare('SELECT COUNT(*) as count FROM agreement_contracts').get();
        // 收款总额
        var incomeReceivedRow = sqlite.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payment_records WHERE type = 'invoice_out'").get();
        // 支出总额
        var expensePaidRow = sqlite.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payment_records WHERE type = 'invoice_in'").get();
        // 即将到期的合同（30天内）
        var now = new Date().toISOString().split('T')[0];
        var thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        var expiringIncome = sqlite.prepare("SELECT id, 'income' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM income_contracts WHERE end_date >= ? AND end_date <= ?").all(now, thirtyDaysLater);
        var expiringExpense = sqlite.prepare("SELECT id, 'expense' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM expense_contracts WHERE end_date >= ? AND end_date <= ?").all(now, thirtyDaysLater);
        var expiringAgreement = sqlite.prepare("SELECT id, 'agreement' as type, name, contract_no, COALESCE(final_amount, amount, 0) as amount, end_date, julianday(end_date) - julianday('now') as days_left FROM agreement_contracts WHERE end_date >= ? AND end_date <= ?").all(now, thirtyDaysLater);
        var expiringSoon = __spreadArray(__spreadArray(__spreadArray([], expiringIncome.map(function (r) { return rowToCamel(r); }), true), expiringExpense.map(function (r) { return rowToCamel(r); }), true), expiringAgreement.map(function (r) { return rowToCamel(r); }), true).sort(function (a, b) { return a.daysLeft - b.daysLeft; });
        return {
            incomeCount: incomeRow.count,
            incomeTotal: incomeRow.total,
            incomeReceived: incomeReceivedRow.total,
            expenseCount: expenseRow.count,
            expenseTotal: expenseRow.total,
            expensePaid: expensePaidRow.total,
            agreementCount: agreementRow.count,
            netIncome: incomeRow.total - expenseRow.total,
            netReceived: incomeReceivedRow.total - expensePaidRow.total,
            expiringSoon: expiringSoon,
        };
    }
    catch (err) {
        log.error('[SQLite] contractStats.get error:', err);
        return null;
    }
}
