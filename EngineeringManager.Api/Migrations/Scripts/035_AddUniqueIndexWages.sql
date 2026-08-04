-- 035: wages 部分唯一索引 —— 支撑 batch-save 的显式 upsert 冲突目标
--
-- ⚠️ 风险提示：若目标库已存在重复的 (project_id, project_worker_id, year_month)
--    且 deleted_at IS NULL 的行，本迁移会失败；MigrationRunner 对失败会
--    rollback 后 rethrow → 应用启动中断（fail-fast，不是记录后继续）。
--    已确认线上库（%APPDATA%\工程管家）与验证库 wages 表均为 0 行，无冲突。
--
-- 部分唯一索引（WHERE deleted_at IS NULL）：
--   · 软删的行不参与冲突 —— 重新保存一条已软删工资时不会 upsert 到已删行
--   · upsert 的 ON CONFLICT(...) WHERE 子句必须与本索引的 WHERE 完全一致
CREATE UNIQUE INDEX IF NOT EXISTS ux_wages_pw_month
ON wages(project_id, project_worker_id, year_month)
WHERE deleted_at IS NULL;
