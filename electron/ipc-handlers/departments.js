/**
 * 部门管理 IPC 处理器（双写模式）
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ipcMain } from 'electron';
import { db, dbReady, saveDatabase } from '../database';
import { useSqliteRead, shouldFallbackToJson, useSqliteWrite, departmentQueries } from '../sqlite/queries';
ipcMain.handle('db:departments:getAll', function () {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // SQLite 优先
    if (useSqliteRead()) {
        var data = departmentQueries.listDepartments();
        if (data)
            return { success: true, data: data };
        // SQLite 读取失败，fallthrough 到 JSON
    }
    if (!shouldFallbackToJson())
        return { success: false, error: 'SQLite read failed (sqlite-primary mode)' };
    // JSON 回退
    var depts = __spreadArray([], db.departments, true).sort(function (a, b) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    var enriched = depts.map(function (d) { return (__assign(__assign({}, d), { memberCount: db.members.filter(function (m) { return m.departmentId === d.id && m.memberType === 'staff'; }).length })); });
    return { success: true, data: enriched };
});
ipcMain.handle('db:departments:create', function (_, data) {
    var _a;
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    if (!((_a = data.name) === null || _a === void 0 ? void 0 : _a.trim()))
        return { success: false, error: '部门名称不能为空' };
    // SQLite 重名检查
    if (useSqliteRead()) {
        var exists = departmentQueries.existsByName(data.name.trim());
        if (exists === true)
            return { success: false, error: '部门名称已存在' };
    }
    else {
        var exists = db.departments.some(function (d) { return d.name === data.name.trim(); });
        if (exists)
            return { success: false, error: '部门名称已存在' };
    }
    var id = Date.now();
    var dept = {
        id: id,
        name: data.name.trim(),
        managerId: data.managerId || null,
        positions: data.positions || [],
        createdAt: new Date().toISOString()
    };
    // JSON 写入
    db.departments.push(dept);
    saveDatabase();
    // SQLite 双写
    if (useSqliteWrite()) {
        departmentQueries.createDepartment(dept);
    }
    return { success: true, data: { id: id } };
});
ipcMain.handle('db:departments:update', function (_, data) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    var index = db.departments.findIndex(function (d) { return d.id === data.id; });
    if (index === -1)
        return { success: false, error: '部门不存在' };
    if (data.name !== undefined) {
        // SQLite 重名检查
        if (useSqliteRead()) {
            var dup = departmentQueries.existsByName(data.name.trim(), data.id);
            if (dup === true)
                return { success: false, error: '部门名称已存在' };
        }
        else {
            var dup = db.departments.find(function (d) { return d.name === data.name.trim() && d.id !== data.id; });
            if (dup)
                return { success: false, error: '部门名称已存在' };
        }
        db.departments[index].name = data.name.trim();
    }
    if (data.managerId !== undefined) {
        db.departments[index].managerId = data.managerId;
    }
    if (data.positions !== undefined) {
        db.departments[index].positions = data.positions;
    }
    saveDatabase();
    // SQLite 双写
    if (useSqliteWrite()) {
        var changes = {};
        if (data.name !== undefined)
            changes.name = data.name.trim();
        if (data.managerId !== undefined)
            changes.managerId = data.managerId;
        if (data.positions !== undefined)
            changes.positions = data.positions;
        departmentQueries.updateDepartment(data.id, changes);
    }
    return { success: true };
});
ipcMain.handle('db:departments:delete', function (_, id) {
    if (!dbReady)
        return { success: false, error: 'Database not ready' };
    // 检查是否有成员
    var hasMembers = false;
    if (useSqliteRead()) {
        var count = departmentQueries.countStaffMembers(id);
        hasMembers = count !== null ? count > 0 : db.members.some(function (m) { return m.departmentId === id && m.memberType === 'staff'; });
    }
    else {
        hasMembers = db.members.some(function (m) { return m.departmentId === id && m.memberType === 'staff'; });
    }
    if (hasMembers)
        return { success: false, error: '该部门下还有人员，请先移除或转移人员' };
    // JSON 删除
    db.departments = db.departments.filter(function (d) { return d.id !== id; });
    saveDatabase();
    // SQLite 双写
    if (useSqliteWrite()) {
        departmentQueries.deleteDepartment(id);
    }
    return { success: true };
});
