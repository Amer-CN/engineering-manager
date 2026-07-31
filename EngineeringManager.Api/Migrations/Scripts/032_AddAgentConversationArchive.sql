-- ============================================================
-- 里程碑1: AI 助手会话归档
--
-- 给 agent_conversations 增 archived_at TEXT NULL —— 归档语义与软删除
-- deleted_at 严格分离：
--   - archived_at 非空 = 已归档（从"进行中"列表收起但仍可见/可恢复，不算删除）
--   - deleted_at   非空 = 软删除（默认列表不返回，进"最近删除"可恢复）
-- 两列互不影响，归档 ≠ 删除。
--
-- 幂等性：MigrationRunner.ExecuteScriptIdempotent 会逐条执行并吞掉
-- "duplicate column name" 良性错误，故对已含该列的历史库反复执行安全；
-- 索引使用 IF NOT EXISTS 天然幂等。与 027 建表、004 软删除列不冲突。
-- ============================================================

-- 1. 归档时间列（NULL = 未归档）
ALTER TABLE agent_conversations ADD COLUMN archived_at TEXT;

-- 2. 覆盖"某用户 + 未删除 + 归档态"过滤/分组的复合索引
CREATE INDEX IF NOT EXISTS idx_agent_conv_user_archived
ON agent_conversations(user_id, deleted_at, archived_at);
