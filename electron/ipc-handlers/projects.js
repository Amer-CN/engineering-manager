/**
 * 项目 IPC 处理器
 * 双写：SQLite（projects 表 + 级联删除 9 张关联表）
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
import { useSqliteRead, shouldFallbackToJson, projectQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 项目 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:projects:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = projectQueries.listProjects();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var result = db.projects.map(function (p) {
        var manager = p.projectManagerId ? db.members.find(function (m) { return m.id === p.projectManagerId; }) : null;
        return __assign(__assign({}, p), { projectManagerName: (manager === null || manager === void 0 ? void 0 : manager.name) || '' });
    });
    return { success: true, data: result.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:projects:create', function (_, project) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newProject = __assign(__assign({}, project), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.projects.push(newProject);
        saveDatabase();
        // SQLite 双写
        projectQueries.createProject(newProject);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create project:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projects:update', function (_, project) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.projects.findIndex(function (p) { return p.id === project.id; });
        if (index !== -1) {
            db.projects[index] = __assign(__assign(__assign({}, db.projects[index]), project), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            projectQueries.updateProject(db.projects[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update project:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:projects:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.projects = db.projects.filter(function (p) { return p.id !== id; });
        // 级联删除关联数据
        if (db.costLedger)
            db.costLedger = db.costLedger.filter(function (e) { return e.projectId !== id; });
        if (db.settlements)
            db.settlements = db.settlements.filter(function (s) { return s.projectId !== id; });
        if (db.invoices)
            db.invoices = db.invoices.filter(function (inv) { return inv.projectId !== id; });
        if (db.incomeContracts)
            db.incomeContracts = db.incomeContracts.filter(function (c) { return c.projectId !== id; });
        if (db.expenseContracts)
            db.expenseContracts = db.expenseContracts.filter(function (c) { return c.projectId !== id; });
        if (db.agreementContracts)
            db.agreementContracts = db.agreementContracts.filter(function (c) { return c.projectId !== id; });
        if (db.wages)
            db.wages = db.wages.filter(function (w) { return w.projectId !== id; });
        if (db.attendances)
            db.attendances = db.attendances.filter(function (a) { return a.projectId !== id; });
        if (db.projectMembers)
            db.projectMembers = db.projectMembers.filter(function (m) { return m.projectId !== id; });
        saveDatabase();
        // SQLite 双写（含级联删除）
        projectQueries.deleteProject(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete project:', error);
        return { success: false, error: error.message };
    }
});
