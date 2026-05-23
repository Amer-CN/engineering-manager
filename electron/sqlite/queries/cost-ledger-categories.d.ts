/**
 * 成本台账分类 SQLite 查询模块
 *
 * 实现 cost_ledger_categories 表的 CRUD 操作。
 * 特点：reset 为全量覆盖；内置/自定义分类区分。
 */
/** 列出分类（可按方向过滤，排除已禁用） */
export declare function listCategories(direction?: string): any[] | null;
/** 创建分类 */
export declare function createCategory(cat: any): boolean;
/** 更新分类 */
export declare function updateCategory(id: number, changes: any): boolean;
/** 删除分类 */
export declare function deleteCategory(id: number): boolean;
/** 检查分类 code 是否被 cost_ledger 引用 */
export declare function countCategoryRefs(code: string): number | null;
/** 恢复默认分类（事务：DELETE ALL + INSERT 默认值） */
export declare function resetCategories(defaultCats: any[]): boolean;
