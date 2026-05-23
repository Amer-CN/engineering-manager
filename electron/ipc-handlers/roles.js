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
import log from 'electron-log';
import { db, saveDatabase } from '../database';
import { useSqliteRead, useSqliteWrite, shouldFallbackToJson, roleQueries } from '../sqlite/queries';
var SYSTEM_ROLE_NAMES = {
    admin: '管理员', manager: '项目经理', accountant: '财务人员', worker: '普通员工',
};
var SYSTEM_ROLE_DEFAULTS = {
    admin: [
        'dashboard:read', 'dashboard:export',
        'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
        'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:approve', 'contracts:export', 'contracts:import',
        'partners:create', 'partners:read', 'partners:update', 'partners:delete', 'partners:export', 'partners:import',
        'members:create', 'members:read', 'members:update', 'members:delete', 'members:export', 'members:import',
        'wages:create', 'wages:read', 'wages:update', 'wages:delete', 'wages:approve', 'wages:export',
        'settlement:create', 'settlement:read', 'settlement:update', 'settlement:delete', 'settlement:approve', 'settlement:export',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:export', 'inventory:import',
        'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
        'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
        'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
        'drawings:create', 'drawings:read', 'drawings:update', 'drawings:delete', 'drawings:export', 'drawings:import',
        'settings:read', 'settings:update', 'users:create', 'users:read', 'users:update', 'users:delete',
        'roles:read', 'roles:update', 'audit_logs:read', 'audit_logs:export',
    ],
    manager: [
        'dashboard:read', 'dashboard:export',
        'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
        'contracts:create', 'contracts:read', 'contracts:update', 'contracts:approve', 'contracts:export', 'contracts:import',
        'partners:create', 'partners:read', 'partners:update', 'partners:export',
        'members:create', 'members:read', 'members:update', 'members:export',
        'wages:read', 'wages:export',
        'settlement:create', 'settlement:read', 'settlement:update', 'settlement:export',
        'inventory:create', 'inventory:read', 'inventory:update', 'inventory:export', 'inventory:import',
        'invoices:read', 'invoices:export',
        'expenses:create', 'expenses:read', 'expenses:update', 'expenses:export',
        'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:export',
        'drawings:create', 'drawings:read', 'drawings:update', 'drawings:export', 'drawings:import',
    ],
    accountant: [
        'dashboard:read', 'dashboard:export', 'projects:read', 'projects:export',
        'contracts:read', 'contracts:approve', 'contracts:export', 'partners:read', 'partners:export',
        'members:read', 'members:export',
        'wages:create', 'wages:read', 'wages:update', 'wages:approve', 'wages:export',
        'settlement:create', 'settlement:read', 'settlement:update', 'settlement:approve', 'settlement:export',
        'inventory:read', 'inventory:export',
        'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
        'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
        'costLedger:create', 'costLedger:read', 'costLedger:update', 'costLedger:delete', 'costLedger:export',
        'audit_logs:read', 'audit_logs:export',
    ],
    worker: [
        'dashboard:read', 'projects:read', 'projects:export', 'contracts:read', 'contracts:export',
        'partners:read', 'members:read', 'inventory:read', 'inventory:export',
        'invoices:read', 'expenses:read', 'expenses:export',
        'costLedger:read', 'costLedger:export', 'drawings:read',
    ],
};
export function getRoleName(roleId) {
    var _a;
    // SQLite 优先
    if (useSqliteRead()) {
        var roles = roleQueries.listRoles();
        if (roles) {
            var customRole_1 = roles.find(function (r) { return r.id === roleId; });
            if (customRole_1)
                return customRole_1.name;
        }
    }
    var customRole = (_a = db.roles) === null || _a === void 0 ? void 0 : _a.find(function (r) { return r.id === roleId; });
    if (customRole)
        return customRole.name;
    return SYSTEM_ROLE_NAMES[roleId] || roleId;
}
export function getRolePermissions(roleId) {
    var _a;
    // SQLite 优先
    if (useSqliteRead()) {
        var perms = roleQueries.getRolePermissions(roleId);
        if (perms !== null)
            return perms;
    }
    var customRole = (_a = db.roles) === null || _a === void 0 ? void 0 : _a.find(function (r) { return r.id === roleId; });
    if (customRole === null || customRole === void 0 ? void 0 : customRole.permissions)
        return customRole.permissions;
    return SYSTEM_ROLE_DEFAULTS[roleId] || [];
}
ipcMain.handle('roles:getAll', function () { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        try {
            if (!db.roles)
                db.roles = [];
            // SQLite 优先
            if (useSqliteRead()) {
                data = roleQueries.listRoles();
                if (data)
                    return [2 /*return*/, { success: true, data: data }];
            }
            if (!shouldFallbackToJson())
                return [2 /*return*/, { success: false, error: 'SQLite read failed (sqlite-primary mode)' }];
            return [2 /*return*/, { success: true, data: db.roles }];
        }
        catch (error) {
            log.error('roles:getAll error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('roles:update', function (_event, roleId, permissions) { return __awaiter(void 0, void 0, void 0, function () {
    var role;
    return __generator(this, function (_a) {
        try {
            if (!db.roles)
                db.roles = [];
            role = db.roles.find(function (r) { return r.id === roleId; });
            if (!role)
                return [2 /*return*/, { success: false, error: 'Role not found' }];
            role.permissions = permissions;
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                roleQueries.updateRolePermissions(roleId, permissions);
            }
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('roles:update error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('roles:reset', function (_event, roleId) { return __awaiter(void 0, void 0, void 0, function () {
    var defaults, role;
    return __generator(this, function (_a) {
        try {
            if (!db.roles)
                db.roles = [];
            defaults = SYSTEM_ROLE_DEFAULTS[roleId];
            if (!defaults)
                return [2 /*return*/, { success: false, error: 'No defaults for role: ' + roleId }];
            role = db.roles.find(function (r) { return r.id === roleId; });
            if (!role)
                return [2 /*return*/, { success: false, error: 'Role not found' }];
            role.permissions = __spreadArray([], defaults, true);
            saveDatabase();
            // SQLite 双写
            if (useSqliteWrite()) {
                roleQueries.resetRolePermissions(roleId, __spreadArray([], defaults, true));
            }
            return [2 /*return*/, { success: true, data: { permissions: __spreadArray([], defaults, true) } }];
        }
        catch (error) {
            log.error('roles:reset error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
