/**
 * 材料与费用 IPC 处理器（双写模式）
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
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, materialQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 材料 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:materials:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (useSqliteRead()) {
        var data = materialQueries.listMaterials(projectId);
        if (data)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var materials = db.materials;
    if (projectId) {
        materials = materials.filter(function (m) { return m.projectId === projectId; });
    }
    return { success: true, data: materials.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:materials:create', function (_, material) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newMaterial = __assign(__assign({}, material), { id: id, createdAt: new Date().toISOString() });
        db.materials.push(newMaterial);
        saveDatabase();
        if (useSqliteWrite()) {
            materialQueries.createMaterial(newMaterial);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create material:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:materials:update', function (_, material) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.materials.findIndex(function (m) { return m.id === material.id; });
        if (index !== -1) {
            db.materials[index] = __assign(__assign({}, db.materials[index]), material);
            saveDatabase();
            if (useSqliteWrite()) {
                materialQueries.updateMaterial(material.id, material);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update material:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:materials:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.materials = db.materials.filter(function (m) { return m.id !== id; });
        saveDatabase();
        if (useSqliteWrite()) {
            materialQueries.deleteMaterial(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete material:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 费用 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:expenses:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (useSqliteRead()) {
        var data = materialQueries.listExpenses(projectId);
        if (data)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var expenses = db.expenses;
    if (projectId) {
        expenses = expenses.filter(function (e) { return e.projectId === projectId; });
    }
    return { success: true, data: expenses.sort(function (a, b) {
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        }) };
});
ipcMain.handle('db:expenses:create', function (_, expense) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newExpense = __assign(__assign({}, expense), { id: id, createdAt: new Date().toISOString() });
        db.expenses.push(newExpense);
        saveDatabase();
        if (useSqliteWrite()) {
            materialQueries.createExpense(newExpense);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create expense:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:expenses:update', function (_, expense) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.expenses.findIndex(function (e) { return e.id === expense.id; });
        if (index !== -1) {
            db.expenses[index] = __assign(__assign({}, db.expenses[index]), expense);
            saveDatabase();
            if (useSqliteWrite()) {
                materialQueries.updateExpense(expense.id, expense);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update expense:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:expenses:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.expenses = db.expenses.filter(function (e) { return e.id !== id; });
        saveDatabase();
        if (useSqliteWrite()) {
            materialQueries.deleteExpense(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete expense:', error);
        return { success: false, error: error.message };
    }
});
