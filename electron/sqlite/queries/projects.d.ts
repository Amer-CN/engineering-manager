/**
 * 项目 SQLite 查询模块
 *
 * 实现 projects 表的 CRUD 操作。
 * 特点：删除时级联删除 9 张关联表的数据。
 */
/** 列出所有项目（含项目经理姓名 JOIN members） */
export declare function listProjects(): any[] | null;
/** 创建项目 */
export declare function createProject(project: any): boolean;
/** 更新项目 */
export declare function updateProject(project: any): boolean;
/** 删除项目（含级联删除 9 张关联表，事务） */
export declare function deleteProject(projectId: number): boolean;
