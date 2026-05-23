/**
 * 进销存 SQLite 查询模块
 *
 * 实现 inventory_items + inventory_transactions 两张表的 CRUD 操作。
 * 特点：transactions 读取时 JOIN inventory_items/projects/partners 做名称富化。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 物料列映射
// ═══════════════════════════════════════════════════════════════════════════════
var ITEM_COLUMNS = {
    id: 'id',
    code: 'code',
    name: 'name',
    category: 'category',
    unit: 'unit',
    specifications: 'specifications',
    purchasePrice: 'purchase_price',
    salePrice: 'sale_price',
    currentStock: 'current_stock',
    minStock: 'min_stock',
    maxStock: 'max_stock',
    supplierId: 'supplier_id',
    remarks: 'remarks',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var ITEM_INSERT_COLS = Object.values(ITEM_COLUMNS).filter(function (c) { return c !== 'id'; });
var ITEM_INSERT_SQL = "INSERT INTO inventory_items (".concat(ITEM_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(ITEM_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 物料读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有物料（按创建时间降序） */
export function listInventoryItems() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM inventory_items ORDER BY created_at DESC').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] inventoryItems.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 物料写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建物料 */
export function createInventoryItem(item) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var params = ITEM_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(ITEM_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at' || col === 'updated_at')
                return toSqliteValue(now_1);
            return toSqliteValue(item[jsonKey]);
        });
        (_a = sqlite.prepare(ITEM_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] inventoryItems.create error:', err);
        return false;
    }
}
/** 更新物料 */
export function updateInventoryItem(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = ITEM_COLUMNS[jsonKey];
            if (!col || col === 'id' || col === 'created_at')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length > 0) {
            setClauses.push('"updated_at" = ?');
            params.push(new Date().toISOString());
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE inventory_items SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] inventoryItems.update error:', err);
        return false;
    }
}
/** 删除物料 */
export function deleteInventoryItem(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM inventory_items WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] inventoryItems.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 出入库列映射
// ═══════════════════════════════════════════════════════════════════════════════
var TXN_COLUMNS = {
    id: 'id',
    itemId: 'item_id',
    type: 'type',
    quantity: 'quantity',
    unitPrice: 'unit_price',
    totalAmount: 'total_amount',
    projectId: 'project_id',
    contractId: 'contract_id',
    counterpartyId: 'counterparty_id',
    transactionDate: 'transaction_date',
    documentNo: 'document_no',
    remarks: 'remarks',
    createdAt: 'created_at',
};
var TXN_INSERT_COLS = Object.values(TXN_COLUMNS).filter(function (c) { return c !== 'id'; });
var TXN_INSERT_SQL = "INSERT INTO inventory_transactions (".concat(TXN_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(TXN_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 出入库读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出出入库记录（可按物料过滤，富化名称） */
export function listTransactions(itemId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "SELECT t.*,\n      i.name AS item_name,\n      p.name AS project_name,\n      pt.name AS counterparty_name\n    FROM inventory_transactions t\n    LEFT JOIN inventory_items i ON i.id = t.item_id\n    LEFT JOIN projects p ON p.id = t.project_id\n    LEFT JOIN partners pt ON pt.id = t.counterparty_id";
        var params = [];
        if (itemId) {
            sql += ' WHERE t.item_id = ?';
            params.push(itemId);
        }
        sql += ' ORDER BY t.transaction_date DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.itemName = row.item_name || '';
            camel.projectName = row.project_name || '';
            camel.counterpartyName = row.counterparty_name || '';
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] inventoryTransactions.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 出入库写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建出入库记录 */
export function createTransaction(txn) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_2 = new Date().toISOString();
        var params = TXN_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(TXN_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at')
                return toSqliteValue(now_2);
            return toSqliteValue(txn[jsonKey]);
        });
        (_a = sqlite.prepare(TXN_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] inventoryTransactions.create error:', err);
        return false;
    }
}
