/**
 * 全局工人信息库 + 项目用工关系 IPC 处理器（双写模式）
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
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, workerQueries, salaryWageHistoryQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 全局工人 CRUD (db.workers)
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:workers:getAll', function (_, search, workerType) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = workerQueries.listWorkers(search, workerType);
        if (data)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.workers)
        db.workers = [];
    var workers = db.workers;
    if (search) {
        var kw_1 = search.toLowerCase();
        workers = workers.filter(function (w) {
            return w.name.toLowerCase().includes(kw_1) ||
                w.idCard.toLowerCase().includes(kw_1) ||
                (w.phone && w.phone.includes(search));
        });
    }
    if (workerType) {
        var matchingIds_1 = new Set((db.projectWorkers || []).filter(function (pw) { return pw.workerType === workerType; }).map(function (pw) { return pw.workerId; }));
        workers = workers.filter(function (w) { return matchingIds_1.has(w.id); });
    }
    var enriched = workers.map(function (w) {
        var pws = (db.projectWorkers || []).filter(function (pw) { return pw.workerId === w.id; });
        var activeProjects = pws.filter(function (pw) { return pw.status === 'active'; });
        return __assign(__assign({}, w), { projectCount: pws.length, activeProjectCount: activeProjects.length });
    });
    return { success: true, data: enriched.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:workers:create', function (_, worker) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.workers)
        db.workers = [];
    try {
        if (worker.idCard) {
            // SQLite 重名检查
            if (useSqliteRead()) {
                var exists = workerQueries.existsByIdCard(worker.idCard);
                if (exists === true)
                    return { success: false, error: '身份证号重复' };
            }
            else {
                var exists = db.workers.find(function (w) { return w.idCard.trim() === worker.idCard.trim(); });
                if (exists)
                    return { success: false, error: '身份证号重复' };
            }
        }
        var id = Date.now();
        var newWorker = __assign(__assign({}, worker), { id: id, createdAt: new Date().toISOString() });
        db.workers.push(newWorker);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            workerQueries.createWorker(newWorker);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create worker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:workers:update', function (_, worker) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.workers)
        db.workers = [];
    try {
        var index = db.workers.findIndex(function (w) { return w.id === worker.id; });
        if (index !== -1) {
            db.workers[index] = __assign(__assign({}, db.workers[index]), worker);
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                workerQueries.updateWorker(worker.id, worker);
            }
            return { success: true, data: db.workers[index] };
        }
        return { success: false, error: '工人不存在' };
    }
    catch (error) {
        log.error('Failed to update worker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:workers:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.projectWorkers)
            db.projectWorkers = [];
        // 检查活跃用工
        var activePWs = [];
        if (useSqliteRead()) {
            var count = workerQueries.countActiveProjectWorkers(id);
            if (count !== null && count > 0) {
                return { success: false, error: "\u8BE5\u5DE5\u4EBA\u5728 ".concat(count, " \u4E2A\u9879\u76EE\u4E2D\u4ECD\u6709\u6D3B\u8DC3\u7528\u5DE5\u8BB0\u5F55\uFF0C\u8BF7\u5148\u79BB\u573A") };
            }
        }
        else {
            activePWs = db.projectWorkers.filter(function (pw) { return pw.workerId === id && pw.status === 'active'; });
            if (activePWs.length > 0) {
                return { success: false, error: "\u8BE5\u5DE5\u4EBA\u5728 ".concat(activePWs.length, " \u4E2A\u9879\u76EE\u4E2D\u4ECD\u6709\u6D3B\u8DC3\u7528\u5DE5\u8BB0\u5F55\uFF0C\u8BF7\u5148\u79BB\u573A") };
            }
        }
        // JSON 删除（级联删除 projectWorkers）
        db.projectWorkers = db.projectWorkers.filter(function (pw) { return pw.workerId !== id; });
        if (db.workers)
            db.workers = db.workers.filter(function (w) { return w.id !== id; });
        saveDatabase();
        // SQLite 双写（级联删除）
        if (useSqliteWrite()) {
            workerQueries.deleteWorker(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete worker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:workers:getStats', function (_, workerId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        try {
            var stats = workerQueries.getWorkerStats(workerId);
            if (stats)
                return { success: true, data: stats };
        }
        catch (err) {
            log.warn('[workers:getStats] SQLite read failed, falling back to JSON:', err);
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    try {
        if (!db.projectWorkers)
            db.projectWorkers = [];
        if (!db.wages)
            db.wages = [];
        var pws = db.projectWorkers.filter(function (pw) { return pw.workerId === workerId; });
        var totalEarnings = 0;
        var _loop_1 = function (pw) {
            var wages = db.wages.filter(function (w) { return w.projectWorkerId === pw.id || (w.memberId && !w.projectWorkerId); });
            totalEarnings += wages.reduce(function (sum, w) { return sum + (w.actualWage || 0); }, 0);
        };
        for (var _i = 0, pws_1 = pws; _i < pws_1.length; _i++) {
            var pw = pws_1[_i];
            _loop_1(pw);
        }
        var projectBreakdown = pws.map(function (pw) {
            var _a;
            var project = (_a = db.projects) === null || _a === void 0 ? void 0 : _a.find(function (p) { return p.id === pw.projectId; });
            var wages = db.wages.filter(function (w) { return w.projectWorkerId === pw.id; });
            var total = wages.reduce(function (sum, w) { return sum + (w.actualWage || 0); }, 0);
            return { projectId: pw.projectId, projectName: (project === null || project === void 0 ? void 0 : project.name) || '未知项目', total: total };
        });
        return { success: true, data: { projectCount: pws.length, totalEarnings: totalEarnings, projectBreakdown: projectBreakdown } };
    }
    catch (error) {
        log.error('Failed to get worker stats:', error);
        return { success: false, error: error.message };
    }
});
// 按班组汇总工资
ipcMain.handle('db:workers:getTeamWages', function (_, projectId, teamId) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        try {
            var data = workerQueries.getTeamWages(projectId, teamId);
            if (data)
                return { success: true, data: data };
        }
        catch (err) {
            log.warn('[workers:getTeamWages] SQLite read failed, falling back to JSON:', err);
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    try {
        if (!db.projectWorkers)
            db.projectWorkers = [];
        if (!db.wages)
            db.wages = [];
        if (!db.workers)
            db.workers = [];
        var pws = db.projectWorkers.filter(function (pw) { return pw.projectId === projectId && pw.teamId === teamId; });
        var team = (_a = db.workerTeams) === null || _a === void 0 ? void 0 : _a.find(function (t) { return t.id === teamId; });
        var details = [];
        var teamTotal = 0;
        var _loop_2 = function (pw) {
            var worker = db.workers.find(function (w) { return w.id === pw.workerId; });
            var rawWages = db.wages.filter(function (w) { return w.projectWorkerId === pw.id; });
            var wageMap = new Map();
            for (var _b = 0, rawWages_1 = rawWages; _b < rawWages_1.length; _b++) {
                var w = rawWages_1[_b];
                var key = "".concat(w.projectWorkerId, "-").concat(w.yearMonth);
                if (!wageMap.has(key) || new Date(w.updatedAt).getTime() > new Date(wageMap.get(key).updatedAt).getTime()) {
                    wageMap.set(key, w);
                }
            }
            var wages = Array.from(wageMap.values());
            var totalWage = wages.reduce(function (sum, w) { return sum + (w.actualWage || 0); }, 0);
            var totalWorkDays = wages.reduce(function (sum, w) { return sum + (w.workDays || 0); }, 0);
            teamTotal += totalWage;
            details.push({
                workerName: (worker === null || worker === void 0 ? void 0 : worker.name) || '未知',
                months: wages.length,
                workDays: totalWorkDays,
                dailyWage: pw.dailyWage || (worker === null || worker === void 0 ? void 0 : worker.dailyWage) || 0,
                totalWage: Math.round(totalWage * 100) / 100,
            });
        };
        for (var _i = 0, pws_2 = pws; _i < pws_2.length; _i++) {
            var pw = pws_2[_i];
            _loop_2(pw);
        }
        return {
            success: true,
            data: { teamId: teamId, teamName: (team === null || team === void 0 ? void 0 : team.name) || '未知班组', workerCount: pws.length, teamTotal: Math.round(teamTotal * 100) / 100, details: details }
        };
    }
    catch (error) {
        log.error('Failed to get team wages:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系 CRUD (db.projectWorkers)
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:projectWorkers:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先（但 attendance firstDay 推断在 JSON 侧更方便）
    if (useSqliteRead()) {
        var data = workerQueries.listProjectWorkers(projectId);
        if (data) {
            // 补充 attendance firstDay 推断（需要读取 dailyStatus）
            var attendanceFirstDay_1 = new Map();
            if (db.attendances) {
                var _loop_3 = function (att) {
                    if (!att.projectWorkerId)
                        return "continue";
                    var pwid = att.projectWorkerId;
                    if (attendanceFirstDay_1.has(pwid))
                        return "continue";
                    var ds = att.dailyStatus || {};
                    var days = Object.keys(ds).map(Number).filter(function (d) { return d > 0 && ds[d]; });
                    if (days.length === 0)
                        return "continue";
                    var firstDay = Math.min.apply(Math, days);
                    var firstDate = "".concat(att.yearMonth, "-").concat(String(firstDay).padStart(2, '0'));
                    attendanceFirstDay_1.set(pwid, firstDate);
                };
                for (var _i = 0, _a = db.attendances; _i < _a.length; _i++) {
                    var att = _a[_i];
                    _loop_3(att);
                }
            }
            for (var _b = 0, data_1 = data; _b < data_1.length; _b++) {
                var pw = data_1[_b];
                var actualEntryDate = attendanceFirstDay_1.get(pw.id) || pw.entryDate || '';
                pw.entryDate = actualEntryDate;
            }
            return { success: true, data: data };
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.projectWorkers)
        db.projectWorkers = [];
    var pws = db.projectWorkers.filter(function (pw) { return pw.projectId === projectId; });
    var attendanceFirstDay = new Map();
    if (db.attendances) {
        var _loop_4 = function (att) {
            if (!att.projectWorkerId)
                return "continue";
            var pwid = att.projectWorkerId;
            if (attendanceFirstDay.has(pwid))
                return "continue";
            var ds = att.dailyStatus || {};
            var days = Object.keys(ds).map(Number).filter(function (d) { return d > 0 && ds[d]; });
            if (days.length === 0)
                return "continue";
            var firstDay = Math.min.apply(Math, days);
            var firstDate = "".concat(att.yearMonth, "-").concat(String(firstDay).padStart(2, '0'));
            attendanceFirstDay.set(pwid, firstDate);
        };
        for (var _c = 0, _d = db.attendances; _c < _d.length; _c++) {
            var att = _d[_c];
            _loop_4(att);
        }
    }
    var enriched = pws.map(function (pw) {
        var _a, _b, _c;
        var worker = (_a = db.workers) === null || _a === void 0 ? void 0 : _a.find(function (w) { return w.id === pw.workerId; });
        var team = (_b = db.workerTeams) === null || _b === void 0 ? void 0 : _b.find(function (t) { return t.id === pw.teamId; });
        var project = (_c = db.projects) === null || _c === void 0 ? void 0 : _c.find(function (p) { return p.id === pw.projectId; });
        var actualEntryDate = attendanceFirstDay.get(pw.id) || pw.entryDate || '';
        return __assign(__assign({}, pw), { worker: worker || null, workerName: (worker === null || worker === void 0 ? void 0 : worker.name) || '', workerIdCard: (worker === null || worker === void 0 ? void 0 : worker.idCard) || '', teamName: (team === null || team === void 0 ? void 0 : team.name) || '', projectName: (project === null || project === void 0 ? void 0 : project.name) || '', entryDate: actualEntryDate });
    });
    return { success: true, data: enriched.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:projectWorkers:create', function (_, pw) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.projectWorkers)
        db.projectWorkers = [];
    try {
        if (pw.workerId && pw.projectId) {
            // 检查重复
            if (useSqliteRead()) {
                var exists = workerQueries.existsProjectWorker(pw.workerId, pw.projectId);
                if (exists === true)
                    return { success: false, error: '该工人已在此项目中' };
            }
            else {
                var exists = db.projectWorkers.find(function (p) {
                    return p.workerId === pw.workerId && p.projectId === pw.projectId;
                });
                if (exists)
                    return { success: false, error: '该工人已在此项目中' };
            }
        }
        var id = Date.now();
        var now = new Date().toISOString();
        var newPW = __assign(__assign({}, pw), { id: id, createdAt: now });
        db.projectWorkers.push(newPW);
        // 自动创建初始日工资历史
        var wageHistoryEntry = null;
        if (pw.dailyWage && Number(pw.dailyWage) > 0 && pw.entryDate) {
            var entryMonth = pw.entryDate.length >= 7 ? pw.entryDate.slice(0, 7) : now.slice(0, 7);
            if (!db.wageHistory)
                db.wageHistory = [];
            wageHistoryEntry = {
                id: Date.now() + 1,
                projectWorkerId: id,
                yearMonth: entryMonth,
                dailyWage: Number(pw.dailyWage),
                note: '初始工资',
                createdAt: now,
                updatedAt: now,
            };
            db.wageHistory.push(wageHistoryEntry);
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            workerQueries.createProjectWorker(newPW);
            if (wageHistoryEntry) {
                salaryWageHistoryQueries.saveWageHistory({
                    projectWorkerId: id,
                    yearMonth: wageHistoryEntry.yearMonth,
                    dailyWage: wageHistoryEntry.dailyWage,
                    note: '初始工资'
                });
            }
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create projectWorker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projectWorkers:update', function (_, pw) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.projectWorkers)
        db.projectWorkers = [];
    try {
        var index = db.projectWorkers.findIndex(function (p) { return p.id === pw.id; });
        if (index !== -1) {
            db.projectWorkers[index] = __assign(__assign({}, db.projectWorkers[index]), pw);
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                workerQueries.updateProjectWorker(pw.id, pw);
            }
            return { success: true, data: db.projectWorkers[index] };
        }
        return { success: false, error: '用工记录不存在' };
    }
    catch (error) {
        log.error('Failed to update projectWorker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projectWorkers:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.projectWorkers)
        db.projectWorkers = [];
    try {
        db.projectWorkers = db.projectWorkers.filter(function (pw) { return pw.id !== id; });
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            workerQueries.deleteProjectWorker(id);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete projectWorker:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projectWorkers:batchCreate', function (_, entries) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.projectWorkers)
        db.projectWorkers = [];
    try {
        var ids = [];
        var now_1 = new Date().toISOString();
        var _loop_5 = function (entry) {
            if (entry.workerId && entry.projectId) {
                if (useSqliteRead()) {
                    var exists = workerQueries.existsProjectWorker(entry.workerId, entry.projectId);
                    if (exists === true) {
                        return { value: { success: false, error: "\u5DE5\u4EBA\u5DF2\u5728\u9879\u76EE\u4E2D (workerId=".concat(entry.workerId, ")") } };
                    }
                }
                else {
                    var exists = db.projectWorkers.find(function (p) {
                        return p.workerId === entry.workerId && p.projectId === entry.projectId;
                    });
                    if (exists) {
                        return { value: { success: false, error: "\u5DE5\u4EBA\u5DF2\u5728\u9879\u76EE\u4E2D (workerId=".concat(entry.workerId, ")") } };
                    }
                }
            }
        };
        // All-or-nothing validation pass
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var state_1 = _loop_5(entry);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        var wageHistoryEntries = [];
        for (var _a = 0, entries_2 = entries; _a < entries_2.length; _a++) {
            var entry = entries_2[_a];
            var id = Date.now() + ids.length;
            db.projectWorkers.push(__assign(__assign({}, entry), { id: id, createdAt: now_1 }));
            ids.push(id);
            // 自动创建初始日工资历史
            if (entry.dailyWage && Number(entry.dailyWage) > 0) {
                var entryMonth = entry.entryDate && entry.entryDate.length >= 7
                    ? entry.entryDate.slice(0, 7) : now_1.slice(0, 7);
                if (!db.wageHistory)
                    db.wageHistory = [];
                var whEntry = {
                    id: Date.now() + ids.length + 1000,
                    projectWorkerId: id,
                    yearMonth: entryMonth,
                    dailyWage: Number(entry.dailyWage),
                    note: '初始工资',
                    createdAt: now_1,
                    updatedAt: now_1,
                };
                db.wageHistory.push(whEntry);
                wageHistoryEntries.push({ projectWorkerId: id, yearMonth: entryMonth, dailyWage: Number(entry.dailyWage), note: '初始工资' });
            }
        }
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            var sqliteEntries = entries.map(function (entry, i) { return (__assign(__assign({}, entry), { id: Date.now() + i, createdAt: now_1 })); });
            workerQueries.batchCreateProjectWorkers(sqliteEntries);
            for (var _b = 0, wageHistoryEntries_1 = wageHistoryEntries; _b < wageHistoryEntries_1.length; _b++) {
                var wh = wageHistoryEntries_1[_b];
                salaryWageHistoryQueries.saveWageHistory(wh);
            }
        }
        return { success: true, data: { ids: ids } };
    }
    catch (error) {
        log.error('Failed to batch create projectWorkers:', error);
        return { success: false, error: error.message };
    }
});
// 批量清理/修正工人数据：清空开户行 + 从身份证推断性别
ipcMain.handle('db:workers:fixData', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.workers)
        db.workers = [];
    var clearedBank = 0, filledGender = 0;
    var updates = [];
    for (var _i = 0, _a = db.workers; _i < _a.length; _i++) {
        var w = _a[_i];
        var changed = false;
        var changes = {};
        if (w.bankName) {
            w.bankName = undefined;
            clearedBank++;
            changes.bankName = null;
            changed = true;
        }
        if (w.idCard && w.idCard.length >= 15) {
            var idx = w.idCard.length === 15 ? 14 : 16;
            var digit = parseInt(w.idCard[idx]);
            if (!isNaN(digit) && (!w.gender || w.gender === '')) {
                w.gender = digit % 2 === 1 ? 'male' : 'female';
                filledGender++;
                changes.gender = w.gender;
                changed = true;
            }
        }
        if (changed)
            updates.push({ id: w.id, changes: changes });
    }
    saveDatabase();
    // SQLite 双写
    if (useSqliteWrite()) {
        for (var _b = 0, updates_1 = updates; _b < updates_1.length; _b++) {
            var _c = updates_1[_b], id = _c.id, changes = _c.changes;
            workerQueries.updateWorker(id, changes);
        }
    }
    log.info("[Worker Fix] Cleared ".concat(clearedBank, " bank names, filled ").concat(filledGender, " genders"));
    return { success: true, data: { clearedBank: clearedBank, filledGender: filledGender } };
});
