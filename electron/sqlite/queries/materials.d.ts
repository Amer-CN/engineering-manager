/**
 * 材料与费用 SQLite 查询模块
 *
 * 实现 materials + expenses 两张表的 CRUD 操作。
 */
/** 列出材料（可按项目过滤） */
export declare function listMaterials(projectId?: number): any[] | null;
/** 创建材料 */
export declare function createMaterial(mat: any): boolean;
/** 更新材料 */
export declare function updateMaterial(id: number, changes: any): boolean;
/** 删除材料 */
export declare function deleteMaterial(id: number): boolean;
/** 列出费用（可按项目过滤） */
export declare function listExpenses(projectId?: number): any[] | null;
/** 创建费用 */
export declare function createExpense(exp: any): boolean;
/** 更新费用 */
export declare function updateExpense(id: number, changes: any): boolean;
/** 删除费用 */
export declare function deleteExpense(id: number): boolean;
