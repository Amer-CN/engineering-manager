/**
 * 考勤 IPC 处理器（双写模式）
 * 支持每日考勤状态（出勤/法定节假日/病假/事假/缺勤）
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
import { getDaysInMonth, generateDailyStatus, computeFromDailyStatus, getEntryDay } from './attendance-utils';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, attendanceQueries } from '../sqlite/queries';
/** 富化考勤记录（添加 memberName/memberType/teamName/teamId） */
function enrichAttendance(a) {
    var _a, _b, _c;
    var memberName = '';
    var memberType = 'worker';
    var teamName = '';
    var teamId = null;
    if (a.memberId) {
        var member = db.members.find(function (m) { return m.id === a.memberId; });
        memberName = (member === null || member === void 0 ? void 0 : member.name) || '';
        memberType = (member === null || member === void 0 ? void 0 : member.memberType) || 'worker';
        teamId = (_a = member === null || member === void 0 ? void 0 : member.teamId) !== null && _a !== void 0 ? _a : null;
        var team = db.workerTeams.find(function (t) { return t.id === teamId; });
        teamName = (team === null || team === void 0 ? void 0 : team.name) || '';
    }
    else if (a.projectWorkerId && db.projectWorkers) {
        var pw_1 = db.projectWorkers.find(function (p) { return p.id === a.projectWorkerId; });
        if (pw_1 && db.workers) {
            var worker = db.workers.find(function (w) { return w.id === pw_1.workerId; });
            memberName = (worker === null || worker === void 0 ? void 0 : worker.name) || '';
            teamId = (_b = pw_1.teamId) !== null && _b !== void 0 ? _b : null;
            var team = (_c = db.workerTeams) === null || _c === void 0 ? void 0 : _c.find(function (t) { return t.id === teamId; });
            teamName = (team === null || team === void 0 ? void 0 : team.name) || '';
        }
    }
    return __assign(__assign({}, a), { memberName: memberName, memberType: memberType, teamName: teamName, teamId: teamId });
}
// ═══════════════════════════════════════════════════════════════════════════════
// 获取考勤列表
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:getAll', function (_, projectId, yearMonth) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = attendanceQueries.listAttendances(projectId, yearMonth);
        if (data) {
            // 富化名称信息（SQLite 读取的行不含这些字段）
            var enriched = data.map(function (a) { return enrichAttendance(a); });
            return { success: true, data: enriched.sort(function (a, b) {
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                }) };
        }
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.attendances)
        db.attendances = [];
    var records = db.attendances;
    if (projectId)
        records = records.filter(function (a) { return a.projectId === projectId; });
    if (yearMonth)
        records = records.filter(function (a) { return a.yearMonth === yearMonth; });
    var result = records.map(function (a) { return enrichAttendance(a); });
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }) };
});
// ═══════════════════════════════════════════════════════════════════════════════
// 按成员查询考勤
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:getByMember', function (_, memberId, yearMonth) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (useSqliteRead()) {
        var data = attendanceQueries.listAttendancesByMember(memberId, yearMonth);
        if (data)
            return { success: true, data: data };
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.attendances)
        db.attendances = [];
    var records = db.attendances.filter(function (a) { return a.memberId === memberId; });
    if (yearMonth)
        records = records.filter(function (a) { return a.yearMonth === yearMonth; });
    return { success: true, data: records };
});
// ═══════════════════════════════════════════════════════════════════════════════
// 创建单条考勤
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:create', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.attendances)
        db.attendances = [];
    try {
        var id = Date.now();
        var now = new Date().toISOString();
        var newRecord = __assign(__assign({}, record), { id: id, createdAt: now, updatedAt: now });
        db.attendances.push(newRecord);
        saveDatabase();
        // SQLite 双写
        if (useSqliteWrite()) {
            attendanceQueries.createAttendance(newRecord);
        }
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create attendance:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 删除考勤
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.attendances)
        db.attendances = [];
    try {
        db.attendances = db.attendances.filter(function (a) { return a.id !== id; });
        saveDatabase();
        if (useSqliteWrite())
            attendanceQueries.deleteAttendance(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete attendance:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 批量删除考勤
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:batchDelete', function (_, ids) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.attendances)
        db.attendances = [];
    try {
        var idSet_1 = new Set(ids);
        db.attendances = db.attendances.filter(function (a) { return !idSet_1.has(a.id); });
        saveDatabase();
        if (useSqliteWrite())
            attendanceQueries.batchDeleteAttendances(ids);
        return { success: true, data: { deleted: ids.length } };
    }
    catch (error) {
        log.error('Failed to batch delete attendances:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 更新考勤（支持 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:update', function (_, record) {
    var _a, _b, _c;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.attendances)
        db.attendances = [];
    try {
        var index = db.attendances.findIndex(function (a) { return a.id === record.id; });
        if (index !== -1) {
            var existing = db.attendances[index];
            var daysInMonth = getDaysInMonth(record.yearMonth || existing.yearMonth);
            var workDays = (_a = record.workDays) !== null && _a !== void 0 ? _a : existing.workDays;
            var daysOff = (_b = record.daysOff) !== null && _b !== void 0 ? _b : existing.daysOff;
            var isFullAttendance = (_c = record.isFullAttendance) !== null && _c !== void 0 ? _c : existing.isFullAttendance;
            if (record.dailyStatus) {
                var startDay = getEntryDay(existing.memberId, record.yearMonth || existing.yearMonth, db.members);
                var computed = computeFromDailyStatus(record.dailyStatus, daysInMonth, startDay);
                workDays = computed.workDays;
                daysOff = computed.daysOff;
                isFullAttendance = computed.isFullAttendance;
            }
            var updated = __assign(__assign(__assign({}, existing), record), { workDays: workDays, daysOff: daysOff, isFullAttendance: isFullAttendance, updatedAt: new Date().toISOString() });
            if (record.dailyStatus) {
                updated.dailyStatus = record.dailyStatus;
            }
            db.attendances[index] = updated;
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                var changes = __assign(__assign({}, record), { workDays: workDays, daysOff: daysOff, isFullAttendance: isFullAttendance });
                if (record.dailyStatus)
                    changes.dailyStatus = record.dailyStatus;
                attendanceQueries.updateAttendance(record.id, changes);
            }
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update attendance:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 批量创建考勤
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:batchCreate', function (_, records) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.attendances)
            db.attendances = [];
        var now = new Date().toISOString();
        var created = 0;
        var _loop_1 = function (record) {
            // 检查去重
            if (useSqliteRead()) {
                var exists = attendanceQueries.existsAttendance(record.memberId, record.projectWorkerId, record.projectId, record.yearMonth);
                if (exists === true)
                    return "continue";
            }
            else {
                var exists = db.attendances.some(function (a) { return a.memberId === record.memberId && a.projectId === record.projectId && a.yearMonth === record.yearMonth; });
                if (exists)
                    return "continue";
            }
            var id = Date.now() + created;
            var newRecord = __assign(__assign({}, record), { id: id, createdAt: now, updatedAt: now });
            db.attendances.push(newRecord);
            // SQLite 双写
            if (useSqliteWrite()) {
                attendanceQueries.createAttendance(newRecord);
            }
            created++;
        };
        for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var record = records_1[_i];
            _loop_1(record);
        }
        if (created > 0)
            saveDatabase();
        return { success: true, data: { count: created } };
    }
    catch (error) {
        log.error('Failed to batch create attendances:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 生成默认考勤（含 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:generateDefaults', function (_, projectId, yearMonth, memberIds) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.attendances)
            db.attendances = [];
        var daysInMonth = getDaysInMonth(yearMonth);
        var now = new Date().toISOString();
        var created = 0;
        var _loop_2 = function (memberId) {
            // 去重检查
            if (useSqliteRead()) {
                var exists = attendanceQueries.existsAttendance(memberId, null, projectId, yearMonth);
                if (exists === true)
                    return "continue";
            }
            else {
                var exists = db.attendances.some(function (a) { return a.memberId === memberId && a.projectId === projectId && a.yearMonth === yearMonth; });
                if (exists)
                    return "continue";
            }
            var member = db.members.find(function (m) { return m.id === memberId; });
            var isStaff = (member === null || member === void 0 ? void 0 : member.memberType) === 'staff';
            var dailyStatus = generateDailyStatus(yearMonth, isStaff);
            var startDay = getEntryDay(memberId, yearMonth, db.members);
            var computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay);
            var newRecord = {
                id: Date.now() + created,
                memberId: memberId,
                projectId: projectId,
                yearMonth: yearMonth,
                workDays: computed.workDays,
                daysOff: computed.daysOff,
                isFullAttendance: computed.isFullAttendance,
                dailyStatus: dailyStatus,
                createdAt: now,
                updatedAt: now
            };
            db.attendances.push(newRecord);
            // SQLite 双写
            if (useSqliteWrite()) {
                attendanceQueries.createAttendance(newRecord);
            }
            created++;
        };
        for (var _i = 0, memberIds_1 = memberIds; _i < memberIds_1.length; _i++) {
            var memberId = memberIds_1[_i];
            _loop_2(memberId);
        }
        if (created > 0)
            saveDatabase();
        return { success: true, data: { count: created } };
    }
    catch (error) {
        log.error('Failed to generate default attendances:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 生成默认考勤 V2（支持 projectWorkerId — worker 专用）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:generateDefaultsV2', function (_, projectId, yearMonth, projectWorkerIds) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.attendances)
            db.attendances = [];
        if (!db.projectWorkers)
            db.projectWorkers = [];
        var daysInMonth = getDaysInMonth(yearMonth);
        var now = new Date().toISOString();
        var created = 0;
        var _loop_3 = function (pwId) {
            var pw = db.projectWorkers.find(function (p) { return p.id === pwId; });
            if (!pw || pw.status === 'left')
                return "continue";
            // 去重检查
            if (useSqliteRead()) {
                var exists = attendanceQueries.existsAttendance(null, pwId, projectId, yearMonth);
                if (exists === true)
                    return "continue";
            }
            else {
                var exists = db.attendances.some(function (a) { return a.projectWorkerId === pwId && a.yearMonth === yearMonth; });
                if (exists)
                    return "continue";
            }
            var dailyStatus = generateDailyStatus(yearMonth, false);
            var startDay = pw.workerId ? getEntryDay(pw.workerId, yearMonth, db.members) : 1;
            var computed = computeFromDailyStatus(dailyStatus, daysInMonth, startDay);
            var newRecord = {
                id: Date.now() + created,
                memberId: undefined,
                projectWorkerId: pwId,
                projectId: projectId,
                yearMonth: yearMonth,
                workDays: computed.workDays,
                daysOff: computed.daysOff,
                isFullAttendance: computed.isFullAttendance,
                dailyStatus: dailyStatus,
                createdAt: now,
                updatedAt: now
            };
            db.attendances.push(newRecord);
            // SQLite 双写
            if (useSqliteWrite()) {
                attendanceQueries.createAttendance(newRecord);
            }
            created++;
        };
        for (var _i = 0, projectWorkerIds_1 = projectWorkerIds; _i < projectWorkerIds_1.length; _i++) {
            var pwId = projectWorkerIds_1[_i];
            _loop_3(pwId);
        }
        if (created > 0)
            saveDatabase();
        return { success: true, data: { count: created } };
    }
    catch (error) {
        log.error('Failed to generate default attendances V2:', error);
        return { success: false, error: error.message };
    }
});
