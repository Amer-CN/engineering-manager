/**
 * 审计日志 SQLite 查询模块
 *
 * 实现 audit_logs 表的 CRUD 操作。
 *
 * 注意字段映射差异：
 * - JSON `timestamp`  ↔ SQLite `created_at`
 * - JSON `username`   ↔ SQLite `user_name`
 * - JSON `resource`   ↔ SQLite `resource_type`
 * - JSON `description` ↔ SQLite `details`（描述性文本存 details 列）
 * - JSON `resourceName` → SQLite 无此列（查询时用子查询模拟）
 * - JSON `ip`         ↔ SQLite `ip_address`
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import log from 'electron-log';
import { tryGetSqlite, toSqliteValue, useSqliteRead } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 字段映射
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 将 JSON 审计日志转为 SQLite INSERT 参数
 *
 * JSON AuditLog 字段 → SQLite audit_logs 列：
 *   id          → id (TEXT, 格式 "log_123_abc")
 *   timestamp   → created_at
 *   userId      → user_id
 *   username    → user_name
 *   action      → action
 *   resource    → resource_type
 *   resourceId  → resource_id
 *   level       → level
 *   description → details
 *   ip          → ip_address
 */
function auditLogToParams(auditLog) {
    return [
        toSqliteValue(auditLog.id), // id (TEXT)
        toSqliteValue(auditLog.action), // action
        toSqliteValue(auditLog.level || 'info'), // level
        toSqliteValue(auditLog.userId), // user_id
        toSqliteValue(auditLog.username), // user_name
        toSqliteValue(auditLog.resource), // resource_type
        toSqliteValue(auditLog.resourceId), // resource_id
        toSqliteValue(auditLog.description), // details
        toSqliteValue(auditLog.ip), // ip_address
        toSqliteValue(auditLog.timestamp || new Date().toISOString()), // created_at
    ];
}
/** INSERT 语句 */
var INSERT_SQL = "\n  INSERT OR REPLACE INTO audit_logs\n    (id, action, level, user_id, user_name, resource_type, resource_id, details, ip_address, created_at)\n  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n";
/**
 * 将 SQLite 行转为前端期望的 AuditLog 格式
 */
function rowToAuditLog(row) {
    return {
        id: row.id,
        action: row.action,
        level: row.level || 'info',
        userId: row.user_id,
        username: row.user_name,
        resource: row.resource_type,
        resourceId: row.resource_id,
        description: row.details,
        ip: row.ip_address,
        timestamp: row.created_at,
        // resourceName 在 SQLite 中没有对应列，设为 null
        resourceName: null,
        // details 在 SQLite 中复用 details 列（description），
        // 原始 details 对象在 JSON 迁移时已丢失（前端 audit.ts 会剥离 details 再存 JSON）
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 记录审计日志（SQLite 版）
 */
export function logAudit(auditLog) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = auditLogToParams(auditLog);
        (_a = sqlite.prepare(INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] audit.log error:', err);
        return false;
    }
}
/**
 * 清理旧日志（SQLite 版）
 * @returns 删除的行数
 */
export function clearLogs(daysToKeep) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return 0;
    try {
        var cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
        var result = sqlite.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(cutoffDate);
        return result.changes;
    }
    catch (err) {
        log.error('[SQLite] audit.clear error:', err);
        return 0;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * 查询审计日志（SQLite 版）
 * 返回格式与 JSON 版 audit:query 一致
 */
export function queryLogs(query) {
    var _a, _b;
    if (!useSqliteRead())
        return null;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var conditions = [];
        var params = [];
        // 日期筛选
        if (query.startDate) {
            conditions.push('created_at >= ?');
            params.push(query.startDate);
        }
        if (query.endDate) {
            var endDate = new Date(query.endDate);
            endDate.setHours(23, 59, 59, 999);
            conditions.push('created_at <= ?');
            params.push(endDate.toISOString());
        }
        // 操作类型
        if (query.action) {
            conditions.push('action = ?');
            params.push(query.action);
        }
        // 资源类型（JSON 的 resource 对应 SQLite 的 resource_type）
        if (query.resource) {
            conditions.push('resource_type = ?');
            params.push(query.resource);
        }
        // 级别
        if (query.level) {
            conditions.push('level = ?');
            params.push(query.level);
        }
        // 关键词搜索（user_name / details / resource_id）
        if (query.keyword) {
            conditions.push('(user_name LIKE ? OR details LIKE ? OR resource_id LIKE ?)');
            var kw = "%".concat(query.keyword.toLowerCase(), "%");
            params.push(kw, kw, kw);
        }
        var whereClause = conditions.length > 0 ? "WHERE ".concat(conditions.join(' AND ')) : '';
        // 总数
        var countRow = (_a = sqlite.prepare("SELECT COUNT(*) as count FROM audit_logs ".concat(whereClause)))
            .get.apply(_a, params);
        var total = countRow.count;
        // 分页
        var page = query.page || 1;
        var pageSize = query.pageSize || 20;
        var totalPages = Math.ceil(total / pageSize);
        var offset = (page - 1) * pageSize;
        // 查询
        var rows = (_b = sqlite.prepare("SELECT * FROM audit_logs ".concat(whereClause, " ORDER BY created_at DESC LIMIT ? OFFSET ?"))).all.apply(_b, __spreadArray(__spreadArray([], params, false), [pageSize, offset], false));
        var items = rows.map(rowToAuditLog);
        return { items: items, total: total, page: page, pageSize: pageSize, totalPages: totalPages };
    }
    catch (err) {
        log.error('[SQLite] audit.query error:', err);
        return null;
    }
}
/**
 * 获取审计统计（SQLite 版）
 */
export function getStats(days) {
    var _a, _b, _c, _d, _e;
    if (!useSqliteRead())
        return null;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var dateFilter = '';
        var params = [];
        if (days) {
            var cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            dateFilter = 'WHERE created_at >= ?';
            params.push(cutoffDate);
        }
        // 总数
        var countRow = (_a = sqlite.prepare("SELECT COUNT(*) as count FROM audit_logs ".concat(dateFilter)))
            .get.apply(_a, params);
        var totalCount = countRow.count;
        // 今日操作数
        var today = new Date().toISOString().split('T')[0];
        var todayParams = __spreadArray([], params, true);
        var todayWhere = dateFilter
            ? "".concat(dateFilter, " AND created_at >= ?")
            : 'WHERE created_at >= ?';
        todayParams.push(today);
        var todayRow = (_b = sqlite.prepare("SELECT COUNT(*) as count FROM audit_logs ".concat(todayWhere)))
            .get.apply(_b, todayParams);
        var todayCount = todayRow.count;
        // 操作类型分布
        var actionRows = (_c = sqlite.prepare("SELECT action, COUNT(*) as count FROM audit_logs ".concat(dateFilter, " GROUP BY action"))).all.apply(_c, params);
        var actionCounts = {};
        for (var _i = 0, actionRows_1 = actionRows; _i < actionRows_1.length; _i++) {
            var row = actionRows_1[_i];
            actionCounts[row.action] = row.count;
        }
        // 资源类型分布
        var resourceRows = (_d = sqlite.prepare("SELECT resource_type, COUNT(*) as count FROM audit_logs ".concat(dateFilter, " GROUP BY resource_type"))).all.apply(_d, params);
        var resourceCounts = {};
        for (var _f = 0, resourceRows_1 = resourceRows; _f < resourceRows_1.length; _f++) {
            var row = resourceRows_1[_f];
            resourceCounts[row.resource_type] = row.count;
        }
        // 活跃用户
        var userRows = (_e = sqlite.prepare("SELECT user_id, user_name, COUNT(*) as count FROM audit_logs ".concat(dateFilter, " GROUP BY user_id, user_name ORDER BY count DESC LIMIT 10"))).all.apply(_e, params);
        var topUsers = userRows.map(function (row) { return ({
            userId: row.user_id || 'unknown',
            username: row.user_name || 'unknown',
            count: row.count,
        }); });
        return { totalCount: totalCount, todayCount: todayCount, actionCounts: actionCounts, resourceCounts: resourceCounts, topUsers: topUsers };
    }
    catch (err) {
        log.error('[SQLite] audit.stats error:', err);
        return null;
    }
}
