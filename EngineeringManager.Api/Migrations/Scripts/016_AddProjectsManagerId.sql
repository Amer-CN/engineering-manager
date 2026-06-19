-- v1.1.0 P0-4 测试修复: projects 表加 project_manager_id 列
-- 背景: ProjectEndpoints.cs /api/projects 用 p.project_manager_id JOIN members
--        但 001_InitialSchema.sql + 008_RestoreProjectManagerId.sql 都没真正加这列
--        (008 注释说"尝试添加列 (如果已存在会失败, 忽略错误)" 但没真做)
-- 兼容性: ALTER TABLE ADD COLUMN 幂等 (MigrationRunner 吞 duplicate column name)
ALTER TABLE projects ADD COLUMN project_manager_id INTEGER;
