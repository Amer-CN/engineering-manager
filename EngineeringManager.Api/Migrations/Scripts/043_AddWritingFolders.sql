-- 043: 写作中心文件夹（writing_folders）+ 文档挂文件夹（folder_id）
--
-- 背景：写作中心二期 R3 文档文件夹分组，完全参照知识库 knowledge_folders
--       先例（039 迁移、folder_id 外键、软删）。writing_documents（042 建）
--       已有可选 project_id 列，文件夹本身不挂项目（写作中心用不上
--       english_name/project_id/category，比 knowledge 版精简）。
--
-- 语义（幂等、守卫，可在任意库态安全重跑；MigrationRunner 的 ExecuteScriptIdempotent
--   会吞掉 "duplicate column name" / "already exists" 等良性错误）：
--   a. 建 writing_folders 表（软删 deleted_at 列）
--   b. writing_documents 加 folder_id 列（可空：历史文档无文件夹）。
--      SQLite 的 ADD COLUMN 不支持 REFERENCES 约束生效（外键需 PRAGMA 且易踩坑），
--      故只加纯列；文档移出/文件夹软删由应用层显式 UPDATE folder_id=NULL，
--      不依赖 PRAGMA foreign_keys（与 039 决策一致）
--   c. 建索引：folders.deleted_at（软删过滤）+ documents.folder_id（按文件夹查文档）
--
-- 幂等论证：a/c 用 IF NOT EXISTS；b 的 ADD COLUMN 重复跑 → duplicate column name
--   被 MigrationRunner 判为良性错误跳过。

-- a. 文件夹表
CREATE TABLE IF NOT EXISTS writing_folders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT NOT NULL,          -- 与 writing_documents.created_by 一致 TEXT
    deleted_at  TEXT                    -- 软删标记（DELETE 端点只置此列）
);

-- b. 文档表挂文件夹（可空；历史文档无文件夹）
ALTER TABLE writing_documents ADD COLUMN folder_id INTEGER;

-- c. 索引
CREATE INDEX IF NOT EXISTS idx_writing_folders_deleted ON writing_folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_writing_documents_folder ON writing_documents(folder_id);
