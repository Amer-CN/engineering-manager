-- 050：新增 agent 会话删除保留天数偏好 (per-user, 默认 7 天)
-- archived_at 列保留不删（回滚安全）；迁移时同步把已归档会话退回主列表 (另见 049)。

UPDATE [agent_conversations]
   SET [retention_days] = 7
 WHERE [retention_days] IS NULL;
