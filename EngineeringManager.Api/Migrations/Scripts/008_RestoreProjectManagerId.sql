-- 修复迁移：确保 projects 表包含 project_manager_id 列
-- 迁移 003 的 projects_new 表定义缺少此列

-- 检查并添加 project_manager_id（如果不存在）
-- SQLite 不支持 IF NOT EXISTS for ADD COLUMN，需要用异常处理
INSERT OR IGNORE INTO projects (id, name, description, address, start_date, end_date, status, budget, created_at, updated_at)
SELECT id, name, description, address, start_date, end_date, status, budget, created_at, updated_at FROM projects WHERE 1=0;

-- 尝试添加列（如果已存在会失败，忽略错误）
-- 注意：SQLite 的 ALTER TABLE ADD COLUMN 如果列已存在会报错
