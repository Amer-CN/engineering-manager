/**
 * 合同管理 SQLite 查询模块
 *
 * 实现 income_contracts、income_records、expense_contracts、expense_records、
 * agreement_contracts 五张表的 CRUD 操作。
 * 采用工厂模式消除三种合同类型的重复代码。
 */
type ContractType = 'income' | 'expense' | 'agreement';
/** 列出合同（含项目名、合作方名、收款/付款金额） */
export declare function listContracts(type: ContractType, projectId?: number): any[] | null;
/** 创建合同 */
export declare function createContract(type: ContractType, contract: any): boolean;
/** 更新合同 */
export declare function updateContract(type: ContractType, contract: any): boolean;
/** 删除合同（含级联删除记录） */
export declare function deleteContract(type: ContractType, id: number): boolean;
/** 列出记录 */
export declare function listRecords(type: 'income' | 'expense', contractId: number): any[] | null;
/** 创建记录 */
export declare function createRecord(type: 'income' | 'expense', record: any): boolean;
/** 删除记录 */
export declare function deleteRecord(type: 'income' | 'expense', id: number): boolean;
export declare function getContractStats(): any | null;
export {};
