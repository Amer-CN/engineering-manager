-- Phase 2.4: 统一审计字段（补充缺失字段）

-- project_members 添加 created_at
ALTER TABLE project_members ADD COLUMN created_at TEXT;
