/**
 * 成员相关 SQLite 查询模块
 *
 * 实现 members、worker_teams、worker_transfer_records、project_members 四张表的 CRUD 操作。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// Members — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var MEM_COLUMNS = {
    id: 'id',
    name: 'name',
    phone: 'phone',
    email: 'email',
    memberType: 'member_type',
    role: 'role',
    workerType: 'worker_type',
    idCard: 'id_card',
    idCardFront: 'id_card_front',
    idCardBack: 'id_card_back',
    gender: 'gender',
    ethnicity: 'ethnicity',
    birthDate: 'birth_date',
    idCardAddress: 'id_card_address',
    contractFile: 'contract_file',
    contractFileType: 'contract_file_type',
    baseSalary: 'base_salary',
    socialSecurityPersonal: 'social_security_personal',
    socialSecurityCompany: 'social_security_company',
    housingFund: 'housing_fund',
    housingFundPersonal: 'housing_fund_personal',
    otherAllowances: 'other_allowances',
    companyCoversSocial: 'company_covers_social',
    teamId: 'team_id',
    dailyWage: 'daily_wage',
    entryDate: 'entry_date',
    expectedLeaveDate: 'expected_leave_date',
    actualLeaveDate: 'actual_leave_date',
    wageBankAccount: 'wage_bank_account',
    wageBankName: 'wage_bank_name',
    threeLevelEducation: 'three_level_education',
    safetyTrainingFile: 'safety_training_file',
    healthReportFile: 'health_report_file',
    specialCertificateFile: 'special_certificate_file',
    status: 'status',
    leaveDate: 'leave_date',
    reentryDate: 'reentry_date',
    remarks: 'remarks',
    departmentId: 'department_id',
    position: 'position',
    projectId: 'project_id',
    isTeamLeader: 'is_team_leader',
    createdAt: 'created_at',
};
var MEM_INSERT_COLS = Object.values(MEM_COLUMNS).filter(function (c) { return c !== 'id'; });
var MEM_INSERT_SQL = "INSERT INTO members (".concat(MEM_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(MEM_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var TEAM_COLUMNS = {
    id: 'id',
    name: 'name',
    projectId: 'project_id',
    leaderId: 'leader_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var TEAM_INSERT_COLS = Object.values(TEAM_COLUMNS).filter(function (c) { return c !== 'id'; });
var TEAM_INSERT_SQL = "INSERT INTO worker_teams (".concat(TEAM_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(TEAM_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Worker Transfer Records — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var TRANSFER_COLUMNS = {
    id: 'id',
    workerId: 'worker_id',
    fromTeamId: 'from_team_id',
    toTeamId: 'to_team_id',
    fromProjectId: 'from_project_id',
    toProjectId: 'to_project_id',
    transferDate: 'transfer_date',
    reason: 'reason',
    createdAt: 'created_at',
};
var TRANSFER_INSERT_COLS = Object.values(TRANSFER_COLUMNS).filter(function (c) { return c !== 'id'; });
var TRANSFER_INSERT_SQL = "INSERT INTO worker_transfer_records (".concat(TRANSFER_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(TRANSFER_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// Project Members — 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var PM_COLUMNS = {
    id: 'id',
    projectId: 'project_id',
    memberId: 'member_id',
    joinedAt: 'joined_at',
};
var PM_INSERT_COLS = Object.values(PM_COLUMNS).filter(function (c) { return c !== 'id'; });
var PM_INSERT_SQL = "INSERT INTO project_members (".concat(PM_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(PM_INSERT_COLS.map(function () { return '?'; }).join(', '), ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 辅助：通用 INSERT 参数生成
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
// ═══════════════════════════════════════════════════════════════════════════════
// Members — 读操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listMembers() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] members.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Members — 写操作
// ═══════════════════════════════════════════════════════════════════════════════
export function createMember(member) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(MEM_COLUMNS, MEM_INSERT_COLS, member);
        (_a = sqlite.prepare(MEM_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] members.create error:', err);
        return false;
    }
}
export function updateMember(member) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(MEM_COLUMNS, member, ['id']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(member.id);
        var result = (_a = sqlite.prepare("UPDATE members SET ".concat(setSql, " WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] members.update error:', err);
        return false;
    }
}
export function deleteMember(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM members WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] members.delete error:', err);
        return false;
    }
}
/** 创建薪资历史记录（member create 时的副作用） */
export function createSalaryHistory(entry) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare("\n      INSERT INTO salary_history (member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at)\n      VALUES (?, ?, ?, ?, ?, ?, ?)\n    ").run(entry.memberId, entry.effectiveDate, toSqliteValue(entry.baseSalary), toSqliteValue((_a = entry.subsidy) !== null && _a !== void 0 ? _a : 0), entry.subsidyNote || '', entry.note || '', entry.createdAt || new Date().toISOString());
        return true;
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.create error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 读操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listTeams() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT t.*,\n        p.name as project_name,\n        m.name as leader_name\n      FROM worker_teams t\n      LEFT JOIN projects p ON t.project_id = p.id\n      LEFT JOIN members m ON t.leader_id = m.id\n      ORDER BY t.created_at DESC\n    ").all();
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            camel.projectName = row.project_name || '';
            camel.leaderName = row.leader_name || '';
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] workerTeams.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Worker Teams — 写操作
// ═══════════════════════════════════════════════════════════════════════════════
export function createTeam(team) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(TEAM_COLUMNS, TEAM_INSERT_COLS, team);
        (_a = sqlite.prepare(TEAM_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] workerTeams.create error:', err);
        return false;
    }
}
export function updateTeam(team) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(TEAM_COLUMNS, team, ['id']), setSql = _b.sql, setParams = _b.params;
        // 始终更新 updated_at
        setParams.push(new Date().toISOString());
        setParams.push(team.id);
        var result = (_a = sqlite.prepare("UPDATE worker_teams SET ".concat(setSql, ", \"updated_at\" = ? WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] workerTeams.update error:', err);
        return false;
    }
}
export function deleteTeam(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM worker_teams WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] workerTeams.delete error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Worker Transfer Records — 操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listTransferRecords(workerId) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var sql = 'SELECT * FROM worker_transfer_records';
        var params = [];
        if (workerId) {
            sql += ' WHERE worker_id = ?';
            params.push(workerId);
        }
        sql += ' ORDER BY transfer_date DESC';
        var rows = (_a = sqlite.prepare(sql)).all.apply(_a, params);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] transferRecords.list error:', err);
        return null;
    }
}
export function createTransferRecord(record) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(TRANSFER_COLUMNS, TRANSFER_INSERT_COLS, record);
        (_a = sqlite.prepare(TRANSFER_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] transferRecords.create error:', err);
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Project Members — 操作
// ═══════════════════════════════════════════════════════════════════════════════
export function listProjectMembers(projectId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare("\n      SELECT pm.*, m.name as member_name, m.phone as member_phone, m.role as member_role,\n        m.member_type, m.id_card as member_id_card\n      FROM project_members pm\n      LEFT JOIN members m ON pm.member_id = m.id\n      WHERE pm.project_id = ?\n      ORDER BY pm.joined_at DESC\n    ").all(projectId);
        return rows.map(function (row) {
            var camel = rowToCamel(row);
            // 构建 member 子对象，供前端使用
            camel.member = {
                id: camel.memberId,
                name: row.member_name || '',
                phone: row.member_phone || '',
                role: row.member_role || '',
                memberType: camel.memberType,
                idCard: row.member_id_card || '',
            };
            // 清理冗余字段
            delete camel.member_name;
            delete camel.member_phone;
            delete camel.member_role;
            delete camel.member_id_card;
            return camel;
        });
    }
    catch (err) {
        log.error('[SQLite] projectMembers.list error:', err);
        return null;
    }
}
export function addProjectMember(entry) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var params = toInsertParams(PM_COLUMNS, PM_INSERT_COLS, entry);
        (_a = sqlite.prepare(PM_INSERT_SQL)).run.apply(_a, params);
        return true;
    }
    catch (err) {
        log.error('[SQLite] projectMembers.add error:', err);
        return false;
    }
}
export function updateProjectMember(id, changes) {
    var _a;
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var _b = toUpdateSet(PM_COLUMNS, changes, ['id', 'projectId', 'memberId']), setSql = _b.sql, setParams = _b.params;
        if (!setSql)
            return true;
        setParams.push(id);
        var result = (_a = sqlite.prepare("UPDATE project_members SET ".concat(setSql, " WHERE id = ?"))).run.apply(_a, setParams);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] projectMembers.update error:', err);
        return false;
    }
}
export function removeProjectMember(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare('DELETE FROM project_members WHERE id = ?').run(id);
        return true;
    }
    catch (err) {
        log.error('[SQLite] projectMembers.remove error:', err);
        return false;
    }
}
