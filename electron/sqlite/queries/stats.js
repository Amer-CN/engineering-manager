/**
 * 仪表盘统计 SQLite 查询模块
 *
 * 聚合多个表的统计数据，用于仪表盘展示。
 * - 项目数 / 进行中项目数
 * - 人员数
 * - 材料数
 * - 成本台账支出汇总 + 按分类分组
 * - 结算数 / 发票数 / 库存数
 * - 最近5个项目
 */
import log from 'electron-log';
import { tryGetSqlite } from './helpers';
/** 获取仪表盘统计数据 */
export function getDashboard() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // 1. 项目统计
        var projectStats = sqlite.prepare("\n      SELECT\n        COUNT(*) AS total,\n        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress\n      FROM projects\n    ").get();
        // 2. 人员数
        var memberCount = sqlite.prepare('SELECT COUNT(*) AS c FROM members').get().c;
        // 3. 材料数
        var materialCount = sqlite.prepare('SELECT COUNT(*) AS c FROM materials').get().c;
        // 4. 成本台账支出汇总 + 按分类分组
        var totalExpense = sqlite.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM cost_ledger WHERE direction = 'expense'").get().total;
        // 按分类汇总支出（需要关联 categories 表获取标签）
        var categoryRows = sqlite.prepare("\n      SELECT\n        COALESCE(cl.category, '\u5176\u4ED6') AS category_code,\n        COALESCE(c.level1, c.label, cl.category, '\u5176\u4ED6') AS category_label,\n        SUM(cl.amount) AS total\n      FROM cost_ledger cl\n      LEFT JOIN cost_ledger_categories c ON c.code = cl.category AND c.is_enabled = 1\n      WHERE cl.direction = 'expense'\n      GROUP BY cl.category\n    ").all();
        var expenseByCategory = {};
        for (var _i = 0, categoryRows_1 = categoryRows; _i < categoryRows_1.length; _i++) {
            var row = categoryRows_1[_i];
            expenseByCategory[row.category_label] = Math.round((row.total || 0) * 100) / 100;
        }
        // 5. 结算数
        var settlementCount = sqlite.prepare('SELECT COUNT(*) AS c FROM settlements').get().c;
        // 6. 发票数
        var invoiceCount = sqlite.prepare('SELECT COUNT(*) AS c FROM invoices').get().c;
        // 7. 库存数
        var inventoryCount = sqlite.prepare('SELECT COUNT(*) AS c FROM inventory_items').get().c;
        // 8. 最近5个项目
        var recentProjects = sqlite.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all().map(function (r) { return ({
            id: r.id,
            name: r.name,
            status: r.status,
            createdAt: r.created_at,
            // 保留前端可能用到的字段
            startDate: r.start_date,
            endDate: r.end_date,
        }); });
        return {
            projectsCount: projectStats.total || 0,
            membersCount: memberCount,
            materialsCount: materialCount,
            totalExpenses: Math.round((totalExpense || 0) * 100) / 100,
            expenseByCategory: expenseByCategory,
            settlementsCount: settlementCount,
            invoicesCount: invoiceCount,
            inventoryItemsCount: inventoryCount,
            inProgressProjects: projectStats.in_progress || 0,
            recentProjects: recentProjects,
        };
    }
    catch (err) {
        log.error('[SQLite] stats.getDashboard error:', err);
        return null;
    }
}
