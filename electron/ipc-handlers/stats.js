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
/**
 * 统计 IPC 处理器 — SQLite 优先读取版
 *
 * 仪表盘统计接口，SQLite 优先聚合，JSON 回退。
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, dbReady } from '../database';
import { useSqliteRead, shouldFallbackToJson } from '../sqlite';
import { statsQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 统计接口
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:stats:getDashboard', function () {
    var _a, _b, _c;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先读取
    if (useSqliteRead()) {
        try {
            var stats = statsQueries.getDashboard();
            if (stats) {
                // 补充 recentProjects 的完整字段（SQLite 查询只返回基本字段）
                var recentProjects = stats.recentProjects.map(function (p) {
                    var fullProject = db.projects.find(function (fp) { return fp.id === p.id; });
                    return fullProject || p;
                });
                return { success: true, data: __assign(__assign({}, stats), { recentProjects: recentProjects }) };
            }
        }
        catch (err) {
            log.warn('[stats:getDashboard] SQLite read failed, falling back to JSON:', err);
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    try {
        var projectsCount = db.projects.length;
        var membersCount = db.members.length;
        var materialsCount = db.materials.length;
        var totalExpenses = (db.costLedger || []).filter(function (e) { return e.direction === 'expense'; }).reduce(function (sum, e) { return sum + (e.amount || 0); }, 0);
        var resolveCategoryLabel = function (code) {
            if (db.costLedgerCategories) {
                var cat = db.costLedgerCategories.find(function (c) { return c.code === code && c.isEnabled !== false; });
                if (cat)
                    return cat.level1 || cat.label;
            }
            return code;
        };
        var expenseByCategory = {};
        for (var _i = 0, _d = (db.costLedger || []); _i < _d.length; _i++) {
            var e = _d[_i];
            if (e.direction === 'expense') {
                var label = resolveCategoryLabel(e.category || '其他');
                expenseByCategory[label] = (expenseByCategory[label] || 0) + (e.amount || 0);
            }
        }
        var settlementsCount = ((_a = db.settlements) === null || _a === void 0 ? void 0 : _a.length) || 0;
        var invoicesCount = ((_b = db.invoices) === null || _b === void 0 ? void 0 : _b.length) || 0;
        var inventoryItemsCount = ((_c = db.inventoryItems) === null || _c === void 0 ? void 0 : _c.length) || 0;
        var inProgressProjects = db.projects.filter(function (p) { return p.status === 'in_progress'; }).length;
        var recentProjects = __spreadArray([], db.projects, true).sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })
            .slice(0, 5);
        return {
            success: true,
            data: {
                projectsCount: projectsCount,
                membersCount: membersCount,
                materialsCount: materialsCount,
                totalExpenses: totalExpenses,
                expenseByCategory: expenseByCategory,
                settlementsCount: settlementsCount,
                invoicesCount: invoicesCount,
                inventoryItemsCount: inventoryItemsCount,
                inProgressProjects: inProgressProjects,
                recentProjects: recentProjects
            }
        };
    }
    catch (error) {
        log.error('Failed to get stats:', error);
        return { success: false, error: error.message };
    }
});
