/**
 * 部门 SQLite 查询模块
 *
 * 实现 departments 表的 CRUD 操作。
 * 特点：getAll 需要 LEFT JOIN members 计算 memberCount。
 */
/** 列出所有部门（按创建时间升序，附带 memberCount） */
export declare function listDepartments(): any[] | null;
/** 创建部门 */
export declare function createDepartment(dept: any): boolean;
/** 更新部门 */
export declare function updateDepartment(id: number, changes: any): boolean;
/** 删除部门 */
export declare function deleteDepartment(id: number): boolean;
/** 检查部门下是否有 staff 成员 */
export declare function countStaffMembers(deptId: number): number | null;
/** 检查部门名是否已存在 */
export declare function existsByName(name: string, excludeId?: number): boolean | null;
