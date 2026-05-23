/**
 * 成本台账分类管理 IPC 处理器
 * 通道：categories:list / create / update / delete / reset
 * 数据集合：db.costLedgerCategories
 * 双写：SQLite（cost_ledger_categories 表）
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
import { db, dbReady, saveDatabase } from '../database';
import { ensureCategories, seedBuiltinCategories } from './cost-ledger-categories-data';
import { useSqliteRead, shouldFallbackToJson, categoryQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:list — 列出所有分类（可按方向过滤）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerCategories:list', function (_, direction) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // SQLite 优先
        if (useSqliteRead()) {
            var data = categoryQueries.listCategories(direction);
            if (data !== null)
                return { success: true, data: data };
        }
        if (!shouldFallbackToJson())
            return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
        // JSON 回退
        var categories = ensureCategories();
        var result = categories.filter(function (c) { return c.isEnabled !== false; });
        if (direction && (direction === 'expense' || direction === 'income')) {
            result = result.filter(function (c) { return c.direction === direction; });
        }
        result.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
        return { success: true, data: result };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:create — 新建自定义分类
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerCategories:create', function (_, data) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        ensureCategories();
        var label_1 = data.label, direction_1 = data.direction, level1 = data.level1;
        if (!label_1 || !label_1.trim())
            return { success: false, error: '分类名称不能为空' };
        if (direction_1 !== 'expense' && direction_1 !== 'income')
            return { success: false, error: '方向无效' };
        if (label_1.length > 20)
            return { success: false, error: '分类名称不超过20字' };
        var existing = db.costLedgerCategories.find(function (c) {
            return c.label === label_1.trim() && c.direction === direction_1 && c.isEnabled !== false;
        });
        if (existing)
            return { success: false, error: "\u5206\u7C7B\"".concat(label_1, "\"\u5DF2\u5B58\u5728") };
        var maxOrder = db.costLedgerCategories
            .filter(function (c) { return c.direction === direction_1; })
            .reduce(function (max, c) { return Math.max(max, c.sortOrder || 0); }, 0);
        var newCat = {
            id: Date.now(),
            code: "custom_".concat(Date.now()),
            label: label_1.trim(),
            direction: direction_1,
            color: data.color || '#6b7280',
            isBuiltin: false,
            isEnabled: true,
            sortOrder: maxOrder + 1,
        };
        if (level1)
            newCat.level1 = level1;
        db.costLedgerCategories.push(newCat);
        saveDatabase();
        // SQLite 双写
        categoryQueries.createCategory(newCat);
        return { success: true, data: newCat };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:update — 更新分类
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerCategories:update', function (_, id, changes) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        ensureCategories();
        var idx = db.costLedgerCategories.findIndex(function (c) { return c.id === id; });
        if (idx === -1)
            return { success: false, error: '分类不存在' };
        var cat_1 = db.costLedgerCategories[idx];
        // 检查名称重复
        if (changes.label) {
            var dup = db.costLedgerCategories.find(function (c) {
                return c.id !== id && c.label === changes.label && c.direction === cat_1.direction && c.isEnabled !== false;
            });
            if (dup)
                return { success: false, error: "\u5206\u7C7B\"".concat(changes.label, "\"\u5DF2\u5B58\u5728") };
        }
        // 内置分类仅允许改 label/color/isEnabled
        if (cat_1.isBuiltin) {
            var allowed = {};
            if (changes.label !== undefined)
                allowed.label = changes.label;
            if (changes.color !== undefined)
                allowed.color = changes.color;
            if (changes.isEnabled !== undefined)
                allowed.isEnabled = changes.isEnabled;
            db.costLedgerCategories[idx] = __assign(__assign({}, cat_1), allowed);
        }
        else {
            db.costLedgerCategories[idx] = __assign(__assign(__assign({}, cat_1), changes), { id: cat_1.id });
        }
        saveDatabase();
        // SQLite 双写
        categoryQueries.updateCategory(id, db.costLedgerCategories[idx]);
        return { success: true, data: db.costLedgerCategories[idx] };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:delete — 删除分类（内置不可删除）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerCategories:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        ensureCategories();
        var idx = db.costLedgerCategories.findIndex(function (c) { return c.id === id; });
        if (idx === -1)
            return { success: false, error: '分类不存在' };
        if (db.costLedgerCategories[idx].isBuiltin) {
            return { success: false, error: '内置分类不可删除' };
        }
        var code_1 = db.costLedgerCategories[idx].code;
        // 检查是否被条目引用
        if (db.costLedger) {
            var refCount = db.costLedger.filter(function (e) { return e.category === code_1; }).length;
            if (refCount > 0) {
                return {
                    success: false,
                    error: "\u8BE5\u5206\u7C7B\u88AB ".concat(refCount, " \u6761\u53F0\u8D26\u8BB0\u5F55\u5F15\u7528\uFF0C\u4E0D\u80FD\u5220\u9664"),
                    warning: "refs:".concat(refCount),
                };
            }
        }
        db.costLedgerCategories.splice(idx, 1);
        saveDatabase();
        // SQLite 双写
        categoryQueries.deleteCategory(id);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// db:costLedgerCategories:reset — 恢复默认分类
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:costLedgerCategories:reset', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.costLedgerCategories = seedBuiltinCategories();
        saveDatabase();
        // SQLite 双写
        categoryQueries.resetCategories(db.costLedgerCategories);
        return { success: true, data: db.costLedgerCategories };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
