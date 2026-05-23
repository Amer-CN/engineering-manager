/**
 * 成本台账核心 IPC 处理器
 *
 * 7 个通道：list / create / batchCreate / update / delete / summary / deleteByProject
 * 数据集合：db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *   前端无需任何改动
 *
 * 其他分类/版本/匹配规则通道 → 独立文件：
 *   cost-ledger-categories.ts   — 分类管理（5个通道）
 *   cost-ledger-batches.ts     — 版本管理（5个通道）
 *   cost-ledger-match-rules.ts — 匹配规则（2个通道）
 *   cost-ledger-helpers.ts     — 共享工具函数
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
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, dbReady, saveDatabase } from '../database';
import { ensureBatchesInit, getLatestBatch } from './cost-ledger-helpers';
import { useSqliteRead, shouldFallbackToJson, costLedgerQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:list — 按项目列出台账记录（含发票状态解析）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:list', function (_, projectId, batchId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // ── SQLite 读路径 ──
        if (useSqliteRead()) {
            // 需要计算 targetBatch（不传 batchId 时默认取最新版本）
            var targetBatch_1 = batchId;
            if (targetBatch_1 === undefined) {
                var latestBatch = costLedgerQueries.getLatestBatch(projectId);
                targetBatch_1 = latestBatch !== null && latestBatch !== void 0 ? latestBatch : 0;
            }
            var entries_1 = costLedgerQueries.listEntries(projectId, targetBatch_1);
            if (entries_1 !== null) {
                return { success: true, data: entries_1 };
            }
            // SQLite 读取失败，fallthrough 到 JSON
            log.warn('[DualWrite] costLedger.list SQLite read failed, falling back to JSON');
        }
        if (!shouldFallbackToJson())
            return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
        // ── JSON 读路径（原有逻辑） ──
        if (!db.costLedger)
            db.costLedger = [];
        ensureBatchesInit();
        var targetBatch_2 = batchId !== null && batchId !== void 0 ? batchId : getLatestBatch(projectId);
        var entries = db.costLedger
            .filter(function (e) { return e.projectId === projectId && (e.batchId || 0) === targetBatch_2; })
            .sort(function (a, b) {
            var ta = new Date(a.date).getTime();
            var tb = new Date(b.date).getTime();
            return (isNaN(tb) ? new Date(b.date.replace(/[,，]/g, '.')).getTime() : tb)
                - (isNaN(ta) ? new Date(a.date.replace(/[,，]/g, '.')).getTime() : ta);
        })
            .map(function (e) {
            var linkedInvoiceStatus = null;
            if (e.linkedInvoiceId != null && db.invoices) {
                var invoice = db.invoices.find(function (inv) { return inv.id === e.linkedInvoiceId; });
                linkedInvoiceStatus = invoice ? 'active' : 'deleted';
            }
            return __assign(__assign({}, e), { linkedInvoiceStatus: linkedInvoiceStatus });
        });
        return { success: true, data: entries };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:create — 新增台账记录（含发票存在性校验）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:create', function (_, entry) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedger)
            db.costLedger = [];
        // 凭证号：保留原始值，不自动填充（无凭证号 = 该笔无凭证）
        var voucherNo = (entry.voucherNo && String(entry.voucherNo).trim())
            ? String(entry.voucherNo).trim()
            : '';
        // 发票存在性校验（仅警告，不阻塞）
        var linkedInvoiceWarning = null;
        if (entry.linkedInvoiceId != null && db.invoices) {
            var invoice = db.invoices.find(function (inv) { return inv.id === entry.linkedInvoiceId; });
            if (!invoice)
                linkedInvoiceWarning = "\u53D1\u7968 #".concat(entry.linkedInvoiceId, " \u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664");
        }
        var now = new Date().toISOString();
        var newEntry = __assign(__assign({}, entry), { id: Date.now(), projectId: entry.projectId, batchId: entry.batchId || 0, voucherNo: voucherNo, attachments: entry.attachments || [], createdAt: now, updatedAt: now });
        // ── JSON 写（原有逻辑） ──
        db.costLedger.push(newEntry);
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.createEntry(newEntry);
        return { success: true, data: newEntry, warning: linkedInvoiceWarning };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:batchCreate — 批量创建台账记录（导入用）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:batchCreate', function (_, projectId, entries, batchId) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedger)
            db.costLedger = [];
        var now_1 = new Date().toISOString();
        var counter_1 = 0;
        var newEntries = entries.map(function (entry) {
            var voucherNo = (entry.voucherNo && String(entry.voucherNo).trim())
                ? String(entry.voucherNo).trim()
                : '';
            counter_1++;
            return __assign(__assign({}, entry), { id: Date.now() + counter_1, projectId: projectId, batchId: batchId, voucherNo: voucherNo, attachments: entry.attachments || [], createdAt: now_1, updatedAt: now_1 });
        });
        // ── JSON 写（原有逻辑） ──
        (_a = db.costLedger).push.apply(_a, newEntries);
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.batchCreateEntries(newEntries);
        return { success: true, count: newEntries.length };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:update — 更新台账记录
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:update', function (_, id, changes) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedger)
            db.costLedger = [];
        var idx = db.costLedger.findIndex(function (e) { return e.id === id; });
        if (idx === -1)
            return { success: false, error: '记录不存在' };
        // 发票存在性校验
        var linkedInvoiceWarning = null;
        if (changes.linkedInvoiceId != null && db.invoices) {
            var invoice = db.invoices.find(function (inv) { return inv.id === changes.linkedInvoiceId; });
            if (!invoice)
                linkedInvoiceWarning = "\u53D1\u7968 #".concat(changes.linkedInvoiceId, " \u4E0D\u5B58\u5728\u6216\u5DF2\u5220\u9664");
        }
        var updated = __assign(__assign(__assign({}, db.costLedger[idx]), changes), { id: db.costLedger[idx].id, updatedAt: new Date().toISOString() });
        // ── JSON 写（原有逻辑） ──
        db.costLedger[idx] = updated;
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.updateEntry(id, updated);
        return { success: true, data: updated, warning: linkedInvoiceWarning };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:delete — 删除台账记录
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedger)
            db.costLedger = [];
        // ── JSON 写（原有逻辑） ──
        db.costLedger = db.costLedger.filter(function (e) { return e.id !== id; });
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.deleteEntry(id);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:summary — 按项目汇总（总支出/总收入/分类小计）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:summary', function (_, projectId, batchId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // ── SQLite 读路径 ──
        if (useSqliteRead()) {
            var targetBatch_3 = batchId;
            if (targetBatch_3 === undefined) {
                var latestBatch = costLedgerQueries.getLatestBatch(projectId);
                targetBatch_3 = latestBatch !== null && latestBatch !== void 0 ? latestBatch : 0;
            }
            var result = costLedgerQueries.summary(projectId, targetBatch_3);
            if (result !== null) {
                return { success: true, data: result };
            }
            log.warn('[DualWrite] costLedger.summary SQLite read failed, falling back to JSON');
        }
        if (!shouldFallbackToJson())
            return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
        // ── JSON 读路径（原有逻辑） ──
        if (!db.costLedger)
            db.costLedger = [];
        var targetBatch_4 = batchId !== null && batchId !== void 0 ? batchId : getLatestBatch(projectId);
        var entries = db.costLedger.filter(function (e) { return e.projectId === projectId && e.amount > 0 && (e.batchId || 0) === targetBatch_4; });
        var totalExpense = 0;
        var totalIncome = 0;
        var byCategory = {};
        for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
            var e = entries_2[_i];
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
            if (e.direction === 'expense')
                totalExpense += e.amount;
            else if (e.direction === 'income')
                totalIncome += e.amount;
        }
        return { success: true, data: { totalExpense: totalExpense, totalIncome: totalIncome, byCategory: byCategory } };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedger:deleteByProject — 按项目级联删除（供 projects:delete 调用）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedger:deleteByProject', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedger) {
            db.costLedger = [];
            return { success: true };
        }
        // ── JSON 写（原有逻辑） ──
        db.costLedger = db.costLedger.filter(function (e) { return e.projectId !== projectId; });
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.deleteByProject(projectId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
