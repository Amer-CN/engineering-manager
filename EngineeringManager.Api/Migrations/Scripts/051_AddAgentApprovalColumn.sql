-- ============================================================
-- Agent 审批门（approval）：agent_messages 增加可空 approval 列
-- 存完整 ApprovalRequest JSON（含回填后的 resolution）；
-- 对应前端契约 src/types/agent.ts 的 ApprovalRequest / ApprovalResolution。
-- ============================================================

ALTER TABLE agent_messages ADD COLUMN approval TEXT;
