/**
 * 成本台账 SQLite 查询模块
 *
 * 实现 cost_ledger 表的 CRUD 操作，供 IPC Handler 双写使用。
 * 读操作：从 SQLite 查询并返回 camelCase 格式
 * 写操作：INSERT/UPDATE/DELETE SQLite，由调用方负责同步 JSON
 */
/**
 * 列出台账记录（SQLite 版）
 * 含发票状态解析（LEFT JOIN invoices）
 */
export declare function listEntries(projectId: number, batchId?: number): any[] | null;
/**
 * 获取台账汇总（SQLite 版）
 */
export declare function summary(projectId: number, batchId?: number): {
    totalExpense: number;
    totalIncome: number;
    byCategory: Record<string, number>;
} | null;
/**
 * 创建台账记录（SQLite 版）
 * @returns SQLite 自增 ID，失败返回 null
 */
export declare function createEntry(entry: Record<string, any>): number | null;
/**
 * 批量创建台账记录（SQLite 版，使用事务）
 * @returns 成功插入的条目数
 */
export declare function batchCreateEntries(entries: Record<string, any>[]): number;
/**
 * 更新台账记录（SQLite 版）
 */
export declare function updateEntry(id: number, changes: Record<string, any>): boolean;
/**
 * 删除台账记录（SQLite 版）
 */
export declare function deleteEntry(id: number): boolean;
/**
 * 按项目级联删除（SQLite 版）
 */
export declare function deleteByProject(projectId: number): boolean;
/**
 * 列出项目批次（SQLite 版）
 */
export declare function listBatches(projectId: number): any[] | null;
/**
 * 获取项目最新有数据的批次 ID（SQLite 版）
 */
export declare function getLatestBatch(projectId: number): number | null;
/**
 * 创建批次（SQLite 版）
 */
export declare function createBatch(projectId: number, name: string, id: number): boolean;
/**
 * 重命名批次（SQLite 版）
 */
export declare function renameBatch(projectId: number, batchId: number, name: string): boolean;
/**
 * 删除批次及数据（SQLite 版，使用事务）
 */
export declare function deleteBatch(projectId: number, batchId: number): boolean;
/**
 * 复制版本（SQLite 版，事务中复制所有条目）
 */
export declare function copyBatch(projectId: number, sourceBatchId: number, newBatchId: number): number;
