-- v1.1.0 P0-4 完整版: admin 手动授权表 project_authorizations
-- 设计: admin 在 UI 上授权某用户能看某项目, 系统记录到这张表.
--   SELECT 过滤时: (created_by=@Uid OR @IsAdmin=1 OR X.project_id IN (SELECT project_id FROM project_authorizations WHERE user_id=@Uid))
--   - admin 看全表 (短路 @IsAdmin=1)
--   - 非 admin: 看自己创建的 + admin 授权过他能看的项目下的全部记录
--
-- 字段:
--   project_id INTEGER  -- 关联 projects.id
--   user_id    TEXT     -- 关联 users.id (JWT uid claim)
--   granted_by TEXT     -- 谁授权的 (通常是 admin)
--   granted_at TEXT     -- 授权时间
--   PRIMARY KEY (project_id, user_id) -- 同一用户同一项目只能授一次
--
-- CREATE TABLE IF NOT EXISTS 是幂等的 (MigrationRunner 已支持)

CREATE TABLE IF NOT EXISTS project_authorizations (
    project_id INTEGER NOT NULL,
    user_id    TEXT    NOT NULL,
    granted_by TEXT,
    granted_at TEXT,
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_auth_user_id ON project_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_project_auth_project_id ON project_authorizations(project_id);
