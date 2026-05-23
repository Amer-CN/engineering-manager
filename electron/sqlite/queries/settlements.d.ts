/**
 * 结算 + 合同模板 SQLite 查询模块
 *
 * 实现 settlements + contract_templates 两张表的 CRUD 操作。
 * 特点：
 * - settlements: getAll 富化 projectName/partnerName，process/unarchive 业务逻辑
 * - contractTemplates: 简单 CRUD
 */
/** 列出结算（可按项目过滤，富化名称） */
export declare function listSettlements(projectId?: number): any[] | null;
/** 创建结算 */
export declare function createSettlement(settlement: any): boolean;
/** 更新结算 */
export declare function updateSettlement(id: number, changes: any): boolean;
/** 删除结算 */
export declare function deleteSettlement(id: number): boolean;
/** 列出所有合同模板 */
export declare function listContractTemplates(): any[] | null;
/** 创建合同模板 */
export declare function createContractTemplate(template: any): boolean;
/** 更新合同模板 */
export declare function updateContractTemplate(id: number, changes: any): boolean;
/** 删除合同模板 */
export declare function deleteContractTemplate(id: number): boolean;
