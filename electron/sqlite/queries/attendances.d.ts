/**
 * 考勤 SQLite 查询模块
 *
 * 实现 attendances 表的 CRUD 操作。
 * 特点：
 * - getAll: 复杂富化（memberName/memberType/teamName/teamId + JOIN）
 * - update: 需要从 dailyStatus 重新计算 workDays/daysOff/isFullAttendance
 * - batchCreate/generateDefaults/generateDefaultsV2: 带去重逻辑的批量创建
 * - batchImport: upsert 逻辑（存在则更新，否则插入）
 */
/** 列出考勤（可选项目/月份过滤） */
export declare function listAttendances(projectId?: number, yearMonth?: string): any[] | null;
/** 按成员查询考勤 */
export declare function listAttendancesByMember(memberId: number, yearMonth?: string): any[] | null;
/** 创建考勤记录 */
export declare function createAttendance(record: any): boolean;
/** 更新考勤记录 */
export declare function updateAttendance(id: number, changes: any): boolean;
/** 删除考勤记录 */
export declare function deleteAttendance(id: number): boolean;
/** 批量删除考勤记录 */
export declare function batchDeleteAttendances(ids: number[]): boolean;
/** 检查考勤是否已存在（memberId+projectId+yearMonth 或 projectWorkerId+yearMonth） */
export declare function existsAttendance(memberId: number | null, projectWorkerId: number | null, projectId: number, yearMonth: string): boolean | null;
/** 查找考勤记录（projectWorkerId+yearMonth）用于 batchImport 的 upsert */
export declare function findAttendanceByPWAndMonth(projectWorkerId: number, yearMonth: string): any | null;
