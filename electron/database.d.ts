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
    passwordHashVersion?: number;
    roleId: 'admin' | 'manager' | 'accountant' | 'worker';
    status: 'active' | 'disabled';
    displayName: string;
    createdAt: string;
    lastLoginAt: string | null;
    mustChangePassword?: boolean;
    failedLoginAttempts?: number;
    lockedUntil?: string | null;
}
export interface Database {
    projects: any[];
    members: any[];
    tasks: any[];
    materials: any[];
    expenses: any[];
    costLedger: any[];
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
    templates: any[];
    inventoryItems: any[];
    inventoryTransactions: any[];
    invoices: any[];
    paymentRecords: any[];
    users: User[];
    wages: any[];
    attendances: any[];
    projectMembers: any[];
    auditLogs: any[];
    roles: any[];
    workers: any[];
    projectWorkers: any[];
    costLedgerCategories: any[];
    departments: any[];
    salaryHistory: any[];
    wageHistory: any[];
    _migrations?: {
        fileStorageV1?: boolean;
        salaryHistoryBackfillV1?: boolean;
    };
}
export declare let config: AppConfig;
export declare let db: Database;
export declare let dbReady: boolean;
export declare const defaultUserDataPath: string;
export declare const defaultDataPath: string;
export declare function getConfigPath(): string;
export declare function getDbPath(): string;
export declare function getUploadsPath(): string;
export declare function getSnapshotsDir(): string;
export interface SnapshotInfo {
    timestamp: string;
    fileSize: number;
    dbSummary: Record<string, number>;
    label?: string;
}
export declare function getSnapshotIndexPath(): string;
export declare function setMaxSnapshots(n: number): void;
export declare function getMaxSnapshots(): number;
export declare function getSnapshotIndex(): SnapshotInfo[];
export declare function saveSnapshotIndex(index: SnapshotInfo[]): void;
/**
 * 创建快照：在 saveDatabase 覆盖写入前调用
 */
export declare function createSnapshot(label?: string): SnapshotInfo | null;
/**
 * 清理旧快照：保留最近 N 个
 */
export declare function cleanOldSnapshots(): void;
/**
 * 获取快照列表
 */
export declare function listSnapshots(): SnapshotInfo[];
/**
 * 还原到指定时间点的快照
 */
export declare function restoreSnapshot(timestamp: string): boolean;
export declare function loadConfig(): AppConfig;
export declare function saveConfig(cfg: AppConfig): void;
/**
 * 生成密码哈希
 */
export declare function hashPassword(password: string, salt?: string, version?: number): {
    hash: string;
    salt: string;
};
/**
 * 验证密码
 */
export declare function verifyPassword(password: string, hash: string, salt: string, version?: number): boolean;
export declare function saveDatabase(): boolean;
export declare function initializeDatabase(): Database;
export declare function initDatabase(): Promise<void>;
export declare function migrateData(newPath: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function recalculateInvoiceStatus(): void;
