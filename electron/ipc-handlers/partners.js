/**
 * 合作单位 IPC 处理器
 * 双写：SQLite（partners、regions、supervisors 三张表）
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
import { useSqliteRead, shouldFallbackToJson, partnerQueries } from '../sqlite/queries';
// ═══════════════════════════════════════════════════════════════════════════════
// 合作单位 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:partners:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = partnerQueries.listPartners();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var partnersWithProjectNames = db.partners.map(function (p) {
        var projectNames = p.projectIds && p.projectIds.length > 0
            ? db.projects
                .filter(function (proj) { return p.projectIds.includes(proj.id); })
                .map(function (proj) { return proj.name; })
                .join(', ')
            : '';
        return __assign(__assign({}, p), { projectNames: projectNames });
    });
    return { success: true, data: partnersWithProjectNames.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:partners:create', function (_, partner) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newPartner = __assign(__assign({}, partner), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.partners.push(newPartner);
        saveDatabase();
        // SQLite 双写
        partnerQueries.createPartner(newPartner);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create partner:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:partners:update', function (_, partner) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.partners.findIndex(function (p) { return p.id === partner.id; });
        if (index !== -1) {
            db.partners[index] = __assign(__assign(__assign({}, db.partners[index]), partner), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            partnerQueries.updatePartner(db.partners[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update partner:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:partners:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.partners = db.partners.filter(function (p) { return p.id !== id; });
        saveDatabase();
        // SQLite 双写
        partnerQueries.deletePartner(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete partner:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:partners:getByProject', function (_, projectId) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data_1 = partnerQueries.listPartnersByProject(projectId);
        if (data_1 !== null)
            return { success: true, data: data_1 };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    if (!db.partners)
        db.partners = [];
    var data = db.partners.filter(function (p) { return p.projectIds && p.projectIds.includes(projectId); });
    return { success: true, data: data };
});
// ═══════════════════════════════════════════════════════════════════════════════
// 地区 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:regions:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = partnerQueries.listRegions();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    return { success: true, data: db.regions.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:regions:create', function (_, region) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // 检查是否已存在相同地区
        var exists = db.regions.find(function (r) {
            return r.province === region.province && r.city === region.city && r.district === region.district;
        });
        if (exists) {
            return { success: false, error: '该地区已存在' };
        }
        var id = Date.now();
        var newRegion = __assign(__assign({}, region), { id: id, createdAt: new Date().toISOString() });
        db.regions.push(newRegion);
        saveDatabase();
        // SQLite 双写
        partnerQueries.createRegion(newRegion);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create region:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:regions:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        // 检查是否被监管单位引用
        var usedBy = db.supervisors.filter(function (s) { return s.regionId === id; });
        if (usedBy.length > 0) {
            return { success: false, error: '该地区已被监管单位引用，无法删除' };
        }
        db.regions = db.regions.filter(function (r) { return r.id !== id; });
        saveDatabase();
        // SQLite 双写
        partnerQueries.deleteRegion(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete region:', error);
        return { success: false, error: error.message };
    }
});
// ═══════════════════════════════════════════════════════════════════════════════
// 监管单位 CRUD
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('db:supervisors:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = partnerQueries.listSupervisors();
        if (data !== null)
            return { success: true, data: data };
    }
    // JSON 回退
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    var supervisors = db.supervisors.map(function (s) {
        var region = db.regions.find(function (r) { return r.id === s.regionId; });
        var projectNames = (s.projectIds || []).map(function (pid) {
            var project = db.projects.find(function (p) { return p.id === pid; });
            return (project === null || project === void 0 ? void 0 : project.name) || '';
        }).filter(Boolean).join(', ');
        return __assign(__assign({}, s), { regionName: region ? "".concat(region.province, "-").concat(region.city, "-").concat(region.district) : '', projectNames: projectNames });
    });
    return { success: true, data: supervisors.sort(function (a, b) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) };
});
ipcMain.handle('db:supervisors:create', function (_, supervisor) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var id = Date.now();
        var newSupervisor = __assign(__assign({}, supervisor), { id: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        db.supervisors.push(newSupervisor);
        saveDatabase();
        // SQLite 双写
        partnerQueries.createSupervisor(newSupervisor);
        return { success: true, data: { id: id } };
    }
    catch (error) {
        log.error('Failed to create supervisor:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:supervisors:update', function (_, supervisor) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        var index = db.supervisors.findIndex(function (s) { return s.id === supervisor.id; });
        if (index !== -1) {
            db.supervisors[index] = __assign(__assign(__assign({}, db.supervisors[index]), supervisor), { updatedAt: new Date().toISOString() });
            saveDatabase();
            // SQLite 双写
            partnerQueries.updateSupervisor(db.supervisors[index]);
        }
        return { success: true };
    }
    catch (error) {
        log.error('Failed to update supervisor:', error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('db:supervisors:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    try {
        db.supervisors = db.supervisors.filter(function (s) { return s.id !== id; });
        saveDatabase();
        // SQLite 双写
        partnerQueries.deleteSupervisor(id);
        return { success: true };
    }
    catch (error) {
        log.error('Failed to delete supervisor:', error);
        return { success: false, error: error.message };
    }
});
