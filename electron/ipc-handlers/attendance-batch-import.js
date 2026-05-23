/**
 * 考勤批量导入 IPC 处理器（双写模式）
 * 从 attendance.ts 拆分
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
import { getDaysInMonth } from './attendance-utils';
import { useSqliteWrite, attendanceQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 批量导入考勤（Excel 导入 — 按出勤天数生成 dailyStatus）
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:attendances:batchImport', function (_, projectId, yearMonth, records) {
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
        var updated = 0;
        var _loop_1 = function (rec) {
            var pw = db.projectWorkers.find(function (p) { return p.id === rec.projectWorkerId; });
            if (!pw || pw.status === 'left')
                return "continue";
            var workDays = Math.min(Math.max(0, rec.workDays), daysInMonth);
            // Build dailyStatus
            var dailyStatus = {};
            for (var d = 1; d <= workDays; d++) {
                dailyStatus[d] = 'work';
            }
            // Check if existing record for this projectWorker + yearMonth
            var existingIdx = db.attendances.findIndex(function (a) { return a.projectWorkerId === rec.projectWorkerId && a.yearMonth === yearMonth; });
            if (existingIdx !== -1) {
                var existing = db.attendances[existingIdx];
                var merged = {};
                for (var _a = 0, _b = Object.entries(existing.dailyStatus || {}); _a < _b.length; _a++) {
                    var _c = _b[_a], day = _c[0], status_1 = _c[1];
                    if (status_1 !== 'work')
                        merged[Number(day)] = status_1;
                }
                for (var d = 1; d <= workDays; d++)
                    merged[d] = 'work';
                var updatedRecord = __assign(__assign({}, existing), { dailyStatus: merged, workDays: workDays, daysOff: 0, isFullAttendance: false, updatedAt: now });
                db.attendances[existingIdx] = updatedRecord;
                // SQLite 双写
                if (useSqliteWrite()) {
                    attendanceQueries.updateAttendance(existing.id, {
                        dailyStatus: merged,
                        workDays: workDays,
                        daysOff: 0,
                        isFullAttendance: false,
                    });
                }
                updated++;
            }
            else {
                var id = Date.now() + created;
                var newRecord = {
                    id: id,
                    memberId: undefined,
                    projectWorkerId: rec.projectWorkerId,
                    projectId: projectId,
                    yearMonth: yearMonth,
                    workDays: workDays,
                    daysOff: 0,
                    isFullAttendance: false,
                    dailyStatus: dailyStatus,
                    createdAt: now,
                    updatedAt: now,
                };
                db.attendances.push(newRecord);
                // SQLite 双写
                if (useSqliteWrite()) {
                    attendanceQueries.createAttendance(newRecord);
                }
                created++;
            }
        };
        for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var rec = records_1[_i];
            _loop_1(rec);
        }
        if (created > 0 || updated > 0)
            saveDatabase();
        return { success: true, data: { created: created, updated: updated } };
    }
    catch (error) {
        log.error('Failed to batch import attendances:', error);
        return { success: false, error: error.message };
    }
});
