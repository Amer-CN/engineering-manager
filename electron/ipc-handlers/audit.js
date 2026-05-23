/**
 * 审计日志 IPC 处理器
 *
 * 🔀 双写策略（Phase 7.3）：
 *   读：SQLite 已就绪+已迁移 → 从 SQLite 读取；否则从 JSON 读取
 *   写：SQLite 已就绪 → 写入 JSON + SQLite 双写；否则仅 JSON
 *
 * 字段映射注意事项（JSON ↔ SQLite）：
 *   timestamp     ↔ created_at
 *   username       ↔ user_name
 *   resource       ↔ resource_type
 *   description    ↔ details
 *   ip             ↔ ip_address
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
import { useSqliteRead, shouldFallbackToJson, auditQueries } from '../sqlite/queries';
var MAX_LOGS = 10000;
// ═══════════════════════════════════════════════════════════════════════════════
// 审计日志
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('audit:log', function (_event, auditLog) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            // ── JSON 写（原有逻辑） ──
            if (!db.auditLogs)
                db.auditLogs = [];
            db.auditLogs.push(auditLog);
            if (db.auditLogs.length > MAX_LOGS) {
                db.auditLogs = db.auditLogs.slice(-MAX_LOGS);
            }
            saveDatabase();
            // ── SQLite 双写 ──
            auditQueries.logAudit(auditLog);
            return [2 /*return*/, { success: true }];
        }
        catch (error) {
            log.error('audit:log error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('audit:query', function (_event, query) { return __awaiter(void 0, void 0, void 0, function () {
    var result, filtered, endDate_1, kw_1, total, page, pageSize, totalPages, start, items;
    return __generator(this, function (_a) {
        try {
            // ── SQLite 读路径 ──
            if (useSqliteRead()) {
                result = auditQueries.queryLogs(query);
                if (result !== null) {
                    return [2 /*return*/, { success: true, data: result }];
                }
                log.warn('[DualWrite] audit.query SQLite read failed, falling back to JSON');
            }
            // ── JSON 读路径（原有逻辑） ──
            if (!shouldFallbackToJson())
                return [2 /*return*/, { success: false, error: 'SQLite read failed (sqlite-primary mode)' }];
            if (!db.auditLogs)
                db.auditLogs = [];
            filtered = __spreadArray([], db.auditLogs, true);
            // 按日期筛选
            if (query.startDate) {
                filtered = filtered.filter(function (l) { return l.timestamp >= query.startDate; });
            }
            if (query.endDate) {
                endDate_1 = new Date(query.endDate);
                endDate_1.setHours(23, 59, 59, 999);
                filtered = filtered.filter(function (l) { return new Date(l.timestamp) <= endDate_1; });
            }
            // 按操作类型筛选
            if (query.action) {
                filtered = filtered.filter(function (l) { return l.action === query.action; });
            }
            // 按资源类型筛选
            if (query.resource) {
                filtered = filtered.filter(function (l) { return l.resource === query.resource; });
            }
            // 按级别筛选
            if (query.level) {
                filtered = filtered.filter(function (l) { return l.level === query.level; });
            }
            // 关键词搜索
            if (query.keyword) {
                kw_1 = query.keyword.toLowerCase();
                filtered = filtered.filter(function (l) {
                    var _a, _b, _c;
                    return ((_a = l.username) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(kw_1)) ||
                        ((_b = l.description) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(kw_1)) ||
                        ((_c = l.resourceName) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(kw_1));
                });
            }
            filtered.sort(function (a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); });
            total = filtered.length;
            page = query.page || 1;
            pageSize = query.pageSize || 20;
            totalPages = Math.ceil(total / pageSize);
            start = (page - 1) * pageSize;
            items = filtered.slice(start, start + pageSize);
            return [2 /*return*/, {
                    success: true,
                    data: { items: items, total: total, page: page, pageSize: pageSize, totalPages: totalPages }
                }];
        }
        catch (error) {
            log.error('audit:query error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('audit:stats', function (_event, days) { return __awaiter(void 0, void 0, void 0, function () {
    var result, now, cutoffDate_1, logs, totalCount, today_1, todayCount, actionCounts_1, resourceCounts_1, userCounts_1, topUsers;
    return __generator(this, function (_a) {
        try {
            // ── SQLite 读路径 ──
            if (useSqliteRead()) {
                result = auditQueries.getStats(days);
                if (result !== null) {
                    return [2 /*return*/, { success: true, data: result }];
                }
                log.warn('[DualWrite] audit.stats SQLite read failed, falling back to JSON');
            }
            // ── JSON 读路径（原有逻辑） ──
            if (!shouldFallbackToJson())
                return [2 /*return*/, { success: false, error: 'SQLite read failed (sqlite-primary mode)' }];
            if (!db.auditLogs)
                db.auditLogs = [];
            now = Date.now();
            cutoffDate_1 = days ? new Date(now - days * 24 * 60 * 60 * 1000).toISOString() : null;
            logs = db.auditLogs;
            if (cutoffDate_1) {
                logs = logs.filter(function (l) { return l.timestamp >= cutoffDate_1; });
            }
            totalCount = logs.length;
            today_1 = new Date().toISOString().split('T')[0];
            todayCount = logs.filter(function (l) { return l.timestamp.startsWith(today_1); }).length;
            actionCounts_1 = {};
            logs.forEach(function (l) {
                actionCounts_1[l.action] = (actionCounts_1[l.action] || 0) + 1;
            });
            resourceCounts_1 = {};
            logs.forEach(function (l) {
                resourceCounts_1[l.resource] = (resourceCounts_1[l.resource] || 0) + 1;
            });
            userCounts_1 = {};
            logs.forEach(function (l) {
                var key = l.userId || 'unknown';
                if (!userCounts_1[key]) {
                    userCounts_1[key] = { userId: key, username: l.username || 'unknown', count: 0 };
                }
                userCounts_1[key].count++;
            });
            topUsers = Object.values(userCounts_1)
                .sort(function (a, b) { return b.count - a.count; })
                .slice(0, 10);
            return [2 /*return*/, {
                    success: true,
                    data: { totalCount: totalCount, todayCount: todayCount, actionCounts: actionCounts_1, resourceCounts: resourceCounts_1, topUsers: topUsers }
                }];
        }
        catch (error) {
            log.error('audit:stats error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
ipcMain.handle('audit:clear', function (_event, daysToKeep) { return __awaiter(void 0, void 0, void 0, function () {
    var cutoffDate_2, before, removed;
    return __generator(this, function (_a) {
        try {
            // ── JSON 写（原有逻辑） ──
            if (!db.auditLogs)
                db.auditLogs = [];
            cutoffDate_2 = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
            before = db.auditLogs.length;
            db.auditLogs = db.auditLogs.filter(function (l) { return l.timestamp >= cutoffDate_2; });
            removed = before - db.auditLogs.length;
            saveDatabase();
            // ── SQLite 双写 ──
            auditQueries.clearLogs(daysToKeep);
            return [2 /*return*/, { success: true, data: { removedCount: removed } }];
        }
        catch (error) {
            log.error('audit:clear error:', error);
            return [2 /*return*/, { success: false, error: error.message }];
        }
        return [2 /*return*/];
    });
}); });
log.info('Audit IPC handlers registered');
