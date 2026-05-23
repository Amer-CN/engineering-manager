/**
 * 模板 + 图纸 SQLite 查询模块
 *
 * 实现 templates + drawings 两张表的 CRUD 操作。
 * 特点：
 * - templates: 含 variables JSON 数组字段
 * - drawings: 含文件路径，文件操作在 handler 层处理，SQLite 只管元数据
 */
/** 列出模板（可按分类过滤） */
export declare function listTemplates(category?: string): any[] | null;
/** 创建模板 */
export declare function createTemplate(template: any): boolean;
/** 更新模板 */
export declare function updateTemplate(id: number, changes: any): boolean;
/** 删除模板 */
export declare function deleteTemplate(id: number): boolean;
/** 按分类统计 */
export declare function getTemplateStats(): Record<string, number> | null;
/** 列出图纸（可按项目过滤） */
export declare function listDrawings(projectId?: number): any[] | null;
/** 创建图纸（元数据） */
export declare function createDrawing(drawing: any): boolean;
/** 更新图纸（元数据） */
export declare function updateDrawing(id: number, changes: any): boolean;
/** 删除图纸（元数据） */
export declare function deleteDrawing(id: number): boolean;
