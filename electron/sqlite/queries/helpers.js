/**
 * SQLite 查询辅助工具
 *
 * 提供：
 * - camelCase ↔ snake_case 转换
 * - SQLite 就绪状态检查
 * - 读取模式管理（dual / sqlite-primary / json-only）
 * - 行数据标准化
 */
import log from 'electron-log';
import { getSqliteDb, isSqliteReady } from '../db-init';
import { isSqliteMigrated } from '../migrate';
/** 当前读取模式（默认 dual：SQLite 优先 + JSON 回退） */
var currentReadMode = 'dual';
/** 获取当前读取模式 */
export function getReadMode() {
    return currentReadMode;
}
/** 设置读取模式（同时持久化到 app_config 表） */
export function setReadMode(mode) {
    var validModes = ['dual', 'sqlite-primary', 'json-only'];
    if (!validModes.includes(mode)) {
        log.warn("[SQLite] Invalid read mode: ".concat(mode, ", keeping ").concat(currentReadMode));
        return;
    }
    var prev = currentReadMode;
    currentReadMode = mode;
    log.info("[SQLite] Read mode changed: ".concat(prev, " \u2192 ").concat(mode));
    // 持久化到 app_config 表
    try {
        var db = tryGetSqlite();
        if (db) {
            db.prepare("\n        INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, datetime('now'))\n        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at\n      ").run('read_mode', mode);
            log.info("[SQLite] Read mode persisted: ".concat(mode));
        }
    }
    catch (e) {
        log.warn("[SQLite] Failed to persist read mode: ".concat(e));
    }
}
/** 从 app_config 表加载持久化的读取模式（启动时调用） */
export function loadPersistedReadMode() {
    try {
        var db = tryGetSqlite();
        if (!db)
            return;
        var row = db.prepare('SELECT value FROM app_config WHERE key = ?').get('read_mode');
        if (row && ['dual', 'sqlite-primary', 'json-only'].includes(row.value)) {
            var prev = currentReadMode;
            currentReadMode = row.value;
            if (prev !== currentReadMode) {
                log.info("[SQLite] Restored persisted read mode: ".concat(prev, " \u2192 ").concat(currentReadMode));
            }
        }
    }
    catch (e) {
        log.warn("[SQLite] Failed to load persisted read mode: ".concat(e));
    }
}
/**
 * SQLite 读取失败时是否回退到 JSON
 *
 * - 'dual': ✅ 回退（默认，安全）
 * - 'sqlite-primary': ❌ 不回退（严格模式，用于验证 SQLite 数据完整性）
 * - 'json-only': ✅ 始终走 JSON（回退模式）
 */
export function shouldFallbackToJson() {
    return currentReadMode !== 'sqlite-primary';
}
// ═══════════════════════════════════════════════════════════════════════════════
// 就绪状态检查
// ═══════════════════════════════════════════════════════════════════════════════
/** 是否应从 SQLite 读取（已就绪 + 已迁移 + 非json-only模式） */
export function useSqliteRead() {
    if (currentReadMode === 'json-only')
        return false;
    return isSqliteReady() && isSqliteMigrated();
}
/** 是否应双写到 SQLite（已就绪即可，不需要迁移完成） */
export function useSqliteWrite() {
    return isSqliteReady();
}
/** 安全获取 SQLite 实例（已就绪时返回，否则 null） */
export function tryGetSqlite() {
    if (!isSqliteReady())
        return null;
    return getSqliteDb();
}
// ═══════════════════════════════════════════════════════════════════════════════
// 字段名转换
// ═══════════════════════════════════════════════════════════════════════════════
/** camelCase → snake_case */
export function camelToSnake(str) {
    return str.replace(/[A-Z]/g, function (letter) { return "_".concat(letter.toLowerCase()); });
}
/** snake_case → camelCase */
export function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
}
/** 将 SQLite 行（snake_case 键）转为 camelCase 对象 */
export function rowToCamel(row) {
    var result = {};
    for (var _i = 0, _a = Object.entries(row); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        // 处理 JSON TEXT 字段：尝试解析数组/对象
        if (typeof value === 'string') {
            if (value === '[]' || value === '{}') {
                result[snakeToCamel(key)] = value === '[]' ? [] : {};
            }
            else if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                try {
                    result[snakeToCamel(key)] = JSON.parse(value);
                }
                catch (_c) {
                    result[snakeToCamel(key)] = value;
                }
            }
            else {
                result[snakeToCamel(key)] = value;
            }
        }
        else {
            result[snakeToCamel(key)] = value;
        }
    }
    return result;
}
/** 将 camelCase 对象转为 snake_case 键 */
export function objToSnake(obj) {
    var result = {};
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        result[camelToSnake(key)] = value;
    }
    return result;
}
/** 将值转为 SQLite 兼容格式 */
export function toSqliteValue(val) {
    if (val === undefined)
        return null;
    if (val === null)
        return null;
    if (typeof val === 'boolean')
        return val ? 1 : 0;
    if (Array.isArray(val))
        return JSON.stringify(val);
    if (typeof val === 'object')
        return JSON.stringify(val);
    return val;
}
