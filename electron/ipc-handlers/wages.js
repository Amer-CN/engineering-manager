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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/**
 * 工资 IPC Handler — SQLite 双写版
 *
 * 双写通道：getAll / create / update / batchSave / delete / batchDelete / batchClearPayments / batchArchivePayments
 * JSON-only：generateForProject / getStats / parseBankReceipt
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, dbReady, saveDatabase } from '../database';
import { calculateActualWage, generateProjectWages, parseBankReceipt } from './wage-calc';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson } from '../sqlite';
import { wageQueries } from '../sqlite/queries';
// ══════════════════════════════════════════════════════════════════════════════
// 辅助：富化工资记录（从 JSON 侧补充 memberName/memberType/teamName/bankAccount/projectName）
// ══════════════════════════════════════════════════════════════════════════════
function enrichWage(w) {
    var _a, _b, _c, _d;
    var memberName = '';
    var memberType = 'worker';
    var teamName = '';
    var bankAccount = '';
    if (w.memberId) {
        var member_1 = (_a = db.members) === null || _a === void 0 ? void 0 : _a.find(function (m) { return m.id === w.memberId; });
        memberName = (member_1 === null || member_1 === void 0 ? void 0 : member_1.name) || '';
        memberType = (member_1 === null || member_1 === void 0 ? void 0 : member_1.memberType) || 'worker';
        var team = (_b = db.workerTeams) === null || _b === void 0 ? void 0 : _b.find(function (t) { return t.id === (member_1 === null || member_1 === void 0 ? void 0 : member_1.teamId); });
        teamName = (team === null || team === void 0 ? void 0 : team.name) || '';
    }
    else if (w.projectWorkerId && db.projectWorkers) {
        var pw_1 = db.projectWorkers.find(function (p) { return p.id === w.projectWorkerId; });
        if (pw_1 && db.workers) {
            var worker = db.workers.find(function (wk) { return wk.id === pw_1.workerId; });
            memberName = (worker === null || worker === void 0 ? void 0 : worker.name) || '';
            bankAccount = (worker === null || worker === void 0 ? void 0 : worker.bankAccount) || '';
            var team = (_c = db.workerTeams) === null || _c === void 0 ? void 0 : _c.find(function (t) { return t.id === pw_1.teamId; });
            teamName = (team === null || team === void 0 ? void 0 : team.name) || '';
        }
    }
    var project = (_d = db.projects) === null || _d === void 0 ? void 0 : _d.find(function (p) { return p.id === w.projectId; });
    return __assign(__assign({}, w), { memberName: memberName, memberType: memberType, projectName: (project === null || project === void 0 ? void 0 : project.name) || '', teamName: teamName, bankAccount: bankAccount });
}
/** 去重：同 projectWorkerId/memberId + yearMonth 只保留最新 */
function dedupWages(records) {
    var deduped = new Map();
    for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
        var w = records_1[_i];
        var key = w.memberId
            ? "staff-".concat(w.memberId, "-").concat(w.yearMonth)
            : "worker-".concat(w.projectWorkerId, "-").concat(w.yearMonth);
        if (!deduped.has(key) || new Date(w.updatedAt).getTime() > new Date(deduped.get(key).updatedAt).getTime()) {
            deduped.set(key, w);
        }
    }
    return Array.from(deduped.values());
}
// ══════════════════════════════════════════════════════════════════════════════
// 1. 获取工资列表（SQLite 优先读取 + JSON 回退）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:getAll', function (_, projectId, yearMonth, memberId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先读取
    if (useSqliteRead()) {
        try {
            var sqliteRecords = wageQueries.listWages({ projectId: projectId, yearMonth: yearMonth, memberId: memberId });
            if (sqliteRecords.length > 0 || (projectId || yearMonth || memberId)) {
                // 有过滤条件或查到数据，直接使用
                var deduped_1 = dedupWages(sqliteRecords);
                var enriched = deduped_1.map(function (w) { return enrichWage(w); });
                return {
                    success: true,
                    data: enriched.sort(function (a, b) {
                        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    })
                };
            }
        }
        catch (err) {
            log.warn('[wages:getAll] SQLite read failed, falling back to JSON:', err);
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.wages)
        db.wages = [];
    var records = db.wages;
    if (projectId)
        records = records.filter(function (w) { return w.projectId === projectId; });
    if (yearMonth)
        records = records.filter(function (w) { return w.yearMonth === yearMonth; });
    if (memberId)
        records = records.filter(function (w) { return w.memberId === memberId; });
    var deduped = dedupWages(records);
    var result = deduped.map(function (w) { return enrichWage(w); });
    return {
        success: true,
        data: result.sort(function (a, b) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
    };
});
// ══════════════════════════════════════════════════════════════════════════════
// 2. 生成项目工资表（JSON-only，复杂计算逻辑）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:generateForProject', function (_, projectId, yearMonth) {
    try {
        return generateProjectWages(projectId, yearMonth);
    }
    catch (error) {
        log.error('Failed to generate project wages:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 3. 创建单条工资记录
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:create', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        var id = Date.now();
        var newRecord = __assign(__assign({}, record), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.wages.push(newRecord);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.createWage(newRecord);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create wage:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 4. 更新工资记录（带重新计算）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:update', function (_, record) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        var index = db.wages.findIndex(function (w) { return w.id === record.id; });
        if (index !== -1) {
            var existing = db.wages[index];
            var dailyWage = (_b = (_a = record.dailyWage) !== null && _a !== void 0 ? _a : existing.dailyWage) !== null && _b !== void 0 ? _b : 0;
            var workDays = (_d = (_c = record.workDays) !== null && _c !== void 0 ? _c : existing.workDays) !== null && _d !== void 0 ? _d : 0;
            var bonus = (_f = (_e = record.bonus) !== null && _e !== void 0 ? _e : existing.bonus) !== null && _f !== void 0 ? _f : 0;
            var deduction = (_h = (_g = record.deduction) !== null && _g !== void 0 ? _g : existing.deduction) !== null && _h !== void 0 ? _h : 0;
            var actualWage = calculateActualWage(dailyWage, workDays, bonus, deduction);
            db.wages[index] = __assign(__assign(__assign({}, existing), record), { actualWage: actualWage, updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                wageQueries.updateWage(record.id, __assign(__assign({}, record), { actualWage: actualWage }));
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update wage:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 5. 批量保存工资（替换该项目+月份的所有工资记录）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:batchSave', function (_, records) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        if (records.length === 0)
            return { success: true };
        var _a = records[0], projectId_1 = _a.projectId, yearMonth_1 = _a.yearMonth;
        // 删除旧的
        db.wages = db.wages.filter(function (w) { return !(w.projectId === projectId_1 && w.yearMonth === yearMonth_1); });
        // 插入新的
        var now = new Date().toISOString();
        for (var _i = 0, records_2 = records; _i < records_2.length; _i++) {
            var record = records_2[_i];
            db.wages.push(__assign(__assign({}, record), { updatedAt: now }));
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.batchSaveWages(records);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to batch save wages:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 6. 删除工资记录
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        db.wages = db.wages.filter(function (w) { return w.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.deleteWage(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete wage:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:wages:batchDelete', function (_, ids) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        var idSet_1 = new Set(ids);
        db.wages = db.wages.filter(function (w) { return !idSet_1.has(w.id); });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.batchDeleteWages(ids);
        }
        return { success: true, data: { deleted: ids.length } };
    }
    catch (error) {
        log.error('Failed to batch delete wages:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 7. 批量清空发放字段
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:batchClearPayments', function (_, ids) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        var idSet = new Set(ids);
        var cleared = 0;
        for (var _i = 0, _a = db.wages; _i < _a.length; _i++) {
            var w = _a[_i];
            if (idSet.has(w.id)) {
                w.paidAmount = 0;
                w.paidDate = '';
                w.bankReceiptPath = undefined;
                w.paymentLocked = false;
                w.updatedAt = new Date().toISOString();
                cleared++;
            }
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.batchClearPayments(ids);
        }
        return { success: true, data: { cleared: cleared } };
    }
    catch (error) {
        log.error('Failed to batch clear payments:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 8. 批量归档工资发放记录
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:batchArchivePayments', function (_, ids) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    try {
        var idSet = new Set(ids);
        var archived = 0;
        for (var _i = 0, _a = db.wages; _i < _a.length; _i++) {
            var w = _a[_i];
            if (idSet.has(w.id)) {
                w.paymentLocked = true;
                w.updatedAt = new Date().toISOString();
                archived++;
            }
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            wageQueries.batchArchivePayments(ids);
        }
        return { success: true, data: { archived: archived } };
    }
    catch (error) {
        log.error('Failed to batch archive payments:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 9. 工资统计（SQLite 优先聚合，JSON 回退）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:getStats', function (_, yearMonth, projectId) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先聚合
    if (useSqliteRead()) {
        try {
            var stats = wageQueries.getWageStats({ yearMonth: yearMonth, projectId: projectId });
            if (stats) {
                return { success: true, data: stats };
            }
        }
        catch (err) {
            log.warn('[wages:getStats] SQLite read failed, falling back to JSON:', err);
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.wages)
        db.wages = [];
    try {
        var records = db.wages;
        if (yearMonth) {
            records = records.filter(function (w) { return w.yearMonth === yearMonth; });
        }
        if (projectId) {
            records = records.filter(function (w) { return w.projectId === projectId; });
        }
        // 过滤无效记录：projectWorkerId 必须对应存在的 projectWorker
        if (db.projectWorkers) {
            var validPWIds_1 = new Set(db.projectWorkers.map(function (pw) { return pw.id; }));
            records = records.filter(function (w) {
                var _a;
                if (w.projectWorkerId)
                    return validPWIds_1.has(w.projectWorkerId);
                if (w.memberId)
                    return (_a = db.members) === null || _a === void 0 ? void 0 : _a.some(function (m) { return m.id === w.memberId; });
                return false;
            });
        }
        var totalWage_1 = 0;
        var projectMap = new Map();
        var _loop_1 = function (record) {
            totalWage_1 += record.actualWage || 0;
            if (!projectMap.has(record.projectId)) {
                var project = (_a = db.projects) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.id === record.projectId; });
                projectMap.set(record.projectId, {
                    projectId: record.projectId,
                    projectName: (project === null || project === void 0 ? void 0 : project.name) || '未知项目',
                    total: 0
                });
            }
            projectMap.get(record.projectId).total += record.actualWage || 0;
        };
        for (var _i = 0, records_3 = records; _i < records_3.length; _i++) {
            var record = records_3[_i];
            _loop_1(record);
        }
        var projectBreakdown = Array.from(projectMap.values()).map(function (p) { return (__assign(__assign({}, p), { total: Math.round(p.total * 100) / 100, percentage: totalWage_1 > 0 ? Math.round((p.total / totalWage_1) * 10000) / 100 : 0 })); });
        return {
            success: true,
            data: {
                totalWage: Math.round(totalWage_1 * 100) / 100,
                count: records.length,
                projectBreakdown: projectBreakdown
            }
        };
    }
    catch (error) {
        log.error('Failed to get wage stats:', error);
        return { success: false, error: error.message };
    }
});
// ══════════════════════════════════════════════════════════════════════════════
// 10. 银行回单解析（文件操作，不双写）
// ══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:wages:parseBankReceipt', function (_, sourcePath, projectName, yearMonth) { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, parseBankReceipt(sourcePath, projectName, yearMonth)];
            case 1: return [2 /*return*/, _a.sent()];
            case 2:
                error_1 = _a.sent();
                log.error('Failed to parse bank receipt:', error_1);
                return [2 /*return*/, { success: false, error: error_1.message }];
            case 3: return [2 /*return*/];
        }
    });
}); });
