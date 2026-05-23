/**
 * 全局工人 + 项目用工关系 SQLite 查询模块
 *
 * 实现 workers + project_workers 两张表的 CRUD 操作。
 * 特点：
 * - workers.getAll: 复杂过滤（search/workerType）+ 富化（projectCount/activeProjectCount）
 * - workers.delete: 级联删除 project_workers，检查 active 状态
 * - workers.getStats/getTeamWages: 聚合查询
 * - projectWorkers.getAll: JOIN enrichment + attendance firstDay 推断
 * - projectWorkers.create/batchCreate: 自动创建 wageHistory 记录
 */
/** 列出工人（可选搜索/工种过滤，富化 projectCount/activeProjectCount） */
export declare function listWorkers(search?: string, workerType?: string): any[] | null;
/** 创建工人 */
export declare function createWorker(worker: any): boolean;
/** 更新工人 */
export declare function updateWorker(id: number, changes: any): boolean;
/** 删除工人（级联删除 project_workers，需先检查无活跃用工） */
export declare function deleteWorker(id: number): boolean;
/** 检查工人是否有活跃 projectWorker */
export declare function countActiveProjectWorkers(workerId: number): number | null;
/** 检查身份证是否重复 */
export declare function existsByIdCard(idCard: string, excludeId?: number): boolean | null;
/** 列出某项目的用工关系（富化 worker/team/project 名称） */
export declare function listProjectWorkers(projectId: number): any[] | null;
/** 创建项目用工关系 */
export declare function createProjectWorker(pw: any): boolean;
/** 更新项目用工关系 */
export declare function updateProjectWorker(id: number, changes: any): boolean;
/** 删除项目用工关系 */
export declare function deleteProjectWorker(id: number): boolean;
/** 检查工人是否已在项目中 */
export declare function existsProjectWorker(workerId: number, projectId: number): boolean | null;
/** 批量创建项目用工关系（事务） */
export declare function batchCreateProjectWorkers(entries: any[]): boolean;
/** 工人统计：项目数 + 总收入 + 按项目拆分 */
export declare function getWorkerStats(workerId: number): {
    projectCount: number;
    totalEarnings: number;
    projectBreakdown: {
        projectId: number;
        projectName: string;
        total: number;
    }[];
} | null;
/** 按班组汇总工资 */
export declare function getTeamWages(projectId: number, teamId: number): {
    teamId: number;
    teamName: string;
    workerCount: number;
    teamTotal: number;
    details: {
        workerName: string;
        months: number;
        workDays: number;
        dailyWage: number;
        totalWage: number;
    }[];
} | null;
