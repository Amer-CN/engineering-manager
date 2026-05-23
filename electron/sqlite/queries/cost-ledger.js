/**
 * 成本台账 SQLite 查询模块
 *
 * 实现 cost_ledger 表的 CRUD 操作，供 IPC Handler 双写使用。
 * 读操作：从 SQLite 查询并返回 camelCase 格式
 * 写操作：INSERT/UPDATE/DELETE SQLite，由调用方负责同步 JSON
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 成本台账条目 — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
/** JSON 字段 → SQLite 列名（与 migrate.ts 保持一致） */
var CL_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    batchId: 'batch_id',
    voucherNo: 'voucher_no',
    date: 'date',
    direction: 'direction',
    amount: 'amount',
    category: 'category',
    summary: 'summary',
    counterparty: 'counterparty',
    channel: 'channel',
    linkedInvoiceId: 'linked_invoice_id',
    linkedInvoiceStatus: 'linked_invoice_status',
    notes: 'notes',
    attachments: 'attachments',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
/** SQLite 列名列表（不含 id，用于 INSERT） */
/** SQLite 列名列表（含 id，确保 JSON 和 SQLite 主键一致） */
var CL_INSERT_COLS = Object.values(CL_COLUMNS);
/** INSERT 占位符 */
var CL_INSERT_PLACEHOLDERS = CL_INSERT_COLS.map(function () { return '?'; }).join(', ');
/** INSERT 语句 */
var CL_INSERT_SQL = "INSERT INTO cost_ledger (".concat(CL_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(CL_INSERT_PLACEHOLDERS, ")");
/** UPDATE SET 子句（不含 id/created_at） */
var CL_UPDATE_COLS = Object.entries(CL_COLUMNS)
    .filter(function (_a) {
    var jsonKey = _a[0];
    return jsonKey !== 'id' && jsonKey !== 'createdAt';
})
    .map(function (_a) {
    var col = _a[1];
    return "\"".concat(col, "\"");
});
// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var BATCH_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    name: 'name',
    createdAt: 'created_at',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════
/** 从 entry 对象提取 INSERT 参数（按 CL_INSERT_COLS 顺序） */
function entryToInsertParams(entry) {
    return CL_INSERT_COLS.map(function (col) {
        var _a;
        // 反查 JSON key
        var jsonKey = (_a = Object.entries(CL_COLUMNS).find(function (_a) {
            var c = _a[1];
            return c === col;
        })) === null || _a === void 0 ? void 0 : _a[0];
        if (!jsonKey)
            return null;
        var val = entry[jsonKey];
        // attachments 和 notes 存为 JSON TEXT
        if (col === 'attachments')
            return toSqliteValue(val || []);
        return toSqliteValue(val);
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 列出台账记录（SQLite 版）
 * 含发票状态解析（LEFT JOIN invoices）
 */
export function listEntries(projectId, batchId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "\n      SELECT cl.*,\n        CASE WHEN i.id IS NOT NULL THEN 'active'\n             WHEN cl.linked_invoice_id IS NOT NULL THEN 'deleted'\n             ELSE NULL\n        END as computed_invoice_status\n      FROM cost_ledger cl\n      LEFT JOIN invoices i ON cl.linked_invoice_id = i.id\n      WHERE cl.project_id = ?\n    ";
        var params = [projectId];
        if (batchId !== undefined) {
            sql += " AND cl.batch_id = ?";
            params.push(batchId);
        }
        sql += " ORDER BY cl.date DESC";
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camelRow = rowToCamel(row);
            // 用计算值覆盖存储的 linkedInvoiceStatus
            if (camelRow.computedInvoiceStatus !== undefined) {
                camelRow.linkedInvoiceStatus = camelRow.computedInvoiceStatus;
                delete camelRow.computedInvoiceStatus;
            }
            return camelRow;
        });
    }
    catch (err) {
        log.error('[SQLite] costLedger.list error:', err);
        return null;
    }
}
/**
 * 获取台账汇总（SQLite 版）
 */
export function summary(projectId, batchId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "\n      SELECT direction, category, SUM(amount) as total\n      FROM cost_ledger\n      WHERE project_id = ? AND amount > 0\n    ";
        var params = [projectId];
        if (batchId !== undefined) {
            sql += " AND batch_id = ?";
            params.push(batchId);
        }
        sql += " GROUP BY direction, category";
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        var totalExpense = 0;
        var totalIncome = 0;
        var byCategory = {};
        for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
            var row = rows_1[_i];
            byCategory[row.category] = (byCategory[row.category] || 0) + row.total;
            if (row.direction === 'expense')
                totalExpense += row.total;
            else if (row.direction === 'income')
                totalIncome += row.total;
        }
        return { totalExpense: totalExpense, totalIncome: totalIncome, byCategory: byCategory };
    }
    catch (err) {
        log.error('[SQLite] costLedger.summary error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 条目 — 写操作（仅 SQLite，JSON 由 IPC Handler 维护）
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 创建台账记录（SQLite 版）
 * @returns SQLite 自增 ID，失败返回 null
 */
export function createEntry(entry) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var params = entryToInsertParams(entry);
        var result = (_a = sqlite.prepare(CL_INSERT_SQL)).run.apply(_a, params);
        return Number(result.lastInsertRowid);
    }
    catch (err) {
        log.error('[SQLite] costLedger.create error:', err);
        return null;
    }
}
/**
 * 批量创建台账记录（SQLite 版，使用事务）
 * @returns 成功插入的条目数
 */
export function batchCreateEntries(entries) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return 0;
    try {
        var stmt_1 = sqlite.prepare(CL_INSERT_SQL);
        var insertAll = sqlite.transaction(function () {
            var count = 0;
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                var params = entryToInsertParams(entry);
                stmt_1.run.apply(stmt_1, params);
                count++;
            }
            return count;
        });
        return insertAll();
    }
    catch (err) {
        log.error('[SQLite] costLedger.batchCreate error:', err);
        return 0;
    }
}
/**
 * 更新台账记录（SQLite 版）
 */
export function updateEntry(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = CL_COLUMNS[jsonKey];
            if (!col)
                continue; // 忽略未知字段
            setClauses.push("\"".concat(col, "\" = ?"));
            if (col === 'attachments') {
                params.push(toSqliteValue(value || []));
            }
            else {
                params.push(toSqliteValue(value));
            }
        }
        if (setClauses.length === 0)
            return true; // 无有效更新
        // 始终更新 updatedAt
        setClauses.push('"updated_at" = ?');
        params.push(new Date().toISOString());
        params.push(id);
        var sql = "UPDATE cost_ledger SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] costLedger.update error:', err);
        return false;
    }
}
/**
 * 删除台账记录（SQLite 版）
 */
export function deleteEntry(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM cost_ledger WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] costLedger.delete error:', err);
        return false;
    }
}
/**
 * 按项目级联删除（SQLite 版）
 */
export function deleteByProject(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM cost_ledger WHERE project_id = ?').run(projectId);
        return true;
    }
    catch (err) {
        log.error('[SQLite] costLedger.deleteByProject error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 列出项目批次（SQLite 版）
 */
export function listBatches(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM cost_ledger_batches WHERE project_id = ? ORDER BY id ASC').all(projectId);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.list error:', err);
        return null;
    }
}
/**
 * 获取项目最新有数据的批次 ID（SQLite 版）
 */
export function getLatestBatch(projectId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare("\n      SELECT b.id\n      FROM cost_ledger_batches b\n      INNER JOIN cost_ledger cl ON cl.batch_id = b.id AND cl.project_id = ?\n      WHERE b.project_id = ?\n      ORDER BY b.id DESC\n      LIMIT 1\n    ").get(projectId, projectId);
        return (_a = row === null || row === void 0 ? void 0 : row.id) !== null && _a !== void 0 ? _a : 0;
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.getLatestBatch error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 批次 — 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 创建批次（SQLite 版）
 */
export function createBatch(projectId, name, id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('INSERT INTO cost_ledger_batches (id, project_id, name, created_at) VALUES (?, ?, ?, ?)').run(id, projectId, name, new Date().toISOString());
        return true;
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.create error:', err);
        return false;
    }
}
/**
 * 重命名批次（SQLite 版）
 */
export function renameBatch(projectId, batchId, name) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('UPDATE cost_ledger_batches SET name = ? WHERE project_id = ? AND id = ?').run(name, projectId, batchId);
        return true;
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.rename error:', err);
        return false;
    }
}
/**
 * 删除批次及数据（SQLite 版，使用事务）
 */
export function deleteBatch(projectId, batchId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var deleteAll = sqlite.transaction(function () {
            sqlite.prepare('DELETE FROM cost_ledger WHERE project_id = ? AND batch_id = ?')
                .run(projectId, batchId);
            sqlite.prepare('DELETE FROM cost_ledger_batches WHERE project_id = ? AND id = ?')
                .run(projectId, batchId);
        });
        deleteAll();
        return true;
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.delete error:', err);
        return false;
    }
}
/**
 * 复制版本（SQLite 版，事务中复制所有条目）
 */
export function copyBatch(projectId, sourceBatchId, newBatchId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return 0;
    try {
        var count_1 = 0;
        var copyAll = sqlite.transaction(function () {
            // 复制条目
            var rows = sqlite.prepare('SELECT * FROM cost_ledger WHERE project_id = ? AND batch_id = ?').all(projectId, sourceBatchId);
            var now = new Date().toISOString();
            var stmt = sqlite.prepare("\n        INSERT INTO cost_ledger (project_id, batch_id, voucher_no, date, direction, amount, category, summary, counterparty, channel, linked_invoice_id, linked_invoice_status, notes, attachments, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ");
            for (var _i = 0, rows_2 = rows; _i < rows_2.length; _i++) {
                var row = rows_2[_i];
                stmt.run(row.project_id, newBatchId, row.voucher_no, row.date, row.direction, row.amount, row.category, row.summary, row.counterparty, row.channel, row.linked_invoice_id, row.linked_invoice_status, row.notes, row.attachments, now, now);
                count_1++;
            }
        });
        copyAll();
        return count_1;
    }
    catch (err) {
        log.error('[SQLite] costLedgerBatches.copy error:', err);
        return 0;
    }
}
