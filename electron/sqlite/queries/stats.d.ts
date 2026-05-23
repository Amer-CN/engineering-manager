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
/** 仪表盘统计数据 */
export interface DashboardStats {
    projectsCount: number;
    membersCount: number;
    materialsCount: number;
    totalExpenses: number;
    expenseByCategory: Record<string, number>;
    settlementsCount: number;
    invoicesCount: number;
    inventoryItemsCount: number;
    inProgressProjects: number;
    recentProjects: any[];
}
/** 获取仪表盘统计数据 */
export declare function getDashboard(): DashboardStats | null;
