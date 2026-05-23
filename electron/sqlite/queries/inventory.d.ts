/**
 * 进销存 SQLite 查询模块
 *
 * 实现 inventory_items + inventory_transactions 两张表的 CRUD 操作。
 * 特点：transactions 读取时 JOIN inventory_items/projects/partners 做名称富化。
 */
/** 列出所有物料（按创建时间降序） */
export declare function listInventoryItems(): any[] | null;
/** 创建物料 */
export declare function createInventoryItem(item: any): boolean;
/** 更新物料 */
export declare function updateInventoryItem(id: number, changes: any): boolean;
/** 删除物料 */
export declare function deleteInventoryItem(id: number): boolean;
/** 列出出入库记录（可按物料过滤，富化名称） */
export declare function listTransactions(itemId?: number): any[] | null;
/** 创建出入库记录 */
export declare function createTransaction(txn: any): boolean;
