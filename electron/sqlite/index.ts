/**
 * SQLite 模块统一导出
 *
 * 使用方式：
 * import { initSqliteDb, getSqliteDb, migrateFromJson } from './sqlite'
 */

export {
  initSqliteDb,
  getSqliteDb,
  closeSqliteDb,
  isSqliteReady,
  getSqliteDbPath,
  getSqliteSummary,
} from './db-init'

export {
  migrateFromJson,
  isSqliteMigrated,
  markMigrationComplete,
} from './migrate'

export type { MigrationResult } from './migrate'

export {
  useSqliteRead,
  useSqliteWrite,
  tryGetSqlite,
  rowToCamel,
  objToSnake,
  toSqliteValue,
  camelToSnake,
  snakeToCamel,
  getReadMode,
  setReadMode,
  shouldFallbackToJson,
  loadPersistedReadMode,
} from './queries/helpers'

export type { ReadMode } from './queries/helpers'

export { costLedgerQueries, auditQueries, matchRulesQueries, categoryQueries, projectQueries, memberQueries, partnerQueries, contractQueries, invoiceQueries, departmentQueries, materialQueries, inventoryQueries, roleQueries, salaryWageHistoryQueries, settlementQueries, templateDrawingQueries, workerQueries, attendanceQueries, wageQueries, statsQueries } from './queries'
