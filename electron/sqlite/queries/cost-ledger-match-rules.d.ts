/**
 * 成本台账匹配规则 SQLite 查询模块
 *
 * 实现 cost_ledger_match_rules 表的 CRUD 操作。
 * 特点：save 为全量覆盖模式。
 */
/** 列出所有匹配规则 */
export declare function listRules(): any[] | null;
/** 全量覆盖保存匹配规则（事务：DELETE ALL + INSERT） */
export declare function saveRules(rules: any[]): boolean;
