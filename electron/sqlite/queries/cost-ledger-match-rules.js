/**
 * 成本台账匹配规则 SQLite 查询模块
 *
 * 实现 cost_ledger_match_rules 表的 CRUD 操作。
 * 特点：save 为全量覆盖模式。
 */
import log from 'electron-log';
import { tryGetSqlite, rowToCamel, toSqliteValue } from './helpers';
// ═══════════════════════════════════════════════════════════════════════════════
// 列映射
// ═══════════════════════════════════════════════════════════════════════════════
var MR_COLUMNS = {
    id: 'id',
    keyword: 'keyword',
    category: 'category',
    direction: 'direction',
    hitCount: 'hit_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};
var MR_INSERT_COLS = Object.values(MR_COLUMNS).filter(function (c) { return c !== 'id'; });
var MR_INSERT_PLACEHOLDERS = MR_INSERT_COLS.map(function () { return '?'; }).join(', ');
var MR_INSERT_SQL = "INSERT INTO cost_ledger_match_rules (".concat(MR_INSERT_COLS.map(function (c) { return "\"".concat(c, "\""); }).join(', '), ") VALUES (").concat(MR_INSERT_PLACEHOLDERS, ")");
// ═══════════════════════════════════════════════════════════════════════════════
// 读操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 列出所有匹配规则 */
export function listRules() {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return null;
    try {
        var rows = sqlite.prepare('SELECT * FROM cost_ledger_match_rules ORDER BY id ASC').all();
        return rows.map(rowToCamel);
    }
    catch (err) {
        log.error('[SQLite] matchRules.list error:', err);
        return null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// 写操作
// ═══════════════════════════════════════════════════════════════════════════════
/** 全量覆盖保存匹配规则（事务：DELETE ALL + INSERT） */
export function saveRules(rules) {
    var sqlite = tryGetSqlite();
    if (!sqlite)
        return false;
    try {
        var doSave = sqlite.transaction(function () {
            sqlite.prepare('DELETE FROM cost_ledger_match_rules').run();
            var stmt = sqlite.prepare(MR_INSERT_SQL);
            var _loop_1 = function (rule) {
                var params = MR_INSERT_COLS.map(function (col) {
                    var _a;
                    var jsonKey = (_a = Object.entries(MR_COLUMNS).find(function (_a) {
                        var c = _a[1];
                        return c === col;
                    })) === null || _a === void 0 ? void 0 : _a[0];
                    if (!jsonKey)
                        return null;
                    return toSqliteValue(rule[jsonKey]);
                });
                stmt.run.apply(stmt, params);
            };
            for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                var rule = rules_1[_i];
                _loop_1(rule);
            }
        });
        doSave();
        return true;
    }
    catch (err) {
        log.error('[SQLite] matchRules.save error:', err);
        return false;
    }
}
