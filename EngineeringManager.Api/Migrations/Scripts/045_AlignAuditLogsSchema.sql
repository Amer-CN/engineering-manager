-- 045: audit_logs 列名对齐权威 schema（resource_type -> resource）
--
-- 背景：报告中心端到端验证发现 `no such column: resource`。audit_logs 存在两代
--      schema 漂移：权威建表（Program.cs CREATE TABLE IF NOT EXISTS）与全部代码
--      （11 处 INSERT + 2 处统计查询）用 `resource`；但老升级库的表列是
--      `resource_type`（CREATE IF NOT EXISTS 不改老表，且从未有迁移对齐）。
--      后果：老库上审计写入全部静默失败（[Audit] INSERT error）、报告中心生成
--      报错、审计统计查询报错。
--
-- 修法：把老库列名对齐权威 schema（RENAME 保留全部历史数据）。
--   · 新库（resource 已存在，无 resource_type）：RENAME 报 no such column
--     → 由 MigrationRunner 良性错误清单吞掉，无操作（幂等语义）
--   · 老库：列改名，历史数据完整保留

ALTER TABLE audit_logs RENAME COLUMN resource_type TO resource;
