/**
 * SQLite 数据库初始化模块
 *
 * 职责：
 * 1. 创建/打开 SQLite 数据库
 * 2. 启用 WAL 模式 + 外键约束
 * 3. 创建所有表（IF NOT EXISTS）和索引
 * 4. 版本管理（schema_version 表）
 */
import Database from 'better-sqlite3';
/**
 * 初始化 SQLite 数据库
 * @param dataPath 数据目录路径（与 JSON 数据库相同的目录）
 * @returns Database 实例
 */
export declare function initSqliteDb(dataPath: string): Database.Database;
/**
 * 获取 SQLite 数据库实例
 * @throws 如果数据库未初始化
 */
export declare function getSqliteDb(): Database.Database;
/**
 * 关闭 SQLite 数据库
 */
export declare function closeSqliteDb(): void;
/**
 * 检查 SQLite 数据库是否已初始化
 */
export declare function isSqliteReady(): boolean;
/**
 * 获取数据库文件路径
 */
export declare function getSqliteDbPath(): string | null;
/**
 * 获取各表行数统计
 */
export declare function getSqliteSummary(): Record<string, number>;
