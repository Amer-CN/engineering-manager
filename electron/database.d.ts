/**
 * 数据库模块
 *
 * 处理数据库初始化、持久化和迁移
 */
export interface AppConfig {
    dataPath: string;
}
export interface User {
    id: string;
    username: string;
    passwordHash: string;
    passwordSalt: string;
    roleId: 'admin' | 'manager' | 'accountant' | 'worker';
    status: 'active' | 'disabled';
    displayName: string;
    createdAt: string;
    lastLoginAt: string | null;
}
export interface Database {
    projects: any[];
    members: any[];
    tasks: any[];
    materials: any[];
    expenses: any[];
    drawings: any[];
    partners: any[];
    regions: any[];
    supervisors: any[];
    incomeContracts: any[];
    incomeRecords: any[];
    expenseContracts: any[];
    expenseRecords: any[];
    agreementContracts: any[];
    workerTeams: any[];
    workerTransferRecords: any[];
    settlements: any[];
    contractTemplates: any[];
    inventoryItems: any[];
    inventoryTransactions: any[];
    invoices: any[];
    paymentRecords: any[];
    users: User[];
}
export declare let config: AppConfig;
export declare let db: Database;
export declare let dbReady: boolean;
export declare const defaultUserDataPath: string;
export declare function getConfigPath(): string;
export declare function getDbPath(): string;
export declare function getUploadsPath(): string;
export declare function loadConfig(): AppConfig;
export declare function saveConfig(cfg: AppConfig): void;
/**
 * 生成密码哈希
 */
export declare function hashPassword(password: string, salt?: string): {
    hash: string;
    salt: string;
};
/**
 * 验证密码
 */
export declare function verifyPassword(password: string, hash: string, salt: string): boolean;
export declare function saveDatabase(): void;
export declare function initializeDatabase(): Database;
export declare function initDatabase(): Promise<void>;
export declare function migrateData(newPath: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function recalculateInvoiceStatus(): void;
