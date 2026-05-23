/**
 * JSON → SQLite 数据迁移脚本
 *
 * 职责：
 * 1. 读取 engineering.json 的全部数据
 * 2. 在事务中逐表写入 SQLite
 * 3. 行数校验 + 错误处理
 * 4. 迁移完成后标记 _migrations.sqliteMigratedV1
 *
 * 安全措施：
 * - 迁移前自动备份 engineering.json
 * - 整个迁移在一个事务中，失败则全部回滚
 * - 旧 JSON 数据不会被删除，可随时回退
 */
export interface MigrationResult {
    success: boolean;
    migratedTables: number;
    totalRows: number;
    verificationPassed: boolean;
    errors: string[];
    warnings: string[];
    duration: number;
}
/**
 * 从 JSON 数据库迁移到 SQLite
 * @param jsonData 已解析的 engineering.json 对象
 * @param jsonDbPath engineering.json 的文件路径（用于备份）
 */
export declare function migrateFromJson(jsonData: any, jsonDbPath?: string): MigrationResult;
/**
 * 检查是否已完成迁移（通过 schema_version 表标记）
 */
export declare function isSqliteMigrated(): boolean;
/**
 * 标记迁移已完成
 */
export declare function markMigrationComplete(): void;
