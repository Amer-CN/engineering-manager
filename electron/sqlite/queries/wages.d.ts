/**
 * 工资 SQLite 查询模块
 *
 * 实现 wages 表的 CRUD 操作。
 * 特点：
 * - getAll: 去重（同 projectWorkerId/memberId + yearMonth 只保留最新）
 * - batchSave: 全量替换该项目+月份的工资记录
 * - batchClearPayments: 批量清空发放字段
 * - batchArchivePayments: 批量归档
 * - getStats: 聚合统计
 */
/** 查询工资列表（支持可选过滤） */
export declare function listWages(filters?: {
    projectId?: number;
    yearMonth?: string;
    memberId?: number;
}): any[];
/** 创建工资记录 */
export declare function createWage(record: any): boolean;
/** 更新工资记录 */
export declare function updateWage(id: number, changes: any): boolean;
/** 删除工资记录 */
export declare function deleteWage(id: number): boolean;
/** 批量删除工资记录 */
export declare function batchDeleteWages(ids: number[]): boolean;
/** 批量保存工资（替换该项目+月份的所有工资记录，事务） */
export declare function batchSaveWages(records: any[]): boolean;
/** 批量清空发放字段 */
export declare function batchClearPayments(ids: number[]): boolean;
/** 批量归档工资发放记录 */
export declare function batchArchivePayments(ids: number[]): boolean;
/** 工资统计（SQLite 聚合版） */
export declare function getWageStats(filters?: {
    yearMonth?: string;
    projectId?: number;
}): {
    totalWage: number;
    count: number;
    projectBreakdown: {
        projectId: number;
        projectName: string;
        total: number;
        percentage: number;
    }[];
} | null;
