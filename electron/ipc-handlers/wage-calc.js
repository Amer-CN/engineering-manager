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
import { db, dbReady, saveDatabase } from '../database';
export { parseBankReceipt } from './wage-bank-receipt';
export function getDaysInMonth(yearMonth) {
    var _a = yearMonth.split('-').map(Number), year = _a[0], month = _a[1];
    return new Date(year, month, 0).getDate();
}
export function calculateActualWage(dailyWage, workDays, bonus, deduction) {
    return Math.round((dailyWage * workDays + bonus - deduction) * 100) / 100;
}
export function generateProjectWages(projectId, yearMonth) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!db.wages)
        db.wages = [];
    if (!db.attendances)
        db.attendances = [];
    if (!db.workers)
        db.workers = [];
    if (!db.projectWorkers)
        db.projectWorkers = [];
    var activePWs = db.projectWorkers.filter(function (pw) { return pw.projectId === projectId && pw.status === 'active'; });
    // 保留已归档的记录
    var archivedWages = db.wages.filter(function (w) { return w.projectId === projectId && w.yearMonth === yearMonth && w.paymentLocked; });
    var archivedPWIds = new Set(archivedWages.map(function (w) { return w.projectWorkerId; }));
    // 只删除未归档的记录
    db.wages = db.wages.filter(function (w) { return !(w.projectId === projectId && w.yearMonth === yearMonth && !w.paymentLocked); });
    var now = new Date().toISOString();
    var daysInMonth = getDaysInMonth(yearMonth);
    var newCount = 0;
    var archivedSkipped = 0;
    var generated = [];
    // 预加载 wageHistory 查找表
    var effectiveWageMap = new Map();
    if (db.wageHistory) {
        var _loop_1 = function (pwId) {
            var records = db.wageHistory
                .filter(function (h) { return h.projectWorkerId === pwId && h.yearMonth <= yearMonth; })
                .sort(function (a, b) { return b.yearMonth.localeCompare(a.yearMonth); });
            var effective = records[0];
            effectiveWageMap.set(pwId, effective ? effective.dailyWage : 0);
        };
        for (var _i = 0, _b = activePWs.map(function (p) { return p.id; }); _i < _b.length; _i++) {
            var pwId = _b[_i];
            _loop_1(pwId);
        }
    }
    var _loop_2 = function (pw) {
        if (archivedPWIds.has(pw.id)) {
            generated.push(archivedWages.find(function (w) { return w.projectWorkerId === pw.id; }));
            archivedSkipped++;
            return "continue";
        }
        var worker = db.workers.find(function (w) { return w.id === pw.workerId; });
        if (!worker)
            return "continue";
        var attendance = db.attendances.find(function (a) { return a.projectWorkerId === pw.id && a.yearMonth === yearMonth; });
        if (!attendance)
            return "continue";
        var dailyWage = effectiveWageMap.get(pw.id) || worker.dailyWage || pw.dailyWage || 0;
        var workDays = (_a = attendance.workDays) !== null && _a !== void 0 ? _a : daysInMonth;
        var actualWage = calculateActualWage(dailyWage, workDays, 0, 0);
        var wageRecord = {
            id: Date.now() + generated.length,
            projectId: projectId,
            memberId: undefined, projectWorkerId: pw.id,
            yearMonth: yearMonth,
            dailyWage: dailyWage,
            workDays: workDays,
            bonus: 0, deduction: 0,
            actualWage: actualWage,
            createdAt: now, updatedAt: now
        };
        db.wages.push(wageRecord);
        generated.push(wageRecord);
        newCount++;
    };
    for (var _c = 0, activePWs_1 = activePWs; _c < activePWs_1.length; _c++) {
        var pw = activePWs_1[_c];
        _loop_2(pw);
    }
    // 兜底去重
    var seen = new Set();
    db.wages = db.wages.filter(function (w) {
        var key = "".concat(w.projectWorkerId, "-").concat(w.yearMonth);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    saveDatabase();
    return {
        success: true,
        data: generated.map(function (w) {
            var _a, _b;
            var memberName = '';
            var teamName = '';
            if (w.projectWorkerId && db.projectWorkers) {
                var pw_1 = db.projectWorkers.find(function (p) { return p.id === w.projectWorkerId; });
                if (pw_1 && db.workers) {
                    var worker = db.workers.find(function (wk) { return wk.id === pw_1.workerId; });
                    memberName = (worker === null || worker === void 0 ? void 0 : worker.name) || '';
                    var team = (_a = db.workerTeams) === null || _a === void 0 ? void 0 : _a.find(function (t) { return t.id === pw_1.teamId; });
                    teamName = (team === null || team === void 0 ? void 0 : team.name) || '';
                }
            }
            var project = (_b = db.projects) === null || _b === void 0 ? void 0 : _b.find(function (p) { return p.id === w.projectId; });
            return __assign(__assign({}, w), { memberName: memberName, memberType: 'worker', projectName: (project === null || project === void 0 ? void 0 : project.name) || '', teamName: teamName });
        }),
        newCount: newCount,
        archivedSkipped: archivedSkipped,
    };
}
