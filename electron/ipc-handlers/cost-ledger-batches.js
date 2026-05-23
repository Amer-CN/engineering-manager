/**
 * 成本台账版本（批次）管理 IPC 处理器
 * 通道：batches:list / create / rename / copy / delete
 * 数据集合：db.costLedgerBatches, db.costLedger
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
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
import { ensureBatchesInit } from './cost-ledger-helpers';
import { useSqliteRead, shouldFallbackToJson, costLedgerQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:list — 列出版本列表
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerBatches:list', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // ── SQLite 读路径 ──
        if (useSqliteRead()) {
            var batches_1 = costLedgerQueries.listBatches(projectId);
            if (batches_1 !== null) {
                return { success: true, data: batches_1 };
            }
            log.warn('[DualWrite] costLedgerBatches.list SQLite read failed, falling back to JSON');
        }
        if (!shouldFallbackToJson())
            return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
        // ── JSON 读路径（原有逻辑） ──
        if (!db.costLedgerBatches)
            db.costLedgerBatches = [];
        ensureBatchesInit();
        var batches = db.costLedgerBatches
            .filter(function (b) { return b.projectId === projectId; })
            .sort(function (a, b) { return a.id - b.id; });
        return { success: true, data: batches };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:create — 新建版本
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerBatches:create', function (_, projectId, name) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedgerBatches)
            db.costLedgerBatches = [];
        var maxId = db.costLedgerBatches.reduce(function (max, b) { return Math.max(max, b.id || 0); }, 0);
        var newBatch = { id: maxId + 1, projectId: projectId, name: name, createdAt: new Date().toISOString() };
        // ── JSON 写（原有逻辑） ──
        db.costLedgerBatches.push(newBatch);
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.createBatch(projectId, name, newBatch.id);
        return { success: true, data: newBatch };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:rename — 重命名版本
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerBatches:rename', function (_, projectId, batchId, name) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedgerBatches)
            db.costLedgerBatches = [];
        var batch = db.costLedgerBatches.find(function (b) { return b.projectId === projectId && b.id === batchId; });
        if (!batch)
            return { success: false, error: '版本不存在' };
        // ── JSON 写（原有逻辑） ──
        batch.name = name;
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.renameBatch(projectId, batchId, name);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:copy — 复制版本（新建版本 + 复制该版本所有数据）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerBatches:copy', function (_, projectId, sourceBatchId, name) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.costLedgerBatches)
            db.costLedgerBatches = [];
        // 新建版本
        var maxId = db.costLedgerBatches.reduce(function (max, b) { return Math.max(max, b.id || 0); }, 0);
        var newBatch_1 = { id: maxId + 1, projectId: projectId, name: name, createdAt: new Date().toISOString() };
        db.costLedgerBatches.push(newBatch_1);
        // 复制源版本的所有记录到新版本
        if (!db.costLedger)
            db.costLedger = [];
        var sourceEntries = db.costLedger.filter(function (e) { return e.projectId === projectId && (e.batchId || 0) === sourceBatchId; });
        var now_1 = new Date().toISOString();
        var counter_1 = 0;
        var copiedEntries = sourceEntries.map(function (entry) {
            counter_1++;
            return __assign(__assign({}, entry), { id: Date.now() + counter_1, batchId: newBatch_1.id, createdAt: now_1, updatedAt: now_1 });
        });
        (_a = db.costLedger).push.apply(_a, copiedEntries);
        // ── JSON 写（原有逻辑） ──
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.createBatch(projectId, name, newBatch_1.id);
        costLedgerQueries.copyBatch(projectId, sourceBatchId, newBatch_1.id);
        return { success: true, data: newBatch_1, count: copiedEntries.length };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerBatches:delete — 删除版本及数据
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerBatches:delete', function (_, projectId, batchId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (batchId === 0)
            return { success: false, error: '不能删除初始版' };
        if (!db.costLedgerBatches)
            db.costLedgerBatches = [];
        // ── JSON 写（原有逻辑） ──
        db.costLedgerBatches = db.costLedgerBatches.filter(function (b) { return !(b.projectId === projectId && b.id === batchId); });
        if (db.costLedger) {
            db.costLedger = db.costLedger.filter(function (e) { return !(e.projectId === projectId && (e.batchId || 0) === batchId); });
        }
        saveDatabase();
        // ── SQLite 双写 ──
        costLedgerQueries.deleteBatch(projectId, batchId);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
