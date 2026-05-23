/**
 * 薪资历史 + 工人日工资历史 SQLite 查询模块
 *
 * 实现 salary_history + wage_history 两张表的 CRUD 操作。
 * 特点：
 * - salary_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 member.baseSalary
 * - wage_history.save: upsert 模式 + 同步 project_worker.daily_wage
 * - wage_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 project_worker.daily_wage
 */
/** 列出某成员的薪资历史（按生效日期降序） */
export declare function listSalaryHistory(memberId: number): any[] | null;
/** 创建薪资历史记录 */
export declare function createSalaryHistory(record: any): boolean;
/** 删除薪资历史记录 */
export declare function deleteSalaryHistory(id: number): boolean;
/** 获取某成员在某年月的有效薪资（最晚的、不晚于该月最后一天的记录） */
export declare function getEffectiveSalary(memberId: number, yearMonth: string): any | null;
/** 检查是否已存在同一成员+日期的记录 */
export declare function existsSalaryHistory(memberId: number, effectiveDate: string): boolean | null;
/** 列出某工人日工资历史（按年月降序） */
export declare function listWageHistory(projectWorkerId: number): any[] | null;
/** 保存工资历史记录（upsert 模式：存在则更新，否则插入） */
export declare function saveWageHistory(record: {
    projectWorkerId: number;
    yearMonth: string;
    dailyWage: number;
    note?: string;
}): boolean;
/** 获取指定月份的有效日工资标准 */
export declare function getEffectiveWage(projectWorkerId: number, yearMonth: string): any | null;
/** 删除工资历史记录 */
export declare function deleteWageHistory(id: number): boolean;
