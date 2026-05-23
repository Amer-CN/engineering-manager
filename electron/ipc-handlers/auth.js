/**
 * 认证 IPC 处理器
 */
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
import { ipcMain } from 'electron';
import log from 'electron-log';
import { db, saveDatabase, verifyPassword, hashPassword } from '../database';
import { getRoleName, getRolePermissions } from './roles';
// ═══════════════════════════════════════════════════════════════════════════════
// 用户服务
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 登录
 */
ipcMain.handle('auth:login', function (_, username, password) { return __awaiter(void 0, void 0, void 0, function () {
    var user, lockExpiry, remainingMin, isValid, remaining, _a, hash, salt;
    return __generator(this, function (_b) {
        try {
            user = db.users.find(function (u) { return u.username === username; });
            if (!user) {
                return [2 /*return*/, { success: false, error: '用户名或密码错误' }];
            }
            if (user.status !== 'active') {
                return [2 /*return*/, { success: false, error: '账户已被禁用' }];
            }
            // Check account lockout
            if (user.lockedUntil) {
                lockExpiry = new Date(user.lockedUntil).getTime();
                if (Date.now() < lockExpiry) {
                    remainingMin = Math.ceil((lockExpiry - Date.now()) / 60000);
                    return [2 /*return*/, { success: false, error: "\u8D26\u6237\u5DF2\u88AB\u9501\u5B9A\uFF0C\u8BF7\u5728 ".concat(remainingMin, " \u5206\u949F\u540E\u91CD\u8BD5") }];
                }
                // Lock expired, reset
                user.failedLoginAttempts = 0;
                user.lockedUntil = null;
            }
            isValid = verifyPassword(password, user.passwordHash, user.passwordSalt, user.passwordHashVersion || 1);
            if (!isValid) {
                // Track failed attempts
                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                if (user.failedLoginAttempts >= 5) {
                    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                    saveDatabase();
                    return [2 /*return*/, { success: false, error: '密码错误次数过多，账户已锁定 15 分钟' }];
                }
                saveDatabase();
                remaining = 5 - user.failedLoginAttempts;
                return [2 /*return*/, { success: false, error: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF\uFF0C\u8FD8\u5269 ".concat(remaining, " \u6B21\u5C1D\u8BD5\u673A\u4F1A") }];
            }
            // Reset failed attempts on success
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
            user.lastLoginAt = new Date().toISOString();
            // Auto-upgrade password hash if using old version
            if (!user.passwordHashVersion || user.passwordHashVersion < 2) {
                _a = hashPassword(password), hash = _a.hash, salt = _a.salt;
                user.passwordHash = hash;
                user.passwordSalt = salt;
                user.passwordHashVersion = 2;
                log.info('Password hash upgraded for user:', user.username);
            }
            saveDatabase();
            // 返回用户信息（不包含密码）
            return [2 /*return*/, {
                    success: true,
                    data: {
                        userId: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        roleId: user.roleId,
                        roleName: getRoleName(user.roleId),
                        permissions: getRolePermissions(user.roleId),
                        mustChangePassword: user.mustChangePassword || false
                    }
                }];
        }
        catch (error) {
            log.error('Login failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 获取当前用户信息
 */
ipcMain.handle('auth:getCurrentUser', function (_, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var user;
    return __generator(this, function (_a) {
        try {
            user = db.users.find(function (u) { return u.id === userId; });
            if (!user) {
                return [2 /*return*/, { success: false, error: 'User not found' }];
            }
            return [2 /*return*/, {
                    success: true,
                    data: {
                        userId: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        roleId: user.roleId,
                        roleName: getRoleName(user.roleId),
                        permissions: getRolePermissions(user.roleId)
                    }
                }];
        }
        catch (error) {
            log.error('Get user failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 获取所有用户
 */
ipcMain.handle('auth:getAllUsers', function () { return __awaiter(void 0, void 0, void 0, function () {
    var users;
    return __generator(this, function (_a) {
        try {
            users = db.users.map(function (u) { return ({
                id: u.id,
                username: u.username,
                displayName: u.displayName,
                roleId: u.roleId,
                status: u.status,
                createdAt: u.createdAt,
                lastLoginAt: u.lastLoginAt
            }); });
            return [2 /*return*/, { success: true, data: users }];
        }
        catch (error) {
            log.error('Get users failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 创建用户
 */
ipcMain.handle('auth:createUser', function (_, userData) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, hash, salt, newUser;
    return __generator(this, function (_b) {
        try {
            // 检查用户名是否已存在
            if (db.users.some(function (u) { return u.username === userData.username; })) {
                return [2 /*return*/, { success: false, error: 'Username already exists' }];
            }
            _a = hashPassword(userData.password), hash = _a.hash, salt = _a.salt;
            newUser = {
                id: 'user-' + Date.now(),
                username: userData.username,
                passwordHash: hash,
                passwordSalt: salt,
                roleId: userData.roleId,
                status: 'active',
                displayName: userData.displayName,
                createdAt: new Date().toISOString(),
                lastLoginAt: null
            };
            db.users.push(newUser);
            saveDatabase();
            return [2 /*return*/, {
                    success: true,
                    data: {
                        id: newUser.id,
                        username: newUser.username,
                        displayName: newUser.displayName,
                        roleId: newUser.roleId
                    }
                }];
        }
        catch (error) {
            log.error('Create user failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 更新用户
 */
ipcMain.handle('auth:updateUser', function (_, userId, updates) { return __awaiter(void 0, void 0, void 0, function () {
    var userIndex, user, _a, hash, salt;
    return __generator(this, function (_b) {
        try {
            userIndex = db.users.findIndex(function (u) { return u.id === userId; });
            if (userIndex === -1) {
                return [2 /*return*/, { success: false, error: 'User not found' }];
            }
            user = db.users[userIndex];
            if (updates.displayName)
                user.displayName = updates.displayName;
            if (updates.roleId)
                user.roleId = updates.roleId;
            if (updates.status)
                user.status = updates.status;
            if (updates.password) {
                _a = hashPassword(updates.password), hash = _a.hash, salt = _a.salt;
                user.passwordHash = hash;
                user.passwordSalt = salt;
            }
            saveDatabase();
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('Update user failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
/**
 * 删除用户
 */
ipcMain.handle('auth:deleteUser', function (_, userId) { return __awaiter(void 0, void 0, void 0, function () {
    var adminCount, user;
    return __generator(this, function (_a) {
        try {
            adminCount = db.users.filter(function (u) { return u.roleId === 'admin'; }).length;
            user = db.users.find(function (u) { return u.id === userId; });
            if ((user === null || user === void 0 ? void 0 : user.roleId) === 'admin' && adminCount <= 1) {
                return [2 /*return*/, { success: false, error: 'Cannot delete the last admin user' }];
            }
            db.users = db.users.filter(function (u) { return u.id !== userId; });
            saveDatabase();
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('Delete user failed:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
log.info('Auth IPC handlers registered');
