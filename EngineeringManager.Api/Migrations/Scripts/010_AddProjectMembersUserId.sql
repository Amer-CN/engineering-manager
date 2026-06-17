-- v1.1.0 P0-4 完整版: project_members 加 user_id TEXT 列（与 member_id INTEGER 共存）
-- 用途：JWT 鉴权时通过 user_id 关联项目，决定 SELECT 是否返回该项目的记录
-- ALTER TABLE ADD COLUMN 是幂等的

ALTER TABLE project_members ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);