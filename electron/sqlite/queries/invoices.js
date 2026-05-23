/**
 * 发票 & 收款记录 SQLite 查询模块
 *
 * 实现 invoices、payment_records 两张表的 CRUD 操作。
 * 包含发票状态同步逻辑。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// Invoices — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var INV_COLUMNS = {
    id: 'id',
    type: 'type',
    status: 'status',
    invoiceKind: 'invoice_kind',
    invoiceNo: 'invoice_no',
    invoiceCode: 'invoice_code',
    name: 'name',
    amount: 'amount',
    taxAmount: 'tax_amount',
    priceAmount: 'price_amount',
    taxRate: 'tax_rate',
    issueDate: 'issue_date',
    sellerId: 'seller_id',
    buyerId: 'buyer_id',
    settlementId: 'settlement_id',
    projectId: 'project_id',
    contractId: 'contract_id',
    receivedAmount: 'received_amount',
    fileUrl: 'file_url',
    fileType: 'file_type',
    remarks: 'remarks',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var INV_INSERT_COLS = Object.values(INV_COLUMNS).filter(function (c) { return c !== 'id'; });
var INV_INSERT_SQL = "INSERT INTO invoices (".concat(INV_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(INV_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Payment Records — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var PAY_COLUMNS = {
    id: 'id',
    type: 'type',
    amount: 'amount',
    recordDate: 'record_date',
    projectId: 'project_id',
    partnerId: 'partner_id',
    contractId: 'contract_id',
    invoiceDetails: 'invoice_details',
    remarks: 'remarks',
    createdAt: 'created_at',
    fileUrl: 'file_url',
    fileType: 'file_type',
};
var PAY_INSERT_COLS = Object.values(PAY_COLUMNS).filter(function (c) { return c !== 'id'; });
var PAY_INSERT_SQL = "INSERT INTO payment_records (".concat(PAY_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(PAY_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════════════════════════════
function toInsertParams(columns, insertCols, obj) {
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
// ═══════════════════════════════════════════════════════════════════════════════
// Invoices — 操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出发票（含 sellerName、buyerName、projectName、contractName、computed receivedAmount/status） */
export function listInvoices(type) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "\n      SELECT i.*,\n        s.name as seller_name,\n        b.name as buyer_name,\n        p.name as project_name,\n        COALESCE(ic.name, ec.name, ac.name, '') as contract_name\n      FROM invoices i\n      LEFT JOIN partners s ON i.seller_id = s.id\n      LEFT JOIN partners b ON i.buyer_id = b.id\n      LEFT JOIN projects p ON i.project_id = p.id\n      LEFT JOIN income_contracts ic ON i.contract_id = ic.id\n      LEFT JOIN expense_contracts ec ON i.contract_id = ec.id\n      LEFT JOIN agreement_contracts ac ON i.contract_id = ac.id\n    ";
        var params = [];
        if (type) {
            sql += ' WHERE i.type = ?';
            params.push(type);
        }
        sql += ' ORDER BY i.created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.sellerName = row.seller_name || '';
            camel.buyerName = row.buyer_name || '';
            camel.projectName = row.project_name || '';
            camel.contractName = row.contract_name || '';
            delete camel.seller_name;
            delete camel.buyer_name;
            delete camel.project_name;
            delete camel.contract_name;
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] invoices.list error:', err);
        return null;
    }
}
/** 创建发票 */
export function createInvoice(invoice) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(INV_COLUMNS, INV_INSERT_COLS, invoice);
        (_a = sqlite.prepare(INV_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] invoices.create error:', err);
        return false;
    }
}
/** 更新发票 */
export function updateInvoice(invoice) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(INV_COLUMNS, invoice, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(new Date().toISOString());
        setParams.push(invoice.id);
        var result = (_a = sqlite.prepare("UPDATE invoices SET ".concat(setSql, ", \"updated_at\" = ? WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] invoices.update error:', err);
        return false;
    }
}
/** 更新发票状态 */
export function updateInvoiceStatus(id, status) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?')
            .run(status, new Date().toISOString(), id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] invoices.updateStatus error:', err);
        return false;
    }
}
/** 更新发票的 receivedAmount 和 status */
export function updateInvoiceReceived(id, receivedAmount, status) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('UPDATE invoices SET received_amount = ?, status = ?, updated_at = ? WHERE id = ?')
            .run(receivedAmount, status, new Date().toISOString(), id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] invoices.updateReceived error:', err);
        return false;
    }
}
/** 删除发票 */
export function deleteInvoice(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM invoices WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] invoices.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Payment Records — 操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出收款记录（含 projectName、partnerName、contractName、invoiceInfos） */
export function listPaymentRecords(type) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "\n      SELECT pr.*,\n        p.name as project_name,\n        pt.name as partner_name,\n        COALESCE(ic.name, ec.name, ac.name, '') as contract_name\n      FROM payment_records pr\n      LEFT JOIN projects p ON pr.project_id = p.id\n      LEFT JOIN partners pt ON pr.partner_id = pt.id\n      LEFT JOIN income_contracts ic ON pr.contract_id = ic.id\n      LEFT JOIN expense_contracts ec ON pr.contract_id = ec.id\n      LEFT JOIN agreement_contracts ac ON pr.contract_id = ac.id\n    ";
        var params = [];
        if (type) {
            sql += ' WHERE pr.type = ?';
            params.push(type);
        }
        sql += ' ORDER BY pr.record_date DESC, pr.created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectName = row.project_name || '';
            camel.partnerName = row.partner_name || '';
            camel.contractName = row.contract_name || '';
            delete camel.project_name;
            delete camel.partner_name;
            delete camel.contract_name;
            // 解析 invoiceDetails 并补充发票信息
            var invoiceDetails = camel.invoiceDetails || [];
            var invoiceInfos = invoiceDetails.map(function (d) {
                var invRow = sqlite.prepare('SELECT invoice_no, name, amount FROM invoices WHERE id = ?').get(d.invoiceId);
                return {
                    invoiceId: d.invoiceId,
                    invoiceNo: (invRow === null || invRow === void 0 ? void 0 : invRow.invoice_no) || '',
                    invoiceName: (invRow === null || invRow === void 0 ? void 0 : invRow.name) || '',
                    invoiceAmount: (invRow === null || invRow === void 0 ? void 0 : invRow.amount) || 0,
                    paymentAmount: d.paymentAmount,
                };
            });
            camel.invoiceInfos = invoiceInfos;
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] paymentRecords.list error:', err);
        return null;
    }
}
/** 创建收款记录 */
export function createPaymentRecord(record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(PAY_COLUMNS, PAY_INSERT_COLS, record);
        (_a = sqlite.prepare(PAY_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] paymentRecords.create error:', err);
        return false;
    }
}
/** 更新收款记录 */
export function updatePaymentRecord(record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(PAY_COLUMNS, record, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(record.id);
        var result = (_a = sqlite.prepare("UPDATE payment_records SET ".concat(setSql, " WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] paymentRecords.update error:', err);
        return false;
    }
}
/** 删除收款记录 */
export function deletePaymentRecord(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM payment_records WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] paymentRecords.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 发票状态重算（SQLite 版，供 paymentRecords 的 update/delete 后调用）
// ═══════════════════════════════════════════════════════════════════════════════
/** 重新计算所有发票的 receivedAmount 和 status */
export function recalculateInvoiceStatusSqlite() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var invoices = sqlite.prepare('SELECT id, amount, received_amount FROM invoices').all();
        for (var _i = 0, invoices_1 = invoices; _i < invoices_1.length; _i++) {
            var inv = invoices_1[_i];
            // 从 payment_records 的 invoice_details JSON 中计算每张发票的累计收款
            var paymentRows = sqlite.prepare('SELECT invoice_details FROM payment_records').all();
            var totalReceived = 0;
            for (var _a = 0, paymentRows_1 = paymentRows; _a < paymentRows_1.length; _a++) {
                var pr = paymentRows_1[_a];
                try {
                    var details = JSON.parse(pr.invoice_details || '[]');
                    for (var _b = 0, details_1 = details; _b < details_1.length; _b++) {
                        var d = details_1[_b];
                        if (d.invoiceId === inv.id) {
                            totalReceived += (d.paymentAmount || 0);
                        }
                    }
                }
                catch ( /* skip malformed JSON */_c) { /* skip malformed JSON */ }
            }
            var status_1 = 'issued';
            if (totalReceived >= (inv.amount || 0)) {
                status_1 = 'received';
            }
            else if (totalReceived > 0) {
                status_1 = 'partially_paid';
            }
            sqlite.prepare('UPDATE invoices SET received_amount = ?, status = ?, updated_at = ? WHERE id = ?')
                .run(totalReceived, status_1, new Date().toISOString(), inv.id);
        }
        return true;
    }
    catch (err) {
        log.error('[SQLite] recalculateInvoiceStatus error:', err);
        return false;
    }
}
