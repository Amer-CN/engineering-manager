/**
 * 薪资历史 + 工人日工资历史 SQLite 查询模块
 *
 * 实现 salary_history + wage_history 两张表的 CRUD 操作。
 * 特点：
 * - salary_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 member.baseSalary
 * - wage_history.save: upsert 模式 + 同步 project_worker.daily_wage
 * - wage_history.getEffective: 查找最晚的不晚于该月的记录，无则回退 project_worker.daily_wage
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史列映射
// ═══════════════════════════════════════════════════════════════════════════════
var SH_COLUMNS = {
    id: 'id',
    memberId: 'member_id',
    effectiveDate: 'effective_date',
    baseSalary: 'base_salary',
    subsidy: 'subsidy',
    subsidyNote: 'subsidy_note',
    note: 'note',
    createdAt: 'created_at',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 薪资历史操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出某成员的薪资历史（按生效日期降序） */
export function listSalaryHistory(memberId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM salary_history WHERE member_id = ? ORDER BY effective_date DESC').all(memberId);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.list error:', err);
        return null;
    }
}
/** 创建薪资历史记录 */
export function createSalaryHistory(record) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        sqlite.prepare("INSERT INTO salary_history (member_id, effective_date, base_salary, subsidy, subsidy_note, note, created_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?)").run(record.memberId, record.effectiveDate, toSqliteValue(record.baseSalary || 0), toSqliteValue(record.subsidy || 0), toSqliteValue(record.subsidyNote || ''), toSqliteValue(record.note || ''), toSqliteValue(record.createdAt || new Date().toISOString()));
        return true;
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.create error:', err);
        return false;
    }
}
/** 删除薪资历史记录 */
export function deleteSalaryHistory(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM salary_history WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.delete error:', err);
        return false;
    }
}
/** 获取某成员在某年月的有效薪资（最晚的、不晚于该月最后一天的记录） */
export function getEffectiveSalary(memberId, yearMonth) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var _a = yearMonth.split('-').map(Number), y = _a[0], m = _a[1];
        var monthEnd = "".concat(yearMonth, "-").concat(String(new Date(y, m, 0).getDate()).padStart(2, '0'));
        var row = sqlite.prepare("SELECT * FROM salary_history\n       WHERE member_id = ? AND effective_date <= ?\n       ORDER BY effective_date DESC LIMIT 1").get(memberId, monthEnd);
        if (row)
            return rowToCamel(row);
        // 无历史记录时回退到 member.baseSalary（由 handler 补充）
        return null;
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.getEffective error:', err);
        return null;
    }
}
/** 检查是否已存在同一成员+日期的记录 */
export function existsSalaryHistory(memberId, effectiveDate) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare('SELECT COUNT(*) as count FROM salary_history WHERE member_id = ? AND effective_date = ?').get(memberId, effectiveDate);
        return row.count > 0;
    }
    catch (err) {
        log.error('[SQLite] salaryHistory.exists error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 工人日工资历史列映射
// ═══════════════════════════════════════════════════════════════════════════════
var WH_COLUMNS = {
    id: 'id',
    projectWorkerId: 'project_worker_id',
    yearMonth: 'year_month',
    dailyWage: 'daily_wage',
    note: 'note',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
// ═══════════════════════════════════════════════════════════════════════════════
// 工人日工资历史操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出某工人日工资历史（按年月降序） */
export function listWageHistory(projectWorkerId) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM wage_history WHERE project_worker_id = ? ORDER BY year_month DESC').all(projectWorkerId);
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] wageHistory.list error:', err);
        return null;
    }
}
/** 保存工资历史记录（upsert 模式：存在则更新，否则插入） */
export function saveWageHistory(record) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var now = new Date().toISOString();
        var existing = sqlite.prepare('SELECT id FROM wage_history WHERE project_worker_id = ? AND year_month = ?').get(record.projectWorkerId, record.yearMonth);
        if (existing) {
            sqlite.prepare("UPDATE wage_history SET daily_wage = ?, note = ?, updated_at = ? WHERE id = ?").run(record.dailyWage, record.note || null, now, existing.id);
        }
        else {
            sqlite.prepare("INSERT INTO wage_history (project_worker_id, year_month, daily_wage, note, created_at, updated_at)\n         VALUES (?, ?, ?, ?, ?, ?)").run(record.projectWorkerId, record.yearMonth, record.dailyWage, record.note || null, now, now);
        }
        // 同步更新 project_worker 的 daily_wage
        sqlite.prepare('UPDATE project_workers SET daily_wage = ?, updated_at = ? WHERE id = ?').run(record.dailyWage, now, record.projectWorkerId);
        return true;
    }
    catch (err) {
        log.error('[SQLite] wageHistory.save error:', err);
        return false;
    }
}
/** 获取指定月份的有效日工资标准 */
export function getEffectiveWage(projectWorkerId, yearMonth) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var row = sqlite.prepare("SELECT * FROM wage_history\n       WHERE project_worker_id = ? AND year_month <= ?\n       ORDER BY year_month DESC LIMIT 1").get(projectWorkerId, yearMonth);
        if (row)
            return rowToCamel(row);
        // 无历史时回退到 project_worker 上的 daily_wage（由 handler 补充）
        return null;
    }
    catch (err) {
        log.error('[SQLite] wageHistory.getEffective error:', err);
        return null;
    }
}
/** 删除工资历史记录 */
export function deleteWageHistory(id) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var result = sqlite.prepare('DELETE FROM wage_history WHERE id = ?').run(id);
        return result.changes > 0;
    }
    catch (err) {
        log.error('[SQLite] wageHistory.delete error:', err);
        return false;
    }
}
