/**
 * 全局工人 + 项目用工关系 SQLite 查询模块
 *
 * 实现 workers + project_workers 两张表的 CRUD 操作。
 * 特点：
 * - workers.getAll: 复杂过滤（search/workerType）+ 富化（projectCount/activeProjectCount）
 * - workers.delete: 级联删除 project_workers，检查 active 状态
 * - workers.getStats/getTeamWages: 聚合查询
 * - projectWorkers.getAll: JOIN enrichment + attendance firstDay 推断
 * - projectWorkers.create/batchCreate: 自动创建 wageHistory 记录
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 工人列映射
// ═══════════════════════════════════════════════════════════════════════════════
var W_COLUMNS = {
    id: 'id',
    name: 'name',
    idCard: 'id_card',
    gender: 'gender',
    birthDate: 'birth_date',
    ethnicity: 'ethnicity',
    phone: 'phone',
    address: 'address',
    bankAccount: 'bank_account',
    bankName: 'bank_name',
    bankLineNo: 'bank_line_no',
    workerType: 'worker_type',
    dailyWage: 'daily_wage',
    createdAt: 'created_at',
};
var W_INSERT_COLS = Object.values(W_COLUMNS).filter(function (c) { return c !== 'id'; });
var W_INSERT_SQL = "INSERT INTO workers (".concat(W_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(W_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 工人读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出工人（可选搜索/工种过滤，富化 projectCount/activeProjectCount） */
export function listWorkers(search, workerType) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = "SELECT w.*,\n      COUNT(pw.id) AS project_count,\n      SUM(CASE WHEN pw.status = 'active' THEN 1 ELSE 0 END) AS active_project_count\n    FROM workers w\n    LEFT JOIN project_workers pw ON pw.worker_id = w.id";
        var params = [];
        var conditions = [];
        if (workerType) {
            // 通过 project_workers 过滤 workerType
            sql += " INNER JOIN project_workers pw2 ON pw2.worker_id = w.id AND pw2.worker_type = ?";
            params.push(workerType);
        }
        if (search) {
            conditions.push('(w.name LIKE ? OR w.id_card LIKE ? OR w.phone LIKE ?)');
            var kw = "%".concat(search, "%");
            params.push(kw, "%".concat(search, "%"), kw);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        sql += ' GROUP BY w.id ORDER BY w.created_at DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectCount = row.project_count || 0;
            camel.activeProjectCount = row.active_project_count || 0;
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] workers.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 工人写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建工人 */
export function createWorker(worker) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = W_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(W_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at')
                return toSqliteValue(worker.createdAt || new Date().toISOString());
            return toSqliteValue(worker[jsonKey]);
        });
        (_a = sqlite.prepare(W_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] workers.create error:', err);
        return false;
    }
}
/** 更新工人 */
export function updateWorker(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = W_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE workers SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] workers.update error:', err);
        return false;
    }
}
/** 删除工人（级联删除 project_workers，需先检查无活跃用工） */
export function deleteWorker(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var doDelete = sqlite.transaction(function () {
            sqlite.prepare('DELETE FROM project_workers WHERE worker_id = ?').run(id);
            sqlite.prepare('DELETE FROM workers WHERE id = ?').run(id);
        });
        doDelete();
        return true;
    }
    catch (err) {
        log.error('[SQLite] workers.delete error:', err);
        return false;
    }
}
/** 检查工人是否有活跃 projectWorker */
export function countActiveProjectWorkers(workerId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare("SELECT COUNT(*) as count FROM project_workers WHERE worker_id = ? AND status = 'active'").get(workerId);
        return row.count;
    }
    catch (err) {
        log.error('[SQLite] workers.countActivePW error:', err);
        return null;
    }
}
/** 检查身份证是否重复 */
export function existsByIdCard(idCard, excludeId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        if (excludeId) {
            var row_1 = sqlite.prepare('SELECT COUNT(*) as count FROM workers WHERE id_card = ? AND id != ?').get(idCard.trim(), excludeId);
            return row_1.count > 0;
        }
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM workers WHERE id_card = ?').get(idCard.trim());
        return row.count > 0;
    }
    catch (err) {
        log.error('[SQLite] workers.existsByIdCard error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系列映射
// ═══════════════════════════════════════════════════════════════════════════════
var PW_COLUMNS = {
    id: 'id',
    workerId: 'worker_id',
    projectId: 'project_id',
    teamId: 'team_id',
    dailyWage: 'daily_wage',
    workerType: 'worker_type',
    entryDate: 'entry_date',
    status: 'status',
    remarks: 'remarks',
    createdAt: 'created_at',
};
var PW_INSERT_COLS = Object.values(PW_COLUMNS).filter(function (c) { return c !== 'id'; });
var PW_INSERT_SQL = "INSERT INTO project_workers (".concat(PW_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(PW_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出某项目的用工关系（富化 worker/team/project 名称） */
export function listProjectWorkers(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT pw.*,\n        w.name AS worker_name,\n        w.id_card AS worker_id_card,\n        w.gender AS worker_gender,\n        w.birth_date AS worker_birth_date,\n        w.phone AS worker_phone,\n        w.ethnicity AS worker_ethnicity,\n        w.address AS worker_address,\n        w.bank_account AS worker_bank_account,\n        w.bank_name AS worker_bank_name,\n        w.bank_line_no AS worker_bank_line_no,\n        w.worker_type AS worker_worker_type,\n        w.daily_wage AS worker_daily_wage,\n        wt.name AS team_name,\n        p.name AS project_name\n      FROM project_workers pw\n      LEFT JOIN workers w ON w.id = pw.worker_id\n      LEFT JOIN worker_teams wt ON wt.id = pw.team_id\n      LEFT JOIN projects p ON p.id = pw.project_id\n      WHERE pw.project_id = ?\n      ORDER BY pw.created_at DESC\n    ").all(projectId);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.workerName = row.worker_name || '';
            camel.workerIdCard = row.worker_id_card || '';
            camel.teamName = row.team_name || '';
            camel.projectName = row.project_name || '';
            // 补充完整的 worker 对象（与 JSON 路径保持一致）
            camel.worker = {
                id: row.worker_id,
                name: row.worker_name || '',
                idCard: row.worker_id_card || '',
                gender: row.worker_gender || '',
                birthDate: row.worker_birth_date || '',
                phone: row.worker_phone || '',
                ethnicity: row.worker_ethnicity || '',
                address: row.worker_address || '',
                bankAccount: row.worker_bank_account || '',
                bankName: row.worker_bank_name || '',
                bankLineNo: row.worker_bank_line_no || '',
                workerType: row.worker_worker_type || '',
                dailyWage: row.worker_daily_wage || 0,
            };
            // 注：attendance firstDay 推断在 handler 层处理（需要访问 attendances 表的 dailyStatus）
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 项目用工关系写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 创建项目用工关系 */
export function createProjectWorker(pw) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = PW_INSERT_COLS.map(function (col) {
            var _a;
            var jsonKey = (_a = Object.entries(PW_COLUMNS).find(function (_a) {
                var c = _a[1];
                return c === col;
            })) === null || _a === void 0 ? void 0 : _a[0];
            if (!jsonKey)
                return null;
            if (col === 'created_at')
                return toSqliteValue(pw.createdAt || new Date().toISOString());
            return toSqliteValue(pw[jsonKey]);
        });
        (_a = sqlite.prepare(PW_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.create error:', err);
        return false;
    }
}
/** 更新项目用工关系 */
export function updateProjectWorker(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var setClauses = [];
        var params = [];
        for (var _i = 0, _b = Object.entries(changes); _i < _b.length; _i++) {
            var _c = _b[_i], jsonKey = _c[0], value = _c[1];
            var col = PW_COLUMNS[jsonKey];
            if (!col || col === 'id')
                continue;
            setClauses.push("\"".concat(col, "\" = ?"));
            params.push(toSqliteValue(value));
        }
        if (setClauses.length === 0)
            return true;
        params.push(id);
        var sql = "UPDATE project_workers SET ".concat(setClauses.join(', '), " WHERE id = ?");
        var result = (_a = sqlite.prepare(sql)).run.apply(_a, params);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.update error:', err);
        return false;
    }
}
/** 删除项目用工关系 */
export function deleteProjectWorker(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM project_workers WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.delete error:', err);
        return false;
    }
}
/** 检查工人是否已在项目中 */
export function existsProjectWorker(workerId, projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM project_workers WHERE worker_id = ? AND project_id = ?').get(workerId, projectId);
        return row.count > 0;
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.exists error:', err);
        return null;
    }
}
/** 批量创建项目用工关系（事务） */
export function batchCreateProjectWorkers(entries) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now_1 = new Date().toISOString();
        var doInsert = sqlite.transaction(function () {
            var stmt = sqlite.prepare(PW_INSERT_SQL);
            var _loop_1 = function (entry) {
                var params = PW_INSERT_COLS.map(function (col) {
                    var _a;
                    var jsonKey = (_a = Object.entries(PW_COLUMNS).find(function (_a) {
                        var c = _a[1];
                        return c === col;
                    })) === null || _a === void 0 ? void 0 : _a[0];
                    if (!jsonKey)
                        return null;
                    if (col === 'created_at')
                        return toSqliteValue(now_1);
                    return toSqliteValue(entry[jsonKey]);
                });
                stmt.run.apply(stmt, params);
            };
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                _loop_1(entry);
            }
        });
        doInsert();
        return true;
    }
    catch (err) {
        log.error('[SQLite] projectWorkers.batchCreate error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 统计操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 工人统计：项目数 + 总收入 + 按项目拆分 */
export function getWorkerStats(workerId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // 该工人的所有 project_worker
        var pwRows = sqlite.prepare('SELECT id, project_id FROM project_workers WHERE worker_id = ?').all(workerId);
        if (pwRows.length === 0) {
            return { projectCount: 0, totalEarnings: 0, projectBreakdown: [] };
        }
        var pwIds = pwRows.map(function (r) { return r.id; });
        var placeholders = pwIds.map(function () { return '?'; }).join(',');
        // 总收入
        var totalRow = (_a = sqlite.prepare("SELECT COALESCE(SUM(actual_wage), 0) AS total FROM wages WHERE project_worker_id IN (".concat(placeholders, ")"))).get.apply(_a, pwIds);
        // 按项目分组
        var breakdownRows = sqlite.prepare("\n      SELECT pw.project_id, p.name AS project_name, COALESCE(SUM(w.actual_wage), 0) AS total\n      FROM project_workers pw\n      LEFT JOIN wages w ON w.project_worker_id = pw.id\n      LEFT JOIN projects p ON p.id = pw.project_id\n      WHERE pw.worker_id = ?\n      GROUP BY pw.project_id\n      ORDER BY total DESC\n    ").all(workerId);
        return {
            projectCount: pwRows.length,
            totalEarnings: Math.round((totalRow.total || 0) * 100) / 100,
            projectBreakdown: breakdownRows.map(function (r) { return ({
                projectId: r.project_id,
                projectName: r.project_name || '未知项目',
                total: Math.round((r.total || 0) * 100) / 100,
            }); }),
        };
    }
    catch (err) {
        log.error('[SQLite] workers.getStats error:', err);
        return null;
    }
}
/** 按班组汇总工资 */
export function getTeamWages(projectId, teamId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        // 班组名
        var teamRow = sqlite.prepare('SELECT name FROM worker_teams WHERE id = ?').get(teamId);
        var teamName = (teamRow === null || teamRow === void 0 ? void 0 : teamRow.name) || '未知班组';
        // 该班组在该项目的所有 project_worker
        var pwRows = sqlite.prepare("SELECT pw.id, pw.worker_id, pw.daily_wage, w.name AS worker_name, w.daily_wage AS worker_daily_wage FROM project_workers pw LEFT JOIN workers w ON w.id = pw.worker_id WHERE pw.project_id = ? AND pw.team_id = ?").all(projectId, teamId);
        var details = [];
        var teamTotal = 0;
        for (var _i = 0, pwRows_1 = pwRows; _i < pwRows_1.length; _i++) {
            var pw = pwRows_1[_i];
            // 去重查询：每个 projectWorkerId + yearMonth 只保留最新
            var wageRows = sqlite.prepare("\n        SELECT w.work_days, w.actual_wage, w.daily_wage\n        FROM wages w\n        INNER JOIN (\n          SELECT project_worker_id, year_month, MAX(updated_at) AS max_updated\n          FROM wages\n          WHERE project_worker_id = ?\n          GROUP BY project_worker_id, year_month\n        ) latest ON w.project_worker_id = latest.project_worker_id\n          AND w.year_month = latest.year_month\n          AND w.updated_at = latest.max_updated\n        WHERE w.project_worker_id = ?\n      ").all(pw.id, pw.id);
            var totalWage = wageRows.reduce(function (sum, r) { return sum + (r.actual_wage || 0); }, 0);
            var totalWorkDays = wageRows.reduce(function (sum, r) { return sum + (r.work_days || 0); }, 0);
            teamTotal += totalWage;
            details.push({
                workerName: pw.worker_name || '未知',
                months: wageRows.length,
                workDays: totalWorkDays,
                dailyWage: pw.daily_wage || pw.worker_daily_wage || 0,
                totalWage: Math.round(totalWage * 100) / 100,
            });
        }
        return {
            teamId: teamId,
            teamName: teamName,
            workerCount: pwRows.length,
            teamTotal: Math.round(teamTotal * 100) / 100,
            details: details,
        };
    }
    catch (err) {
        log.error('[SQLite] workers.getTeamWages error:', err);
        return null;
    }
}
