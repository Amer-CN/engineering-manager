/**
 * 工人日工资历史 IPC 处理器（双写模式）
 * 追踪工人的日工资变动，按年月记录
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
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, salaryWageHistoryQueries } from '../sqlite/queries';
// 获取某工人的工资历史（按年月降序）
ipcMain.handle('db:wageHistory:list', function (_, projectWorkerId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = salaryWageHistoryQueries.listWageHistory(projectWorkerId);
        if (data && data.length > 0)
            return { success: true, data: data };
        // 空数组时也走 JSON 的懒创建逻辑
    }
    // JSON 回退（含懒创建）
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.wageHistory)
        db.wageHistory = [];
    var records = db.wageHistory
        .filter(function (h) { return h.projectWorkerId === projectWorkerId; })
        .sort(function (a, b) { return b.yearMonth.localeCompare(a.yearMonth); });
    // 懒创建：无历史时自动补初始工资
    if (records.length === 0 && db.projectWorkers) {
        var pw_1 = db.projectWorkers.find(function (p) { return p.id === projectWorkerId; });
        if (pw_1 && db.workers) {
            var worker = db.workers.find(function (w) { return w.id === pw_1.workerId; });
            var originalWage = (worker === null || worker === void 0 ? void 0 : worker.dailyWage) || pw_1.dailyWage;
            if (originalWage && Number(originalWage) > 0) {
                var firstMonth = pw_1.entryDate && pw_1.entryDate.length >= 7
                    ? pw_1.entryDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
                if (db.attendances) {
                    var atts = db.attendances
                        .filter(function (a) { return a.projectWorkerId === projectWorkerId; })
                        .sort(function (a, b) { return a.yearMonth.localeCompare(b.yearMonth); });
                    if (atts.length > 0)
                        firstMonth = atts[0].yearMonth;
                }
                var entry = {
                    id: Date.now(),
                    projectWorkerId: projectWorkerId,
                    yearMonth: firstMonth,
                    dailyWage: Number(originalWage),
                    note: '初始工资',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                db.wageHistory.push(entry);
                saveDatabase();
                // SQLite 双写
                if (useSqliteWrite()) {
                    salaryWageHistoryQueries.saveWageHistory({
                        projectWorkerId: projectWorkerId,
                        yearMonth: firstMonth,
                        dailyWage: Number(originalWage),
                        note: '初始工资'
                    });
                }
                records = [entry];
            }
        }
    }
    return { success: true, data: records };
});
// 创建/更新工资历史记录（同时同步 projectWorker.dailyWage）
ipcMain.handle('db:wageHistory:save', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wageHistory)
        db.wageHistory = [];
    try {
        var existingIndex = db.wageHistory.findIndex(function (h) { return h.projectWorkerId === record.projectWorkerId && h.yearMonth === record.yearMonth; });
        if (existingIndex !== -1) {
            db.wageHistory[existingIndex] = __assign(__assign(__assign({}, db.wageHistory[existingIndex]), record), { updatedAt: new Date().toISOString() });
        }
        else {
            db.wageHistory.push(__assign(__assign({}, record), { id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
        }
        // 同步更新 projectWorker 的 dailyWage
        if (db.projectWorkers) {
            var pwIndex = db.projectWorkers.findIndex(function (pw) { return pw.id === record.projectWorkerId; });
            if (pwIndex !== -1) {
                db.projectWorkers[pwIndex] = __assign(__assign({}, db.projectWorkers[pwIndex]), { dailyWage: record.dailyWage, updatedAt: new Date().toISOString() });
            }
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            salaryWageHistoryQueries.saveWageHistory(record);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to save wage history:', error);
        return { success: false, error: error.message };
    }
});
// 获取指定月份的有效日工资标准
ipcMain.handle('db:wageHistory:getEffective', function (_, projectWorkerId, yearMonth) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = salaryWageHistoryQueries.getEffectiveWage(projectWorkerId, yearMonth);
        if (data)
            return { success: true, data: data };
        // 无历史时回退到 project_worker 上的 daily_wage
        if (db.projectWorkers) {
            var pw = db.projectWorkers.find(function (p) { return p.id === projectWorkerId; });
            return { success: true, data: { dailyWage: (pw === null || pw === void 0 ? void 0 : pw.dailyWage) || 0, yearMonth: '' } };
        }
        return { success: true, data: { dailyWage: 0, yearMonth: '' } };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.wageHistory)
        db.wageHistory = [];
    var records = db.wageHistory
        .filter(function (h) { return h.projectWorkerId === projectWorkerId && h.yearMonth <= yearMonth; })
        .sort(function (a, b) { return b.yearMonth.localeCompare(a.yearMonth); });
    if (records.length > 0)
        return { success: true, data: records[0] };
    if (db.projectWorkers) {
        var pw = db.projectWorkers.find(function (p) { return p.id === projectWorkerId; });
        return { success: true, data: { dailyWage: (pw === null || pw === void 0 ? void 0 : pw.dailyWage) || 0, yearMonth: '' } };
    }
    return { success: true, data: { dailyWage: 0, yearMonth: '' } };
});
// 删除工资历史记录
ipcMain.handle('db:wageHistory:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wageHistory)
        db.wageHistory = [];
    try {
        db.wageHistory = db.wageHistory.filter(function (h) { return h.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            salaryWageHistoryQueries.deleteWageHistory(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete wage history:', error);
        return { success: false, error: error.message };
    }
});
