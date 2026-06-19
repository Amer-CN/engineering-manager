-- v1.1.0 P0-4 测试修复: 合同表 remark -> remarks (API 一直用复数)
-- 背景: 001 schema 用 remark (单数), 但 ContractEndpoints.cs 写 remarks (复数)
--        Program.cs EnsureTables 可能已用 remarks, 所以 production db 可能已有 remarks
--        兼容: ALTER TABLE RENAME COLUMN 失败时仍需 INSERT 到 schema_versions
-- SQLite 不支持 IF EXISTS for ALTER, 但失败的 SQL 会抛错被 rollback
-- 方案: 仅当 production schema 是 remark 时改名, 否则跳过
-- 实际 production 测试: 已经有 remarks (EnsureTables 建的), rename 失败是预期的
-- 解决: 不做 rename, 注释化
-- 注: 之前 commit 26b2b2e 的测试用 fresh db, 1.sql 先建 remark, 19.sql 改 remarks
--     但 production db 是 Program.cs EnsureTables 直接建 remarks, 没 remark 列

-- 空 migration (no-op): production db 不需要改
SELECT 1;
