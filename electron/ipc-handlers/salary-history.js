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
/**
 * 薪资历史 IPC 处理器（双写模式）
 * 支持按生效日期追踪薪资变动，薪酬计算按月份查找对应薪资
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, dbReady, saveDatabase } from '../database';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, salaryWageHistoryQueries } from '../sqlite/queries';
// 按成员获取薪资历史（按生效日期降序）
ipcMain.handle('db:salaryHistory:list', function (_, memberId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = salaryWageHistoryQueries.listSalaryHistory(memberId);
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.salaryHistory)
        db.salaryHistory = [];
    var records = db.salaryHistory
        .filter(function (s) { return s.memberId === memberId; })
        .sort(function (a, b) { return b.effectiveDate.localeCompare(a.effectiveDate); });
    return { success: true, data: records };
});
// 创建薪资历史记录
ipcMain.handle('db:salaryHistory:create', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.salaryHistory)
        db.salaryHistory = [];
    try {
        // 重名检查
        if (useSqliteRead()) {
            var exists = salaryWageHistoryQueries.existsSalaryHistory(record.memberId, record.effectiveDate);
            if (exists === true)
                return { success: false, error: '该日期的薪资记录已存在' };
        }
        else {
            var exists = db.salaryHistory.some(function (s) { return s.memberId === record.memberId && s.effectiveDate === record.effectiveDate; });
            if (exists)
                return { success: false, error: '该日期的薪资记录已存在' };
        }
        var entry = __assign(__assign({}, record), { id: Date.now(), createdAt: new Date().toISOString() });
        db.salaryHistory.push(entry);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            salaryWageHistoryQueries.createSalaryHistory(entry);
        }
        return { success: true, data: entry };
    }
    catch (error) {
        log.error('Failed to create salary history:', error);
        return { success: false, error: error.message };
    }
});
// 删除薪资历史记录
ipcMain.handle('db:salaryHistory:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.salaryHistory)
        db.salaryHistory = [];
    try {
        db.salaryHistory = db.salaryHistory.filter(function (s) { return s.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            salaryWageHistoryQueries.deleteSalaryHistory(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete salary history:', error);
        return { success: false, error: error.message };
    }
});
// 获取某成员在某年月的有效薪资（最晚的、不晚于该月最后一天的记录）
ipcMain.handle('db:salaryHistory:getEffective', function (_, memberId, yearMonth) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = salaryWageHistoryQueries.getEffectiveSalary(memberId, yearMonth);
        if (data)
            return { success: true, data: data };
        // 无历史记录时回退到 member.baseSalary
        var member_1 = db.members.find(function (m) { return m.id === memberId; });
        return { success: true, data: { baseSalary: (member_1 === null || member_1 === void 0 ? void 0 : member_1.baseSalary) || 0, subsidy: (member_1 === null || member_1 === void 0 ? void 0 : member_1.subsidy) || 0, effectiveDate: '' } };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.salaryHistory)
        db.salaryHistory = [];
    var _a = yearMonth.split('-').map(Number), y = _a[0], m = _a[1];
    var monthEnd = "".concat(yearMonth, "-").concat(String(new Date(y, m, 0).getDate()).padStart(2, '0'));
    var records = db.salaryHistory
        .filter(function (s) { return s.memberId === memberId && s.effectiveDate <= monthEnd; })
        .sort(function (a, b) { return b.effectiveDate.localeCompare(a.effectiveDate); });
    if (records.length > 0)
        return { success: true, data: records[0] };
    var member = db.members.find(function (m) { return m.id === memberId; });
    return { success: true, data: { baseSalary: (member === null || member === void 0 ? void 0 : member.baseSalary) || 0, subsidy: (member === null || member === void 0 ? void 0 : member.subsidy) || 0, effectiveDate: '' } };
});
