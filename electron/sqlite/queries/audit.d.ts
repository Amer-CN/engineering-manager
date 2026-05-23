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
/**
 * 记录审计日志（SQLite 版）
 */
export declare function logAudit(auditLog: Record<string, any>): boolean;
/**
 * 清理旧日志（SQLite 版）
 * @returns 删除的行数
 */
export declare function clearLogs(daysToKeep: number): number;
/**
 * 查询审计日志（SQLite 版）
 * 返回格式与 JSON 版 audit:query 一致
 */
export declare function queryLogs(query: Record<string, any>): {
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
} | null;
/**
 * 获取审计统计（SQLite 版）
 */
export declare function getStats(days?: number): {
    totalCount: number;
    todayCount: number;
    actionCounts: Record<string, number>;
    resourceCounts: Record<string, number>;
    topUsers: {
        userId: string;
        username: string;
        count: number;
    }[];
} | null;
