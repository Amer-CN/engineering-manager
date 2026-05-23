/**
 * 进销存 IPC 处理器（双写模式）
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
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, inventoryQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 物料
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:inventoryItems:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (useSqliteRead()) {
        var data = inventoryQueries.listInventoryItems();
        if (data)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    return { success: true, data: db.inventoryItems.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:inventoryItems:create', function (_, item) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newItem = __assign(__assign({}, item), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.inventoryItems.push(newItem);
        saveDatabase();
        if (useSqliteWrite()) {
            inventoryQueries.createInventoryItem(newItem);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create inventory item:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:inventoryItems:update', function (_, item) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.inventoryItems.findIndex(function (i) { return i.id === item.id; });
        if (index !== -1) {
            db.inventoryItems[index] = __assign(__assign(__assign({}, db.inventoryItems[index]), item), { updatedAt: new Date().toISOString() });
            saveDatabase();
            if (useSqliteWrite()) {
                inventoryQueries.updateInventoryItem(item.id, item);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update inventory item:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:inventoryItems:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.inventoryItems = db.inventoryItems.filter(function (i) { return i.id !== id; });
        saveDatabase();
        if (useSqliteWrite()) {
            inventoryQueries.deleteInventoryItem(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete inventory item:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 出入库记录
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:inventoryTransactions:getAll', function (_, itemId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (useSqliteRead()) {
        var data = inventoryQueries.listTransactions(itemId);
        if (data)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var transactions = db.inventoryTransactions;
    if (itemId) {
        transactions = transactions.filter(function (t) { return t.itemId === itemId; });
    }
    var result = transactions.map(function (t) {
        var item = db.inventoryItems.find(function (i) { return i.id === t.itemId; });
        var project = db.projects.find(function (p) { return p.id === t.projectId; });
        var partner = db.partners.find(function (p) { return p.id === t.counterpartyId; });
        return __assign(__assign({}, t), { itemName: (item === null || item === void 0 ? void 0 : item.name) || '', projectName: (project === null || project === void 0 ? void 0 : project.name) || '', counterpartyName: (partner === null || partner === void 0 ? void 0 : partner.name) || '' });
    });
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        }) };
});
ipcMain.handle('db:inventoryTransactions:create', function (_, transaction) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newTransaction = __assign(__assign({}, transaction), { id: id, createdAt: new Date().toISOString() });
        db.inventoryTransactions.push(newTransaction);
        saveDatabase();
        if (useSqliteWrite()) {
            inventoryQueries.createTransaction(newTransaction);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create transaction:', error);
        return { success: false, error: error.message };
    }
});
