/**
 * 角色 SQLite 查询模块
 *
 * 实现 roles 表的 CRUD 操作。
 * 特点：roles.id 是 TEXT 主键（admin/manager/accountant/worker），非自增。
 */
/** 列出所有角色 */
export declare function listRoles(): any[] | null;
/** 获取单个角色的权限列表 */
export declare function getRolePermissions(roleId: string): string[] | null;
/** 更新角色权限 */
export declare function updateRolePermissions(roleId: string, permissions: string[]): boolean;
/** 重置角色权限到默认值 */
export declare function resetRolePermissions(roleId: string, defaultPermissions: string[]): boolean;
