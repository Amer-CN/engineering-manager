/**
 * 成员 IPC 处理器
 * 双写：SQLite（members、worker_teams、worker_transfer_records、project_members 四张表）
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
import { useSqliteRead, shouldFallbackToJson, memberQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 成员 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:members:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = memberQueries.listMembers();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    return { success: true, data: db.members.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:members:create', function (_, member) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newMember = __assign(__assign({}, member), { id: id, createdAt: new Date().toISOString() });
        db.members.push(newMember);
        // Auto-create initial salary history entry
        if (member.baseSalary && Number(member.baseSalary) > 0) {
            if (!db.salaryHistory)
                db.salaryHistory = [];
            var salaryEntry = {
                id: Date.now() + 1,
                memberId: id,
                effectiveDate: member.entryDate || new Date().toISOString().split('T')[0],
                baseSalary: Number(member.baseSalary),
                subsidy: 0,
                subsidyNote: '',
                note: '入职初始薪资',
                createdAt: new Date().toISOString()
            };
            db.salaryHistory.push(salaryEntry);
            // SQLite 双写：薪资历史
            memberQueries.createSalaryHistory(salaryEntry);
        }
        saveDatabase();
        // SQLite 双写：成员
        memberQueries.createMember(newMember);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create member:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:members:update', function (_, member) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.members.findIndex(function (m) { return m.id === member.id; });
        if (index !== -1) {
            db.members[index] = __assign(__assign({}, db.members[index]), member);
            saveDatabase();
            // SQLite 双写
            memberQueries.updateMember(db.members[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update member:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:members:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.members = db.members.filter(function (m) { return m.id !== id; });
        saveDatabase();
        // SQLite 双写
        memberQueries.deleteMember(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete member:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 农民工班组 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:workerTeams:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = memberQueries.listTeams();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var teams = db.workerTeams.map(function (t) {
        var project = db.projects.find(function (p) { return p.id === t.projectId; });
        var leader = db.members.find(function (m) { return m.id === t.leaderId; });
        return __assign(__assign({}, t), { projectName: (project === null || project === void 0 ? void 0 : project.name) || '', leaderName: (leader === null || leader === void 0 ? void 0 : leader.name) || '' });
    });
    return { success: true, data: teams.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:workerTeams:create', function (_, team) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // 检查同名班组是否存在
        var exists = db.workerTeams.find(function (t) {
            return t.name === team.name && t.projectId === team.projectId;
        });
        if (exists) {
            return { success: false, error: '该项目下已存在同名班组' };
        }
        var id = Date.now();
        var newTeam = __assign(__assign({}, team), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.workerTeams.push(newTeam);
        saveDatabase();
        // SQLite 双写
        memberQueries.createTeam(newTeam);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create team:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:workerTeams:update', function (_, team) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.workerTeams.findIndex(function (t) { return t.id === team.id; });
        if (index !== -1) {
            db.workerTeams[index] = __assign(__assign(__assign({}, db.workerTeams[index]), team), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            memberQueries.updateTeam(db.workerTeams[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update team:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:workerTeams:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // 检查是否有工人属于该班组
        var workersInTeam = 0;
        if (db.projectWorkers) {
            workersInTeam = db.projectWorkers.filter(function (pw) { return pw.teamId === id && pw.status === 'active'; }).length;
        }
        // Fallback to old check for non-migrated data
        if (workersInTeam === 0) {
            workersInTeam = db.members.filter(function (m) { return m.memberType === 'worker' && m.teamId === id; }).length;
        }
        if (workersInTeam.length > 0) {
            return { success: false, error: "\u8BE5\u73ED\u7EC4\u4E0B\u6709 ".concat(workersInTeam.length, " \u540D\u5DE5\u4EBA\uFF0C\u65E0\u6CD5\u5220\u9664") };
        }
        db.workerTeams = db.workerTeams.filter(function (t) { return t.id !== id; });
        saveDatabase();
        // SQLite 双写
        memberQueries.deleteTeam(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete team:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 工人调动记录
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:workerTransferRecords:getAll', function (_, workerId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = memberQueries.listTransferRecords(workerId);
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var records = db.workerTransferRecords;
    if (workerId) {
        records = records.filter(function (r) { return r.workerId === workerId; });
    }
    return { success: true, data: records.sort(function (a, b) {
            return new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime();
        }) };
});
ipcMain.handle('db:workerTransferRecords:create', function (_, record) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newRecord = __assign(__assign({}, record), { id: id, createdAt: new Date().toISOString() });
        db.workerTransferRecords.push(newRecord);
        saveDatabase();
        // SQLite 双写
        memberQueries.createTransferRecord(newRecord);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create transfer record:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 项目成员关联
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:projectMembers:getAll', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = memberQueries.listProjectMembers(projectId);
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.projectMembers)
        db.projectMembers = [];
    var records = db.projectMembers
        .filter(function (pm) { return pm.projectId === projectId; })
        .map(function (pm) {
        var member = db.members.find(function (m) { return m.id === pm.memberId; });
        return __assign(__assign({}, pm), { member: member || null });
    })
        .sort(function (a, b) {
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });
    return { success: true, data: records };
});
ipcMain.handle('db:projectMembers:add', function (_, projectId, memberId, joinedAt) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.projectMembers)
            db.projectMembers = [];
        var exists = db.projectMembers.find(function (pm) {
            return pm.projectId === projectId && pm.memberId === memberId && !pm.leftAt;
        });
        if (exists) {
            return { success: false, error: '该成员已在项目中' };
        }
        var id = Date.now();
        var entry = {
            id: id,
            projectId: projectId,
            memberId: memberId,
            joinedAt: joinedAt || new Date().toISOString().split('T')[0],
        };
        db.projectMembers.push(entry);
        saveDatabase();
        // SQLite 双写
        memberQueries.addProjectMember(entry);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to add project member:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projectMembers:update', function (_, id, updates) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.projectMembers)
            db.projectMembers = [];
        var index = db.projectMembers.findIndex(function (pm) { return pm.id === id; });
        if (index === -1)
            return { success: false, error: '记录不存在' };
        var record = db.projectMembers[index];
        if (updates.leftAt !== undefined)
            record.leftAt = updates.leftAt || undefined;
        if (updates.joinedAt !== undefined)
            record.joinedAt = updates.joinedAt;
        record.updatedAt = new Date().toISOString();
        db.projectMembers[index] = record;
        saveDatabase();
        // SQLite 双写
        memberQueries.updateProjectMember(id, record);
        return { success: true, data: record };
    }
    catch (error) {
        log.error('Failed to update project member:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projectMembers:remove', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        if (!db.projectMembers)
            db.projectMembers = [];
        db.projectMembers = db.projectMembers.filter(function (pm) { return pm.id !== id; });
        saveDatabase();
        // SQLite 双写
        memberQueries.removeProjectMember(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to remove project member:', error);
        return { success: false, error: error.message };
    }
});
