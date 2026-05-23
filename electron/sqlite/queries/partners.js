/**
 * 合作/监管单位相关 SQLite 查询模块
 *
 * 实现 partners、regions、supervisors 三张表的 CRUD 操作。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// Partners — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var PART_COLUMNS = {
    id: 'id',
    name: 'name',
    category: 'category',
    contact: 'contact',
    phone: 'phone',
    email: 'email',
    address: 'address',
    bankAccount: 'bank_account',
    bankName: 'bank_name',
    taxNumber: 'tax_number',
    creditCode: 'credit_code',
    registeredAddress: 'registered_address',
    businessScope: 'business_scope',
    taxType: 'tax_type',
    licenseFile: 'license_file',
    licenseFileType: 'license_file_type',
    otherFiles: 'other_files',
    otherFilesType: 'other_files_type',
    projectIds: 'project_ids',
    remarks: 'remarks',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var PART_INSERT_COLS = Object.values(PART_COLUMNS).filter(function (c) { return c !== 'id'; });
var PART_INSERT_SQL = "INSERT INTO partners (".concat(PART_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(PART_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Regions — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var REG_COLUMNS = {
    id: 'id',
    province: 'province',
    city: 'city',
    district: 'district',
    createdAt: 'created_at',
};
var REG_INSERT_COLS = Object.values(REG_COLUMNS).filter(function (c) { return c !== 'id'; });
var REG_INSERT_SQL = "INSERT INTO regions (".concat(REG_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(REG_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Supervisors — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var SUP_COLUMNS = {
    id: 'id',
    regionId: 'region_id',
    name: 'name',
    category: 'category',
    contact: 'contact',
    phone: 'phone',
    address: 'address',
    projectIds: 'project_ids',
    remarks: 'remarks',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var SUP_INSERT_COLS = Object.values(SUP_COLUMNS).filter(function (c) { return c !== 'id'; });
var SUP_INSERT_SQL = "INSERT INTO supervisors (".concat(SUP_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(SUP_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 辅助
// ═══════════════════════════════════════════════════════════════════════════════
function toInsertParams(columns, insertCols, obj) {
    return insertCols.map(function (col) {
        var _a;
        var jsonKey = (_a = Object.entries(columns).find(function (_a) {
            var c = _a[1];
            return c === col;
        })) === null || _a === void 0 ? void 0 : _a[0];
        if (!jsonKey)
            return null;
        return toSqliteValue(obj[jsonKey]);
    });
}
function toUpdateSet(columns, changes, excludeKeys) {
    if (excludeKeys === void 0) { excludeKeys = []; }
    var setClauses = [];
    var params = [];
    for (var _i = 0, _a = Object.entries(changes); _i < _a.length; _i++) {
        var _b = _a[_i], jsonKey = _b[0], value = _b[1];
        if (excludeKeys.includes(jsonKey))
            continue;
        var col = columns[jsonKey];
        if (!col)
            continue;
        setClauses.push("\"".concat(col, "\" = ?"));
        params.push(toSqliteValue(value));
    }
    return { sql: setClauses.join(', '), params: params };
}
/** 从 project_ids JSON 数组解析项目名称 */
function resolveProjectNames(projectIdsJson, sqlite) {
    if (!projectIdsJson)
        return '';
    try {
        var ids = JSON.parse(projectIdsJson);
        if (!ids.length)
            return '';
        var names = ids.map(function (id) {
            var row = sqlite.prepare('SELECT name FROM projects WHERE id = ?').get(id);
            return (row === null || row === void 0 ? void 0 : row.name) || '';
        }).filter(Boolean);
        return names.join(', ');
    }
    catch (_a) {
        return '';
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Partners — 操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listPartners() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM partners ORDER BY created_at DESC').all();
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectNames = resolveProjectNames(row.project_ids, sqlite);
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] partners.list error:', err);
        return null;
    }
}
export function createPartner(partner) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(PART_COLUMNS, PART_INSERT_COLS, partner);
        (_a = sqlite.prepare(PART_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] partners.create error:', err);
        return false;
    }
}
export function updatePartner(partner) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(PART_COLUMNS, partner, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(new Date().toISOString());
        setParams.push(partner.id);
        var result = (_a = sqlite.prepare("UPDATE partners SET ".concat(setSql, ", \"updated_at\" = ? WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] partners.update error:', err);
        return false;
    }
}
export function deletePartner(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM partners WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] partners.delete error:', err);
        return false;
    }
}
export function listPartnersByProject(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // project_ids 是 JSON 数组，需要用 LIKE 粗筛 + JS 精筛
        var rows = sqlite.prepare('SELECT * FROM partners').all();
        var filtered = rows.filter(function (row) {
            try {
                var ids = JSON.parse(row.project_ids || '[]');
                return ids.includes(projectId);
            }
            catch (_a) {
                return false;
            }
        });
        return filtered.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectNames = resolveProjectNames(row.project_ids, sqlite);
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] partners.listByProject error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Regions — 操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listRegions() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM regions ORDER BY created_at DESC').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] regions.list error:', err);
        return null;
    }
}
export function createRegion(region) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(REG_COLUMNS, REG_INSERT_COLS, region);
        (_a = sqlite.prepare(REG_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] regions.create error:', err);
        return false;
    }
}
/** 检查地区是否被监管单位引用 */
export function countRegionRefs(regionId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM supervisors WHERE region_id = ?').get(regionId);
        return row.count;
    }
    catch (err) {
        log.error('[SQLite] regions.countRefs error:', err);
        return null;
    }
}
export function deleteRegion(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM regions WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] regions.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Supervisors — 操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listSupervisors() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT s.*,\n        CASE WHEN r.id IS NOT NULL THEN r.province || '-' || r.city || '-' || r.district ELSE '' END as region_name\n      FROM supervisors s\n      LEFT JOIN regions r ON s.region_id = r.id\n      ORDER BY s.created_at DESC\n    ").all();
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.regionName = row.region_name || '';
            camel.projectNames = resolveProjectNames(row.project_ids, sqlite);
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] supervisors.list error:', err);
        return null;
    }
}
export function createSupervisor(supervisor) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(SUP_COLUMNS, SUP_INSERT_COLS, supervisor);
        (_a = sqlite.prepare(SUP_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] supervisors.create error:', err);
        return false;
    }
}
export function updateSupervisor(supervisor) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(SUP_COLUMNS, supervisor, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(new Date().toISOString());
        setParams.push(supervisor.id);
        var result = (_a = sqlite.prepare("UPDATE supervisors SET ".concat(setSql, ", \"updated_at\" = ? WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] supervisors.update error:', err);
        return false;
    }
}
export function deleteSupervisor(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM supervisors WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] supervisors.delete error:', err);
        return false;
    }
}
